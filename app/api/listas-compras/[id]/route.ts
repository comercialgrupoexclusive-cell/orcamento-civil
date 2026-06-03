import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile, deleteRowById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listas, itens] = await Promise.all([readSheet('LISTAS_COMPRAS'), readSheet('ITENS_LISTA')]);
  const lista = listas.find(l => l.id === id);
  if (!lista) return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
  return NextResponse.json({ ...lista, itens: itens.filter(i => i.lista_id === id) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const listas = await readSheet('LISTAS_COMPRAS');
  const idx = listas.findIndex(l => l.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
  const patch: Record<string, string> = {};
  ['nome','data_prevista','status','observacao','fornecedor_id'].forEach(k => { if (body[k] !== undefined) patch[k] = String(body[k]); });
  listas[idx] = { ...listas[idx], ...patch };
  await writeFile('LISTAS_COMPRAS', listas);
  return NextResponse.json(listas[idx]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Remove lista e seus itens
  const itens = await readSheet('ITENS_LISTA');
  await Promise.all([
    deleteRowById('LISTAS_COMPRAS', id),
    writeFile('ITENS_LISTA', itens.filter(i => i.lista_id !== id)),
  ]);
  return NextResponse.json({ ok: true });
}
