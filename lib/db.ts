import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export const SHEET_HEADERS: Record<string, string[]> = {
  INSUMOS: ['id', 'codigo', 'descricao', 'unidade', 'preco', 'tipo', 'categoria', 'status', 'data_alteracao'],
  COMPOSICOES: ['id', 'codigo', 'descricao', 'unidade_producao', 'producao', 'descricao_tecnica', 'status', 'data_alteracao'],
  ITENS_COMPOSICAO: ['id', 'composicao_id', 'insumo_id', 'coeficiente', 'unidade'],
  ORCAMENTOS: ['id', 'titulo', 'descricao', 'data_criacao', 'data_atualizacao', 'status', 'bdi_percentual'],
  ITENS_ORCAMENTO: [
    'id', 'orcamento_id', 'etapa_codigo', 'sub_etapa', 'composicao_id',
    'descricao_override', 'unidade_override', 'custo_unitario_override',
    'quantidade', 'quantidade_tipo', 'ordem', 'qtd_overrides',
  ],
  CONFIG: ['chave', 'valor'],
};

// ─── Detectar ambiente ────────────────────────────────────────────────────────

/** True quando rodando no Vercel (serverless) com KV configurado */
const USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// ─── Operações locais (filesystem) ───────────────────────────────────────────

function fp(sheetName: string): string {
  return path.join(DATA_DIR, `${sheetName}.json`);
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLocalFile(sheetName: string): Record<string, string>[] {
  ensureDir();
  const file = fp(sheetName);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}

function writeLocalFile(sheetName: string, rows: Record<string, string>[]): void {
  ensureDir();
  fs.writeFileSync(fp(sheetName), JSON.stringify(rows, null, 2), 'utf-8');
}

// ─── Operações Vercel KV ──────────────────────────────────────────────────────

async function kvRead(sheetName: string): Promise<Record<string, string>[]> {
  try {
    const { kv } = await import('@vercel/kv');
    const data = await kv.get<Record<string, string>[]>(`sheet:${sheetName}`);
    if (data !== null) return data;
    // KV vazio → retorna lista vazia (usuário deve restaurar backup)
    return [];
  } catch {
    // fallback para filesystem se KV falhar
    return readLocalFile(sheetName);
  }
}

async function kvWrite(sheetName: string, rows: Record<string, string>[]): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(`sheet:${sheetName}`, rows);
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  return USE_KV ? kvRead(sheetName) : readLocalFile(sheetName);
}

/** Escreve/sobrescreve uma tabela inteira (usado pelo backup/restore) */
export async function writeFile(sheetName: string, rows: Record<string, string>[]): Promise<void> {
  if (USE_KV) {
    await kvWrite(sheetName, rows);
  } else {
    writeLocalFile(sheetName, rows);
  }
}

export async function appendRow(sheetName: string, data: Record<string, unknown>): Promise<void> {
  const rows = await readSheet(sheetName);
  const headers = SHEET_HEADERS[sheetName] || Object.keys(data);
  const row: Record<string, string> = {};
  headers.forEach(h => { row[h] = String(data[h] ?? ''); });
  rows.push(row);
  await writeFile(sheetName, rows);
}

export async function updateRowById(
  sheetName: string,
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const rows = await readSheet(sheetName);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  const patch: Record<string, string> = {};
  Object.entries(data).forEach(([k, v]) => { patch[k] = String(v ?? ''); });
  rows[idx] = { ...rows[idx], ...patch };
  await writeFile(sheetName, rows);
  return true;
}

export async function deleteRowById(sheetName: string, id: string): Promise<boolean> {
  const rows = await readSheet(sheetName);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  await writeFile(sheetName, rows);
  return true;
}

export async function initSheets(): Promise<{ criadas: string[] }> {
  const criadas: string[] = [];
  if (!USE_KV) {
    ensureDir();
    for (const name of Object.keys(SHEET_HEADERS)) {
      const file = fp(name);
      if (!fs.existsSync(file)) {
        writeLocalFile(name, []);
        criadas.push(name);
      }
    }
  }
  return { criadas };
}
