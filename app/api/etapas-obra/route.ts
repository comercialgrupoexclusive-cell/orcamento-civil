import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/db';
import { randomUUID } from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const obra_id = new URL(req.url).searchParams.get('obra_id');
  const etapas = await readSheet('ETAPAS_OBRA');
  const servicos = await readSheet('SERVICOS_ETAPA');
  const lista = (obra_id ? etapas.filter(e => e.obra_id === obra_id) : etapas)
    .sort((a, b) => Number(a.ordem) - Number(b.ordem))
    .map(et => ({ ...et, servicos: servicos.filter(s => s.etapa_obra_id === et.id) }));
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const etapa = {
    id: randomUUID(),
    obra_id: String(body.obra_id || ''),
    orcamento_id: String(body.orcamento_id || ''),
    etapa_codigo: String(body.etapa_codigo || ''),
    etapa_nome: String(body.etapa_nome || ''),
    status_execucao: String(body.status_execucao || 'nao_iniciado'),
    data_inicio: String(body.data_inicio || ''),
    data_fim_prevista: String(body.data_fim_prevista || ''),
    data_fim_real: String(body.data_fim_real || ''),
    ordem: String(body.ordem || '99'),
  };
  await appendRow('ETAPAS_OBRA', etapa);
  return NextResponse.json(etapa, { status: 201 });
}
