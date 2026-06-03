import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itens = await readSheet('ITENS_LISTA');
  return NextResponse.json(itens.filter(i => i.lista_id === id));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lista_id } = await params;
  const body = await req.json(); // { item_id, status_item }
  const itens = await readSheet('ITENS_LISTA');
  const idx = itens.findIndex(i => i.id === body.item_id && i.lista_id === lista_id);
  if (idx === -1) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
  itens[idx] = { ...itens[idx], status_item: String(body.status_item || 'aguardando') };
  await writeFile('ITENS_LISTA', itens);
  return NextResponse.json(itens[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lista_id } = await params;
  const { searchParams } = new URL(req.url);
  const item_id = searchParams.get('item_id');
  const itens = await readSheet('ITENS_LISTA');
  const filtrado = item_id
    ? itens.filter(i => !(i.lista_id === lista_id && i.id === item_id))
    : itens.filter(i => i.lista_id !== lista_id);
  await writeFile('ITENS_LISTA', filtrado);
  return NextResponse.json({ ok: true });
}
