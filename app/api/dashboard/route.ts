import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [obras, etapas, servicos, orcamentos, itensOrc] = await Promise.all([
      readSheet('OBRAS'),
      readSheet('ETAPAS_OBRA'),
      readSheet('SERVICOS_ETAPA'),
      readSheet('ORCAMENTOS'),
      readSheet('ITENS_ORCAMENTO'),
    ]);

    // Por obra
    const obrasEnriquecidas = obras.map(o => {
      const obraEtapas = etapas.filter(e => e.obra_id === o.id).sort((a,b) => Number(a.ordem)-Number(b.ordem));
      const obraServicos = servicos.filter(s => s.obra_id === o.id);
      const orc = orcamentos.find(r => r.id === o.orcamento_id);

      const totalEt = obraEtapas.length;
      const concluidas = obraEtapas.filter(e => e.status_execucao === 'concluido').length;
      const emAndamento = obraEtapas.filter(e => e.status_execucao === 'em_andamento').length;
      const progresso = totalEt > 0 ? Math.round((concluidas / totalEt) * 100) : 0;

      // Próximas etapas (nao iniciado, ordenadas)
      const proximas = obraEtapas
        .filter(e => e.status_execucao === 'nao_iniciado')
        .slice(0, 3)
        .map(e => {
          const svcsEtapa = obraServicos.filter(s => s.etapa_obra_id === e.id);
          const comprados = svcsEtapa.filter(s => s.status_compra === 'comprado').length;
          const pedidos = svcsEtapa.filter(s => s.status_compra === 'pedido_feito').length;
          const parciais = svcsEtapa.filter(s => s.status_compra === 'parcial').length;
          const total = svcsEtapa.length;
          let statusCompra: string;
          if (total === 0) statusCompra = 'pendente';
          else if (comprados === total) statusCompra = 'comprado';
          else if (comprados + pedidos + parciais > 0) statusCompra = 'parcial';
          else statusCompra = 'pendente';
          return { ...e, status_compra_geral: statusCompra, svcs_total: total, svcs_comprados: comprados };
        });

      // Total orçamento
      const orcItens = itensOrc.filter(i => i.orcamento_id === o.orcamento_id);
      const totalOrc = orc ? (Number(orc.total_direto) || 0) : 0;

      // Compra geral
      const svcsTotal = obraServicos.length;
      const svcsComprados = obraServicos.filter(s => s.status_compra === 'comprado').length;
      const svcsPedidos = obraServicos.filter(s => s.status_compra === 'pedido_feito').length;
      const svcsParc = obraServicos.filter(s => s.status_compra === 'parcial').length;
      const svcsPendentes = svcsTotal - svcsComprados;

      return {
        id: o.id, nome: o.nome, status: o.status,
        cidade: o.cidade, estado: o.estado,
        data_inicio: o.data_inicio, data_prev_termino: o.data_prev_termino,
        area_construida: Number(o.area_construida) || 0,
        responsavel: o.responsavel, foto_url: o.foto_url,
        orcamento_id: o.orcamento_id, orcamento_titulo: orc?.titulo || '',
        total_orcamento: totalOrc,
        progresso, etapas_total: totalEt, etapas_concluidas: concluidas,
        etapas_em_andamento: emAndamento,
        proximas_etapas: proximas,
        svcs_total: svcsTotal, svcs_comprados: svcsComprados,
        svcs_pedidos: svcsPedidos, svcs_parciais: svcsParc, svcs_pendentes: svcsPendentes,
        num_itens_orcamento: orcItens.length,
      };
    });

    // Próximas etapas nos próximos 30 dias (data_inicio ou data_fim_prevista)
    const hoje  = new Date(); hoje.setHours(0,0,0,0);
    const em30d = new Date(hoje.getTime() + 30 * 24 * 3600 * 1000);

    const etapas30d = etapas.flatMap(e => {
      const obra = obrasEnriquecidas.find(o => o.id === e.obra_id);
      if (!obra) return [];
      // Usa data_inicio para "a começar"; data_fim_prevista para "em andamento"
      const dataRef = e.data_inicio || e.data_fim_prevista;
      if (!dataRef) return [];
      const d = new Date(dataRef + 'T00:00:00');
      if (d < hoje || d > em30d) return [];
      if (e.status_execucao === 'concluido') return [];

      const svcsEtapa = servicos.filter(s => s.etapa_obra_id === e.id);
      const comprados  = svcsEtapa.filter(s => s.status_compra === 'comprado').length;
      const pedidos    = svcsEtapa.filter(s => s.status_compra === 'pedido_feito').length;
      const total      = svcsEtapa.length;
      let statusCompra = 'pendente';
      if (total > 0) {
        if (comprados === total) statusCompra = 'comprado';
        else if (comprados + pedidos > 0) statusCompra = 'parcial';
      }

      return [{
        id: e.id, etapa_nome: e.etapa_nome, etapa_codigo: e.etapa_codigo,
        obra_id: obra.id, obra_nome: obra.nome,
        data_inicio: e.data_inicio, data_fim_prevista: e.data_fim_prevista,
        status_execucao: e.status_execucao,
        status_compra_geral: statusCompra,
        svcs_total: total, svcs_comprados: comprados,
        data_ref: dataRef,
      }];
    }).sort((a, b) => a.data_ref.localeCompare(b.data_ref));

    // Totais gerais
    const totalObras = obras.length;
    const obrasAtivas = obras.filter(o => o.status === 'em_andamento').length;
    const totalInvestimento = obrasEnriquecidas.reduce((s, o) => s + o.total_orcamento, 0);

    return NextResponse.json({
      resumo: { total_obras: totalObras, obras_ativas: obrasAtivas, total_investimento: totalInvestimento },
      obras: obrasEnriquecidas,
      etapas_30dias: etapas30d,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
