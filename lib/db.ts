import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TMP_DIR  = '/tmp/orcamento-data';

export const SHEET_HEADERS: Record<string, string[]> = {
  INSUMOS: ['id', 'codigo', 'descricao', 'unidade', 'preco', 'tipo', 'categoria', 'status', 'data_alteracao'],
  COMPOSICOES: ['id', 'codigo', 'descricao', 'unidade_producao', 'producao', 'descricao_tecnica', 'status', 'data_alteracao', 'etapa_codigo', 'categoria'],
  ITENS_COMPOSICAO: ['id', 'composicao_id', 'insumo_id', 'coeficiente', 'unidade'],
  ORCAMENTOS: ['id', 'titulo', 'descricao', 'area_construida', 'data_criacao', 'data_atualizacao', 'status', 'bdi_percentual'],
  ITENS_ORCAMENTO: [
    'id', 'orcamento_id', 'etapa_codigo', 'sub_etapa', 'composicao_id',
    'descricao_override', 'unidade_override', 'custo_unitario_override',
    'quantidade', 'quantidade_tipo', 'ordem', 'qtd_overrides',
  ],
  CONFIG: ['chave', 'valor'],
  OBRAS: ['id','nome','endereco','bairro','cidade','estado','cep','status','data_inicio','data_prev_termino','area_construida','foto_url','responsavel','telefone_responsavel','orcamento_id','observacoes','data_criacao','data_atualizacao'],
  FORNECEDORES: ['id','obra_id','nome','especialidade','telefone','whatsapp','email','observacoes','status'],
  ETAPAS_OBRA: ['id','obra_id','orcamento_id','etapa_codigo','etapa_nome','status_execucao','data_inicio','data_fim_prevista','data_fim_real','ordem'],
  SERVICOS_ETAPA: ['id','etapa_obra_id','obra_id','etapa_codigo','composicao_codigo','servico_nome','unidade','quantidade','status_compra','fornecedor_id','observacao'],
};

// ─── Detecção de ambiente ─────────────────────────────────────────────────────

/** Vercel Blob — só usa em produção (VERCEL=1). Localmente usa arquivos diretos. */
const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL === '1');

/** Vercel KV legacy */
const USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/** Rodando no Vercel */
const IS_VERCEL = process.env.VERCEL === '1';

// ─── Filesystem local (dev) ───────────────────────────────────────────────────

function fp(sheetName: string) { return path.join(DATA_DIR, `${sheetName}.json`); }

function ensureLocalDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLocalFile(sheetName: string): Record<string, string>[] {
  ensureLocalDir();
  const file = fp(sheetName);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}

function writeLocalFile(sheetName: string, rows: Record<string, string>[]): void {
  ensureLocalDir();
  fs.writeFileSync(fp(sheetName), JSON.stringify(rows, null, 2), 'utf-8');
}

// ─── /tmp storage (Vercel sem Blob/KV) ───────────────────────────────────────

function ensureTmpDir() {
  try { if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true }); } catch { /**/ }
}

function tmpPath(sheetName: string) { return path.join(TMP_DIR, `${sheetName}.json`); }

function readTmpFile(sheetName: string): Record<string, string>[] {
  ensureTmpDir();
  const tmp = tmpPath(sheetName);
  if (fs.existsSync(tmp)) {
    try { return JSON.parse(fs.readFileSync(tmp, 'utf-8')); } catch { /**/ }
  }
  const bundled = fp(sheetName);
  if (fs.existsSync(bundled)) {
    const data = JSON.parse(fs.readFileSync(bundled, 'utf-8'));
    try { fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); } catch { /**/ }
    return data;
  }
  return [];
}

function writeTmpFile(sheetName: string, rows: Record<string, string>[]): void {
  ensureTmpDir();
  fs.writeFileSync(tmpPath(sheetName), JSON.stringify(rows, null, 2));
}

// ─── Vercel Blob (produção com persistência real) ─────────────────────────────
// Cada "sheet" é um arquivo JSON no Blob: data/<SHEET>.json
// Cache em /tmp para evitar múltiplas leituras na mesma invocação.

