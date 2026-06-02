import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile, SHEET_HEADERS } from '@/lib/db';
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

    if (!orcamento_id) return NextResponse.json({ error: 'orcamento_id é obrigatório' }, { status: 400 });
    if (!Array.isArray(itens) || itens.length === 0) return NextResponse.json({ error: 'Nenhum item' }, { status: 400 });

    // Leitura única de orçamentos + itens existentes
    const [orcamentos, todosItens] = await Promise.all([
      readSheet('ORCAMENTOS'),
      readSheet('ITENS_ORCAMENTO'),
    ]);

    const orc = orcamentos.find((o: Record<string, unknown>) => o.id === orcamento_id);
    if (!orc) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    const etapasCodigos = new Set(ETAPAS.map(e => e.codigo));
    const headers = SHEET_HEADERS['ITENS_ORCAMENTO'];

    // Ordem máxima por etapa nos itens existentes
    const ordemPorEtapa: Record<string, number> = {};
    for (const item of todosItens) {
      const t = item as Record<string, unknown>;
      if (t.orcamento_id === orcamento_id && t.etapa_codigo) {
        const etapa = String(t.etapa_codigo);
        const ordem = Number(t.ordem) || 0;
        if (!ordemPorEtapa[etapa] || ordem > ordemPorEtapa[etapa]) ordemPorEtapa[etapa] = ordem;
      }
    }

    const novosItens: Record<string, string>[] = [];
    const adicionados: string[] = [];
    const erros: string[] = [];

    for (const item of itens) {
      const etapa = item.etapa_codigo;

      // Aceitar etapa '20' (Outros) além das etapas padrão
      if (!etapasCodigos.has(etapa) && etapa !== '20') {
        erros.push(`Etapa inválida: ${etapa} (${item.nome})`);
        continue;
      }
      if (item.quantidade <= 0) {
        erros.push(`Quantidade zero: ${item.nome}`);
        continue;
      }

      ordemPorEtapa[etapa] = (ordemPorEtapa[etapa] || 0) + 1;

      const id = randomUUID();
      const row: Record<string, string> = {};

      // Preenche respeitando os headers definidos
      headers.forEach((h: string) => { row[h] = ''; });
      row.id = id;
      row.orcamento_id = orcamento_id;
      row.etapa_codigo = etapa;
      row.sub_etapa = item.sub_etapa || '';
      row.composicao_id = item.composicao_id || '';
      row.descricao_override = item.composicao_id ? '' : (item.descricao || '');
      row.unidade_override = item.composicao_id ? '' : (item.unidade || '');
      row.custo_unitario_override = '0';
      row.quantidade = String(Math.round(item.quantidade * 1000) / 1000);
      row.quantidade_tipo = 'AUTO';
      row.ordem = String(ordemPorEtapa[etapa]);
      row.qtd_overrides = '';

      novosItens.push(row);
      adicionados.push(id);
    }

    if (novosItens.length > 0) {
      // UMA ÚNICA escrita no Blob com todos os novos itens
      await writeFile('ITENS_ORCAMENTO', [...todosItens, ...novosItens]);
    }

    return NextResponse.json({ adicionados: adicionados.length, ids: adicionados, erros });
  } catch (err) {
    console.error('[calculadora] Erro:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
