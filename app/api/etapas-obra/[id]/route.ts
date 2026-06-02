import { NextRequest, NextResponse } from 'next/server';
import { updateRowById, deleteRowById } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const ok = await updateRowById('ETAPAS_OBRA', id, body);
  if (!ok) return NextResponse.json({ error: 'Etapa nao encontrada' }, { status: 404 });
  return NextResponse.json({ id, ...body });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteRowById('ETAPAS_OBRA', id);
  if (!ok) return NextResponse.json({ error: 'Etapa nao encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
