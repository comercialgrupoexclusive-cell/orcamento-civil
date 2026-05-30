import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';
import { gerarCodigoComposicao } from '@/lib/codigo-generator';
import { validarCampoObrigatorio, coletarErros, normalizar } from '@/lib/validators';
import type { Composicao, ItemComposicao, Insumo } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function calcularCusto(composicaoId: string): Promise<number> {
  const itens = await readSheet('ITENS_COMPOSICAO');
  const insumos = await readSheet('INSUMOS');
  const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

  return itens
    .filter(i => i.composicao_id === composicaoId)
    .reduce((acc, i) => {
      const preco = Number(insumoMap[i.insumo_id]?.preco || 0);
      return acc + preco * Number(i.coeficiente || 0);
    }, 0);
}

function rowToComposicao(r: Record<string, string>, custo?: number): Composicao {
  return {
    id: r.id,
    codigo: r.codigo,
    descricao: r.descricao,
    unidade_producao: r.unidade_producao,
    producao: Number(r.producao) || 1,
    descricao_tecnica: r.descricao_tecnica,
    status: (r.status as 'ativo' | 'inativo') || 'ativo',
    custo_unitario: custo,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.toLowerCase();
    const comCusto = searchParams.get('custo') === '1';

    let rows = await readSheet('COMPOSICOES');
    if (status) rows = rows.filter(r => r.status === status);
    if (q) {
      const qn = normalizar(q);
      rows = rows.filter(r =>
        normalizar(r.descricao || '').includes(qn) ||
        normalizar(r.codigo || '').includes(qn)
      );
    }

    const result: Composicao[] = await Promise.all(
      rows.map(async r => {
        const custo = comCusto ? await calcularCusto(r.id) : undefined;
        return rowToComposicao(r, custo);
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const erros = coletarErros([
      validarCampoObrigatorio(body.descricao, 'Descrição'),
      validarCampoObrigatorio(body.unidade_producao, 'Unidade de produção'),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    // Impede composição duplicada (mesma descrição normalizada)
    const todas = await readSheet('COMPOSICOES');
    const descNorm = normalizar(String(body.descricao).trim());
    const existente = todas.find(r => normalizar(r.descricao || '') === descNorm);
    if (existente) {
      return NextResponse.json(
        { erros: [`Já existe uma composição com descrição similar: "${existente.descricao}" (${existente.codigo})`] },
        { status: 409 }
      );
    }

    const codigo = await gerarCodigoComposicao();
    const composicao: Composicao = {
      id: uuidv4(),
      codigo,
      descricao: String(body.descricao).trim(),
      unidade_producao: String(body.unidade_producao).trim(),
      producao: Number(body.producao) || 1,
      descricao_tecnica: String(body.descricao_tecnica || '').trim(),
      status: 'ativo',
    };

    await appendRow('COMPOSICOES', composicao as unknown as Record<string, unknown>);
    return NextResponse.json(composicao, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
