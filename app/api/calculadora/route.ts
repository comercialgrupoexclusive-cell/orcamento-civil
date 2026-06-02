import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/db';
import { ETAPAS } from '@/lib/types';
import type { CalcItem } from '@/lib/types';
import { randomUUID } from 'crypto';

interface AplicarBody {
  orcamento_id: string;
  itens: CalcItem[];
}

export async function POST(req: NextRequest) {
  try {
    const body: AplicarBody = await req.json();
    const { orcamento_id, itens } = body;

    if (!orcamento_id) {
      return NextResponse.json({ error: 'orcamento_id é obrigatório' }, { status: 400 });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item para adicionar' }, { status: 400 });
    }

    // Valida que o orçamento existe
    const orcamentos = await readSheet('ORCAMENTOS');
    const orc = orcamentos.find((o: Record<string, unknown>) => o.id === orcamento_id);
    if (!orc) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Valida etapas
    const etapasCodigos = new Set(ETAPAS.map(e => e.codigo));

    // Busca itens existentes para calcular ordem por etapa
    const todosItens = await readSheet('ITENS_ORCAMENTO');
    const ordemPorEtapa: Record<string, number> = {};
    for (const item of todosItens) {
      const t = item as Record<string, unknown>;
      if (t.orcamento_id === orcamento_id && t.etapa_codigo) {
        const etapa = String(t.etapa_codigo);
        const ordem = Number(t.ordem) || 0;
        if (!ordemPorEtapa[etapa] || ordem > ordemPorEtapa[etapa]) {
          ordemPorEtapa[etapa] = ordem;
        }
      }
    }

    const adicionados: string[] = [];
    const erros: string[] = [];

    for (const item of itens) {
      const etapa = item.etapa_codigo;
      if (!etapasCodigos.has(etapa)) {
        erros.push(`Etapa inválida: ${etapa} (${item.nome})`);
        continue;
      }

      if (item.quantidade <= 0) {
        erros.push(`Quantidade zero: ${item.nome}`);
        continue;
      }

      // Incrementa ordem
      ordemPorEtapa[etapa] = (ordemPorEtapa[etapa] || 0) + 1;

      const novoItem = {
        id: randomUUID(),
        orcamento_id,
        etapa_codigo: etapa,
        sub_etapa: item.sub_etapa || '',
        composicao_id: item.composicao_id || '',
        descricao_override: item.composicao_id ? '' : item.descricao,
        unidade_override: item.composicao_id ? '' : item.unidade,
        custo_unitario_override: 0,
        quantidade: Math.round(item.quantidade * 1000) / 1000,   // elimina ruído floating-point
        quantidade_tipo: 'AUTO',
        ordem: ordemPorEtapa[etapa],
        qtd_overrides: '',
      };

      await appendRow('ITENS_ORCAMENTO', novoItem);
      adicionados.push(novoItem.id);
    }

    return NextResponse.json({
      adicionados: adicionados.length,
      ids: adicionados,
      erros,
    });
  } catch (err) {
    console.error('[calculadora] Erro:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
