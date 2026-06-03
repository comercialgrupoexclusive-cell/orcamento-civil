import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Diagnóstico read-only do storage ativo. */
export async function GET() {
  const flags = {
    has_blob_token: !!process.env.BLOB_READ_WRITE_TOKEN,
    has_kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    is_vercel: process.env.VERCEL === '1',
  };
  const mode = (flags.has_blob_token && flags.is_vercel) ? 'BLOB'
    : flags.has_kv ? 'KV'
    : flags.is_vercel ? 'TMP_EFEMERO'
    : 'LOCAL_FILES';

  const T = ['INSUMOS', 'COMPOSICOES', 'ITENS_COMPOSICAO', 'ORCAMENTOS', 'ITENS_ORCAMENTO'];
  const counts: Record<string, number> = {};
  for (const t of T) {
    try { counts[t] = (await readSheet(t)).length; } catch { counts[t] = -1; }
  }

  return NextResponse.json({ mode, flags, counts, ts: new Date().toISOString() });
}
