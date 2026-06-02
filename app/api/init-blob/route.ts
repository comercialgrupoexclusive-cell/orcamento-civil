/**
 * /api/init-blob  — Popula o Vercel Blob com os dados do bundle.
 * Chamar UMA VEZ após o primeiro deploy com Blob configurado.
 * Protegido por INIT_SECRET (env var opcional; se não definido, aceita qualquer chamada).
 */
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DATA_DIR = path.join(process.cwd(), 'data');

function readBundled(name: string): Record<string, string>[] {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}

export async function POST(req: NextRequest) {
  const secret = process.env.INIT_SECRET;
  if (secret) {
    const { secret: provided } = await req.json().catch(() => ({})) as { secret?: string };
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN não configurado' }, { status: 500 });
  }

  const sheets = ['INSUMOS', 'COMPOSICOES', 'ITENS_COMPOSICAO', 'ORCAMENTOS', 'ITENS_ORCAMENTO'];
  const results: Record<string, number> = {};

  for (const sheet of sheets) {
    const data = readBundled(sheet);
    await writeFile(sheet, data);
    results[sheet] = data.length;
  }

  return NextResponse.json({
    ok: true,
    message: 'Blob inicializado com dados do bundle',
    records: results,
  });
}

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ blob: false, message: 'BLOB_READ_WRITE_TOKEN ausente' });
  }
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'data/', limit: 10 });
    return NextResponse.json({
      blob: true,
      files: blobs.map(b => ({ name: b.pathname, size: b.size, updated: b.uploadedAt })),
    });
  } catch (err) {
    return NextResponse.json({ blob: false, error: String(err) }, { status: 500 });
  }
}
