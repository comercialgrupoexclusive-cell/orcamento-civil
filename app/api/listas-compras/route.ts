import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const obra_id = searchParams.get('obra_id');
  const status  = searchParams.get('status');

  // Leitura paralela — corta latência ao meio
  const [listasAll, itensAll] = await Promise.all([
    readSheet('LISTAS_COMPRAS'),
    readSheet('ITENS_LISTA'),
  ]);

  let rows = listasAll;
  if (obra_id) rows = rows.filter(r => r.obra_id === obra_id);
  if (status && status !== 'todas') rows = rows.filter(r => r.status === status);
  rows = rows.sort((a, b) => b.data_criacao.localeCompare(a.data_criacao));

  // Inclui itens inline → cliente não precisa de segundo fetch
  const result = rows.map(l => {
    const itens = itensAll.filter(i => i.lista_id === l.id);
    return {
      ...l,
      total_itens:     itens.length,
      itens_entregues: itens.filter(i => i.status_item === 'entregue').length,
      itens,            // ← inline — sem re-fetch ao expandir
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  if (!body.obra_id)      return NextResponse.json({ error: 'obra_id obrigatório' }, { status: 400 });

  const lista = {
    id:            randomUUID(),
    obra_id:       String(body.obra_id),
    orcamento_id:  String(body.orcamento_id || ''),
    nome:          String(body.nome).trim(),
    data_criacao:  new Date().toISOString(),
    data_prevista: String(body.data_prevista || ''),
    status:        'aberta',
    observacao:    String(body.observacao || ''),
    fornecedor_id: String(body.fornecedor_id || ''),
  };

  const hasItens = Array.isArray(body.itens) && body.itens.length > 0;

  // Leitura paralela de ambas as tabelas necessárias
  const [listas, itensExist] = await Promise.all([
    readSheet('LISTAS_COMPRAS'),
    hasItens ? readSheet('ITENS_LISTA') : Promise.resolve([]),
  ]);

  const novosItens = hasItens
    ? body.itens.map((it: Record<string, string>) => ({
        id:                randomUUID(),
        lista_id:          lista.id,
        obra_id:           lista.obra_id,
        insumo_id:         String(it.insumo_id || ''),
        descricao:         String(it.descricao || ''),
        unidade:           String(it.unidade || ''),
        qtd_necessaria:    String(it.qtd_necessaria || '0'),
        status_item:       'aguardando',
        composicao_id:     String(it.composicao_id || ''),
        item_orcamento_id: String(it.item_orcamento_id || ''),
      }))
    : [];

  // Gravação paralela — corta latência ao meio
  await Promise.all([
    writeFile('LISTAS_COMPRAS', [...listas, lista]),
    hasItens ? writeFile('ITENS_LISTA', [...itensExist, ...novosItens]) : Promise.resolve(),
  ]);

  // Retorna lista + itens → cliente não precisa re-buscar
  return NextResponse.json({
    ...lista,
    total_itens: novosItens.length,
    itens_entregues: 0,
    itens: novosItens,  // ← inline
    message: `Lista criada com ${novosItens.length} item(s)`,
  }, { status: 201 });
}
