import { NextRequest, NextResponse } from 'next/server';
import { updateRowById, deleteRowById } from '@/lib/db';
import { validarQuantidade, coletarErros } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await req.json();

    const erros = coletarErros([validarQuantidade(body.quantidade ?? 0)]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const updates: Record<string, unknown> = {
      quantidade: Number(body.quantidade) || 0,
      quantidade_tipo: 'MANUAL',
    };

    if (body.descricao_override !== undefined)
      updates.descricao_override = String(body.descricao_override).trim();
    if (body.unidade_override !== undefined)
      updates.unidade_override = String(body.unidade_override).trim();
    if (body.custo_unitario_override !== undefined)
      updates.custo_unitario_override = Number(body.custo_unitario_override) || 0;
    if (body.sub_etapa !== undefined)
      updates.sub_etapa = String(body.sub_etapa).trim();
    if (body.etapa_codigo !== undefined)
      updates.etapa_codigo = String(body.etapa_codigo).trim();
    if (body.ordem !== undefined)
      updates.ordem = Number(body.ordem);
    if (body.qtd_overrides !== undefined) {
      updates.qtd_overrides = typeof body.qtd_overrides === 'object'
        ? JSON.stringify(body.qtd_overrides)
        : String(body.qtd_overrides);
    }

    const ok = await updateRowById('ITENS_ORCAMENTO', itemId, updates);
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
    const ok = await deleteRowById('ITENS_ORCAMENTO', itemId);
    if (!ok) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
