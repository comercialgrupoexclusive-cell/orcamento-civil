import { NextRequest, NextResponse } from 'next/server';
import { updateRowById, deleteRowById } from '@/lib/db';
import { validarCoeficiente, coletarErros } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await req.json();

    const erros = coletarErros([validarCoeficiente(body.coeficiente)]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const updates: Record<string, unknown> = {
      coeficiente: Number(body.coeficiente),
      unidade: String(body.unidade || '').trim(),
    };
    // Permite trocar o insumo vinculado
    if (body.insumo_id) updates.insumo_id = String(body.insumo_id);

    const ok = await updateRowById('ITENS_COMPOSICAO', itemId, updates);
    if (!ok) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

    return NextResponse.json({ id: itemId, ...updates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const ok = await deleteRowById('ITENS_COMPOSICAO', itemId);
    if (!ok) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
