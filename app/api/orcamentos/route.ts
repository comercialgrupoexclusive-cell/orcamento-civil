import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';
import { validarCampoObrigatorio, validarBDI, coletarErros } from '@/lib/validators';
import type { Orcamento } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await readSheet('ORCAMENTOS');
    const itens = await readSheet('ITENS_ORCAMENTO');
    const insumos = await readSheet('INSUMOS');
    const composicoes = await readSheet('COMPOSICOES');
    const itensComposicao = await readSheet('ITENS_COMPOSICAO');

    const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

    const custoComposicao = (composicaoId: string) =>
      itensComposicao
        .filter(i => i.composicao_id === composicaoId)
        .reduce((acc, i) => acc + Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0), 0);

    const result = rows.map(row => {
      const bdi = Number(row.bdi_percentual) || 0;
      const orcItens = itens.filter(i => i.orcamento_id === row.id);

      const totalDireto = orcItens.reduce((acc, i) => {
        const custo = Number(i.custo_unitario_override) || custoComposicao(i.composicao_id);
        return acc + custo * Number(i.quantidade || 0);
      }, 0);

      return {
        id: row.id,
        titulo: row.titulo,
        descricao: row.descricao,
        data_criacao: row.data_criacao,
        status: row.status,
        bdi_percentual: bdi,
        total_direto: totalDireto,
        total_com_bdi: totalDireto * (1 + bdi / 100),
        num_itens: orcItens.length,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const erros = coletarErros([
      validarCampoObrigatorio(body.titulo, 'Título'),
      validarBDI(body.bdi_percentual ?? 0),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const orcamento: Orcamento = {
      id: uuidv4(),
      titulo: String(body.titulo).trim(),
      descricao: String(body.descricao || '').trim(),
      data_criacao: new Date().toISOString().split('T')[0],
      status: 'ativo',
      bdi_percentual: Number(body.bdi_percentual) || 0,
    };

    await appendRow('ORCAMENTOS', orcamento as unknown as Record<string, unknown>);
    return NextResponse.json(orcamento, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
