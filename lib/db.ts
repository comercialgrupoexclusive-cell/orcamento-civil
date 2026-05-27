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
    'quantidade', 'quantidade_tipo', 'ordem',
  ],
  CONFIG: ['chave', 'valor'],
};

function fp(sheetName: string): string {
  return path.join(DATA_DIR, `${sheetName}.json`);
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile(sheetName: string): Record<string, string>[] {
  ensureDir();
  const file = fp(sheetName);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}

function writeFile(sheetName: string, rows: Record<string, string>[]): void {
  ensureDir();
  fs.writeFileSync(fp(sheetName), JSON.stringify(rows, null, 2), 'utf-8');
}

export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  return readFile(sheetName);
}

export async function appendRow(sheetName: string, data: Record<string, unknown>): Promise<void> {
  const rows = readFile(sheetName);
  const headers = SHEET_HEADERS[sheetName] || Object.keys(data);
  const row: Record<string, string> = {};
  headers.forEach(h => { row[h] = String(data[h] ?? ''); });
  rows.push(row);
  writeFile(sheetName, rows);
}

export async function updateRowById(
  sheetName: string,
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const rows = readFile(sheetName);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  const patch: Record<string, string> = {};
  Object.entries(data).forEach(([k, v]) => { patch[k] = String(v ?? ''); });
  rows[idx] = { ...rows[idx], ...patch };
  writeFile(sheetName, rows);
  return true;
}

export async function deleteRowById(sheetName: string, id: string): Promise<boolean> {
  const rows = readFile(sheetName);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  writeFile(sheetName, rows);
  return true;
}

export async function initSheets(): Promise<{ criadas: string[] }> {
  ensureDir();
  const criadas: string[] = [];
  for (const name of Object.keys(SHEET_HEADERS)) {
    const file = fp(name);
    if (!fs.existsSync(file)) {
      writeFile(name, []);
      criadas.push(name);
    }
  }
  return { criadas };
}