const BLOB_BASE = 'data';

/** Extrai o store ID do token Vercel Blob (formato: vercel_blob_rw_STOREID_xxxx) */
function blobStoreUrl(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const parts = token.split('_');
  // vercel(0) blob(1) rw(2) STOREID(3) hash(4)
  const storeId = parts[3];
  if (!storeId) return null;
  return `https://${storeId.toLowerCase()}.private.blob.vercel-storage.com`;
}

async function blobRead(sheetName: string): Promise<Record<string, string>[]> {
  // Cache /tmp curto (5s) — apenas para múltiplas leituras na mesma invocação
  const tmp = tmpPath(sheetName);
  if (fs.existsSync(tmp)) {
    try {
      const stat = fs.statSync(tmp);
      if (Date.now() - stat.mtimeMs < 5_000) {
        return JSON.parse(fs.readFileSync(tmp, 'utf-8'));
      }
    } catch { /**/ }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const blobPath = `${BLOB_BASE}/${sheetName}.json`;

  try {
    // URL direta — sem list() que pode retornar downloadUrl expirada
    const baseUrl = blobStoreUrl();
    if (baseUrl) {
      const res = await fetch(`${baseUrl}/${blobPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as Record<string, string>[];
        try { ensureTmpDir(); fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); } catch { /**/ }
        return data;
      }
      if (res.status !== 404) {
        console.error('[blob] read HTTP', res.status, sheetName);
      }
    }

    // Blob não existe (404) → seed dos arquivos bundled e salva no Blob
    const seed = readLocalFile(sheetName);
    if (seed.length > 0) await blobWrite(sheetName, seed);
    return seed;
  } catch (err) {
    console.error('[blob] read error', sheetName, err);
    return readTmpFile(sheetName);
  }
}

async function blobWrite(sheetName: string, rows: Record<string, string>[]): Promise<void> {
  try {
    const { put } = await import('@vercel/blob');
    const content = JSON.stringify(rows, null, 2);
    await put(`${BLOB_BASE}/${sheetName}.json`, content, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    // Invalida cache /tmp
    try { const tmp = tmpPath(sheetName); if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch { /**/ }
  } catch (err) {
    console.error('[blob] write error', sheetName, err);
    writeTmpFile(sheetName, rows);
  }
}

// ─── Vercel KV legacy ─────────────────────────────────────────────────────────

async function kvRead(sheetName: string): Promise<Record<string, string>[]> {
  try {
    const { kv } = await import('@vercel/kv');
    const data = await kv.get<Record<string, string>[]>(`sheet:${sheetName}`);
    if (data !== null) return data;
    const seed = readLocalFile(sheetName);
    if (seed.length > 0) await kv.set(`sheet:${sheetName}`, seed);
    return seed;
  } catch {
    return readTmpFile(sheetName);
  }
}

async function kvWrite(sheetName: string, rows: Record<string, string>[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(`sheet:${sheetName}`, rows);
  } catch {
    writeTmpFile(sheetName, rows);
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  if (USE_BLOB)    return blobRead(sheetName);
  if (USE_KV)      return kvRead(sheetName);
  if (IS_VERCEL)   return readTmpFile(sheetName);
  return readLocalFile(sheetName);
}

export async function writeFile(sheetName: string, rows: Record<string, string>[]): Promise<void> {
  if (USE_BLOB)    { await blobWrite(sheetName, rows); return; }
  if (USE_KV)      { await kvWrite(sheetName, rows); return; }
  if (IS_VERCEL)   { writeTmpFile(sheetName, rows); return; }
  writeLocalFile(sheetName, rows);
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
  if (!IS_VERCEL && !USE_KV && !USE_BLOB) {
    ensureLocalDir();
    for (const name of Object.keys(SHEET_HEADERS)) {
      if (!fs.existsSync(fp(name))) {
        writeLocalFile(name, []);
        criadas.push(name);
      }
    }
  }
  return { criadas };
}
