import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRowById, deleteRowById } from '@/lib/db';
import { validarCampoObrigatorio, validarBDI, coletarErros } from '@/lib/validators';
import { ETAPAS } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Breakdown = { M: number; MO: number; E: number; S: number };
const zeroBreakdown = (): Breakdown => ({ M: 0, MO: 0, E: 0, S: 0 });
const addBreakdown = (a: Breakdown, b: Breakdown): Breakdown => ({
  M: a.M + b.M, MO: a.MO + b.MO, E: a.E + b.E, S: a.S + b.S,
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orcamentos = await readSheet('ORCAMENTOS');
    const row = orcamentos.find(r => r.id === id);
    if (!row) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    const itensOrc = await readSheet('ITENS_ORCAMENTO');
    const composicoes = await readSheet('COMPOSICOES');
    const itensComp = await readSheet('ITENS_COMPOSICAO');
    const insumos = await readSheet('INSUMOS');

    const composicaoMap = Object.fromEntries(composicoes.map(c => [c.id, c]));
    const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

    const custoBase = (composicaoId: string) =>
      itensComp
        .filter(i => i.composicao_id === composicaoId)
        .reduce((acc, i) => acc + Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0), 0);

    const tipoBreakdownBase = (composicaoId: string): Breakdown => {
      const bd = zeroBreakdown();
      itensComp
        .filter(i => i.composicao_id === composicaoId)
        .forEach(i => {
          const ins = insumoMap[i.insumo_id];
          if (ins) {
            const t = (ins.tipo || 'M') as keyof Breakdown;
            bd[t] += Number(ins.preco || 0) * Number(i.coeficiente || 0);
          }
        });
      return bd;
    };

    const itens = itensOrc
      .filter(i => i.orcamento_id === id)
      .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
      .map(i => {
        const comp = composicaoMap[i.composicao_id];
        const custoUnitario = Number(i.custo_unitario_override) || custoBase(i.composicao_id);
        const quantidade = Number(i.quantidade) || 0;
        const custoTotal = custoUnitario * quantidade;

        const bdBase = tipoBreakdownBase(i.composicao_id);
        const baseSum = bdBase.M + bdBase.MO + bdBase.E + bdBase.S;
        const scale = baseSum > 0 ? custoTotal / baseSum : 0;
        const breakdown: Breakdown = {
          M: bdBase.M * scale,
          MO: bdBase.MO * scale,
          E: bdBase.E * scale,
          S: bdBase.S * scale,
        };

        return {
          id: i.id,
          orcamento_id: i.orcamento_id,
          etapa_codigo: i.etapa_codigo,
          sub_etapa: i.sub_etapa || '',
          ordem: Number(i.ordem) || 0,
          composicao_id: i.composicao_id,
          descricao_override: i.descricao_override,
          unidade_override: i.unidade_override,
          quantidade,
          quantidade_tipo: i.quantidade_tipo as 'AUTO' | 'MANUAL',
          custo_unitario_override: Number(i.custo_unitario_override) || 0,
          custo_unitario_efetivo: custoUnitario,
          custo_total: custoTotal,
          breakdown,
          composicao: comp ? { ...comp, producao: Number(comp.producao), custo_unitario: custoBase(comp.id) } : null,
        };
      });

    const bdi = Number(row.bdi_percentual) || 0;

    const etapas = ETAPAS.map(etapa => {
      const etapaItens = itens.filter(i => i.etapa_codigo === etapa.codigo);
      const subtotal = etapaItens.reduce((acc, i) => acc + (i.custo_total || 0), 0);
      const breakdown = etapaItens.reduce((acc, i) => addBreakdown(acc, i.breakdown), zeroBreakdown());
      return { ...etapa, itens: etapaItens, subtotal, breakdown };
    }).filter(e => e.itens.length > 0);

    const totalDireto = itens.reduce((acc, i) => acc + (i.custo_total || 0), 0);
    const totalComBDI = totalDireto * (1 + bdi / 100);
    const totalBreakdown = itens.reduce((acc, i) => addBreakdown(acc, i.breakdown), zeroBreakdown());

    return NextResponse.json({
      ...row,
      bdi_percentual: bdi,
      etapas,
      total_direto: totalDireto,
      total_com_bdi: totalComBDI,
      total_breakdown: totalBreakdown,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const erros = coletarErros([
      validarCampoObrigatorio(body.titulo, 'Título'),
      validarBDI(body.bdi_percentual ?? 0),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const updates = {
      titulo: String(body.titulo).trim(),
      descricao: String(body.descricao || '').trim(),
      status: body.status || 'em_andamento',
      bdi_percentual: Number(body.bdi_percentual) || 0,
      data_atualizacao: new Date().toISOString(),
    };

    const ok = await updateRowById('ORCAMENTOS', id, updates);
    if (!ok) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    return NextResponse.json({ id, ...updates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteRowById('ORCAMENTOS', id);
    if (!ok) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
