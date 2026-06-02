import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/db';
import { randomUUID } from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const obra_id = searchParams.get('obra_id');
  const etapa_obra_id = searchParams.get('etapa_obra_id');
  const svcs = await readSheet('SERVICOS_ETAPA');
  let lista = svcs;
  if (obra_id) lista = lista.filter(s => s.obra_id === obra_id);
  if (etapa_obra_id) lista = lista.filter(s => s.etapa_obra_id === etapa_obra_id);
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const svc = {
    id: randomUUID(),
    etapa_obra_id: String(body.etapa_obra_id || ''),
    obra_id: String(body.obra_id || ''),
    etapa_codigo: String(body.etapa_codigo || ''),
    composicao_codigo: String(body.composicao_codigo || ''),
    servico_nome: String(body.servico_nome || ''),
    unidade: String(body.unidade || ''),
    quantidade: String(body.quantidade || '0'),
    status_compra: String(body.status_compra || 'pendente'),
    fornecedor_id: String(body.fornecedor_id || ''),
    observacao: String(body.observacao || ''),
  };
  await appendRow('SERVICOS_ETAPA', svc);
  return NextResponse.json(svc, { status: 201 });
}
