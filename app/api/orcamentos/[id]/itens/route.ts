import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';
import { validarCampoObrigatorio, validarQuantidade, coletarErros } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const itens = await readSheet('ITENS_ORCAMENTO');
    return NextResponse.json(itens.filter(i => i.orcamento_id === id));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const erros = coletarErros([
      validarCampoObrigatorio(body.etapa_codigo, 'Etapa'),
      validarQuantidade(body.quantidade ?? 0),
    ]);
    // composicao_id opcional — se informado, valida existência
    if (body.composicao_id) {
      const composicoes = await readSheet('COMPOSICOES');
      const comp = composicoes.find((c: Record<string, string>) => c.id === body.composicao_id);
      if (!comp) erros.push('Composição não encontrada');
    } else if (!body.descricao_override?.trim()) {
      erros.push('Informe uma composição ou uma descrição para o item');
    }
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    // Calcula próxima ordem dentro da etapa/sub-etapa
    const todosItens = await readSheet('ITENS_ORCAMENTO');
    const itensEtapa = todosItens.filter(i => i.orcamento_id === id && i.etapa_codigo === String(body.etapa_codigo));
    const maxOrdem = itensEtapa.reduce((max, i) => Math.max(max, Number(i.ordem) || 0), 0);

    const item = {
      id: uuidv4(),
      orcamento_id: id,
      etapa_codigo: String(body.etapa_codigo),
      sub_etapa: String(body.sub_etapa || '').trim(),
      composicao_id: body.composicao_id,
      descricao_override: String(body.descricao_override || '').trim(),
      unidade_override: String(body.unidade_override || '').trim(),
      custo_unitario_override: Number(body.custo_unitario_override) || 0,
      quantidade: Number(body.quantidade) || 0,
      quantidade_tipo: 'MANUAL' as const,
      ordem: maxOrdem + 1,
    };

    await appendRow('ITENS_ORCAMENTO', item);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
