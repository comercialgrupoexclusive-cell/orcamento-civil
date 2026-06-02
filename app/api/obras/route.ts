import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/db';
import { randomUUID } from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const obras = await readSheet('OBRAS');
    const etapas = await readSheet('ETAPAS_OBRA');
    const servicos = await readSheet('SERVICOS_ETAPA');
    const orcamentos = await readSheet('ORCAMENTOS');

    const result = obras.map(o => {
      const obraEtapas = etapas.filter(e => e.obra_id === o.id);
      const obraServicos = servicos.filter(s => s.obra_id === o.id);
      const orc = orcamentos.find(r => r.id === o.orcamento_id);

      const totalEtapas = obraEtapas.length;
      const concluidas = obraEtapas.filter(e => e.status_execucao === 'concluido').length;
      const emAndamento = obraEtapas.filter(e => e.status_execucao === 'em_andamento').length;
      const progresso = totalEtapas > 0 ? Math.round((concluidas / totalEtapas) * 100) : 0;

      const comprados = obraServicos.filter(s => s.status_compra === 'comprado').length;
      const totalSvc = obraServicos.length;

      return {
        ...o,
        progresso,
        etapas_total: totalEtapas,
        etapas_concluidas: concluidas,
        etapas_em_andamento: emAndamento,
        servicos_total: totalSvc,
        servicos_comprados: comprados,
        orcamento_titulo: orc?.titulo || '',
        orcamento_total: Number(orc?.total_direto) || 0,
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
    if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });

    const obra = {
      id: randomUUID(),
      nome: String(body.nome).trim(),
      endereco: String(body.endereco || ''),
      bairro: String(body.bairro || ''),
      cidade: String(body.cidade || ''),
      estado: String(body.estado || ''),
      cep: String(body.cep || ''),
      status: String(body.status || 'nao_iniciado'),
      data_inicio: String(body.data_inicio || ''),
      data_prev_termino: String(body.data_prev_termino || ''),
      area_construida: String(body.area_construida || '0'),
      foto_url: String(body.foto_url || ''),
      responsavel: String(body.responsavel || ''),
      telefone_responsavel: String(body.telefone_responsavel || ''),
      orcamento_id: String(body.orcamento_id || ''),
      observacoes: String(body.observacoes || ''),
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString(),
    };

    await appendRow('OBRAS', obra);
    return NextResponse.json(obra, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
