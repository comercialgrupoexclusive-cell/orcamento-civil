import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: lista_id, itemId } = await params;
  const body = await req.json();
  const itens = await readSheet('ITENS_LISTA');
  const idx = itens.findIndex(i => i.id === itemId && i.lista_id === lista_id);
  if (idx === -1) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
  const patch: Record<string, string> = {};
  ['status_item', 'fornecedor_id', 'qtd_necessaria'].forEach(k => {
    if (body[k] !== undefined) patch[k] = String(body[k]);
  });
  itens[idx] = { ...itens[idx], ...patch };
  await writeFile('ITENS_LISTA', itens);
  return NextResponse.json(itens[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: lista_id, itemId } = await params;
  const itens = await readSheet('ITENS_LISTA');
  await writeFile('ITENS_LISTA', itens.filter(i => !(i.lista_id === lista_id && i.id === itemId)));
  return NextResponse.json({ ok: true });
}
