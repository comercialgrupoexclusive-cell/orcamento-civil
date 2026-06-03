import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const obra_id = searchParams.get('obra_id');
  const status  = searchParams.get('status');

  let rows = await readSheet('LISTAS_COMPRAS');
  if (obra_id) rows = rows.filter(r => r.obra_id === obra_id);
  if (status && status !== 'todas') rows = rows.filter(r => r.status === status);
  rows = rows.sort((a, b) => b.data_criacao.localeCompare(a.data_criacao));

  // Enriquece com contagem de itens
  const itens = await readSheet('ITENS_LISTA');
  const result = rows.map(l => ({
    ...l,
    total_itens:    itens.filter(i => i.lista_id === l.id).length,
    itens_entregues: itens.filter(i => i.lista_id === l.id && i.status_item === 'entregue').length,
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.nome?.trim())    return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  if (!body.obra_id)         return NextResponse.json({ error: 'obra_id obrigatório' }, { status: 400 });

  const lista = {
    id:           randomUUID(),
    obra_id:      String(body.obra_id),
    orcamento_id: String(body.orcamento_id || ''),
    nome:         String(body.nome).trim(),
    data_criacao: new Date().toISOString(),
    data_prevista:String(body.data_prevista || ''),
    status:       'aberta',
    observacao:   String(body.observacao || ''),
    fornecedor_id:String(body.fornecedor_id || ''),
  };

  const listas = await readSheet('LISTAS_COMPRAS');
  await writeFile('LISTAS_COMPRAS', [...listas, lista]);

  // Se vieram itens junto, persiste também
  if (Array.isArray(body.itens) && body.itens.length > 0) {
    const itensExist = await readSheet('ITENS_LISTA');
    const novosItens = body.itens.map((it: Record<string, string>) => ({
      id:               randomUUID(),
      lista_id:         lista.id,
      obra_id:          lista.obra_id,
      insumo_id:        String(it.insumo_id || ''),
      descricao:        String(it.descricao || ''),
      unidade:          String(it.unidade || ''),
      qtd_necessaria:   String(it.qtd_necessaria || '0'),
      status_item:      'aguardando',
      composicao_id:    String(it.composicao_id || ''),
      item_orcamento_id:String(it.item_orcamento_id || ''),
    }));
    await writeFile('ITENS_LISTA', [...itensExist, ...novosItens]);
    lista as unknown as Record<string, unknown>;
    return NextResponse.json({ ...lista, itens_criados: novosItens.length }, { status: 201 });
  }

  return NextResponse.json(lista, { status: 201 });
}
