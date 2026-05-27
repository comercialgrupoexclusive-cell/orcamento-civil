import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRowById, deleteRowById } from '@/lib/db';
import { validarCampoObrigatorio, coletarErros } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await readSheet('COMPOSICOES');
    const row = rows.find(r => r.id === id);
    if (!row) return NextResponse.json({ error: 'Composição não encontrada' }, { status: 404 });

    const itens = await readSheet('ITENS_COMPOSICAO');
    const insumos = await readSheet('INSUMOS');
    const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

    const itensComposicao = itens
      .filter(i => i.composicao_id === id)
      .map(i => ({
        ...i,
        coeficiente: Number(i.coeficiente),
        insumo: insumoMap[i.insumo_id],
        custo_total: Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0),
      }));

    const custo_unitario = itensComposicao.reduce((acc, i) => acc + (i.custo_total || 0), 0);

    return NextResponse.json({ ...row, producao: Number(row.producao), custo_unitario, itens: itensComposicao });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const erros = coletarErros([
      validarCampoObrigatorio(body.descricao, 'Descrição'),
      validarCampoObrigatorio(body.unidade_producao, 'Unidade de produção'),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const updates = {
      descricao: String(body.descricao).trim(),
      unidade_producao: String(body.unidade_producao).trim(),
      producao: Number(body.producao) || 1,
      descricao_tecnica: String(body.descricao_tecnica || '').trim(),
      status: body.status || 'ativo',
      data_alteracao: new Date().toISOString(),
    };

    const ok = await updateRowById('COMPOSICOES', id, updates);
    if (!ok) return NextResponse.json({ error: 'Composição não encontrada' }, { status: 404 });

    return NextResponse.json({ id, ...updates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteRowById('COMPOSICOES', id);
    if (!ok) return NextResponse.json({ error: 'Composição não encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
