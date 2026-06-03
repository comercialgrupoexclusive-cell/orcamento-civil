import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';
import { ETAPAS } from '@/lib/types';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: obra_id } = await params;
    const body = await req.json().catch(() => ({}));
    const modo: 'merge' | 'replace' = body.modo === 'replace' ? 'replace' : 'merge';

    // ── Valida obra e orçamento ───────────────────────────────────────────────
    const [obras, itensOrcAll, composicoes, etapasAll, svcsAll] = await Promise.all([
      readSheet('OBRAS'),
      readSheet('ITENS_ORCAMENTO'),
      readSheet('COMPOSICOES'),
      readSheet('ETAPAS_OBRA'),
      readSheet('SERVICOS_ETAPA'),
    ]);

    const obra = obras.find(o => o.id === obra_id);
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

    const orcamento_id = body.orcamento_id || obra.orcamento_id;
    if (!orcamento_id)
      return NextResponse.json({ error: 'Nenhum orçamento vinculado à obra' }, { status: 400 });

    const compMap = Object.fromEntries(composicoes.map(c => [c.id, c]));
    const itensFiltrados = itensOrcAll
      .filter(i => i.orcamento_id === orcamento_id)
      .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));

    if (itensFiltrados.length === 0)
      return NextResponse.json({ error: 'Orçamento não possui itens' }, { status: 400 });

    // ── Modo replace: filtra fora etapas/serviços da obra (em memória) ─────────
    let etapasMut = [...etapasAll];
    let svcsMut   = [...svcsAll];

    if (modo === 'replace') {
      const idsEtapasObra = new Set(etapasMut.filter(e => e.obra_id === obra_id).map(e => e.id));
      etapasMut = etapasMut.filter(e => e.obra_id !== obra_id);
      svcsMut   = svcsMut.filter(s => s.obra_id !== obra_id || !idsEtapasObra.has(s.etapa_obra_id));
    }

    // ── Agrupa itens por etapa_codigo ─────────────────────────────────────────
    const grupoEtapas = new Map<string, typeof itensFiltrados>();
    for (const item of itensFiltrados) {
      const ec = item.etapa_codigo || '';
      if (!grupoEtapas.has(ec)) grupoEtapas.set(ec, []);
      grupoEtapas.get(ec)!.push(item);
    }

    // ── Mapa de etapas já existentes para esta obra (merge) ───────────────────
    const etapasObraAtual = etapasMut.filter(e => e.obra_id === obra_id);
    const codigoParaId    = new Map(etapasObraAtual.map(e => [e.etapa_codigo, e.id]));

    let etapasCriadas  = 0;
    let servicosCriados = 0;

    // ── Acumula novas linhas em memória ───────────────────────────────────────
    const novasEtapas : typeof etapasMut = [];
    const novosServicos: typeof svcsMut  = [];

    for (const [etapa_codigo, itens] of grupoEtapas) {
      const etapaInfo  = ETAPAS.find(e => e.codigo === etapa_codigo);
      const etapa_nome = etapaInfo?.descricao || `Etapa ${etapa_codigo}`;

      // Cria ou reutiliza ETAPAS_OBRA
      let etapaObraId: string;
      if (modo === 'merge' && codigoParaId.has(etapa_codigo)) {
        etapaObraId = codigoParaId.get(etapa_codigo)!;
      } else {
        etapaObraId = randomUUID();
        novasEtapas.push({
          id: etapaObraId,
          obra_id,
          orcamento_id,
          etapa_codigo,
          etapa_nome,
          status_execucao: 'nao_iniciado',
          data_inicio:      '',
          data_fim_prevista:'',
          data_fim_real:    '',
          ordem: String(Number(etapa_codigo) || 99),
        });
        codigoParaId.set(etapa_codigo, etapaObraId);
        etapasCriadas++;
      }

      // Nomes já existentes nessa etapa (merge)
      const nomesExist = new Set(
        svcsMut.filter(s => s.etapa_obra_id === etapaObraId).map(s => s.servico_nome)
      );

      for (const item of itens) {
        const comp = compMap[item.composicao_id];
        const nomeServico = item.descricao_override || comp?.descricao || item.sub_etapa || 'Serviço';
        if (modo === 'merge' && nomesExist.has(nomeServico)) continue;
        novosServicos.push({
          id:                randomUUID(),
          etapa_obra_id:     etapaObraId,
          obra_id,
          etapa_codigo,
          composicao_codigo: comp?.codigo || '',
          servico_nome:      nomeServico,
          unidade:           item.unidade_override || comp?.unidade_producao || '',
          quantidade:        String(Number(item.quantidade) || 0),
          status_compra:     'pendente',
          fornecedor_id:     '',
          observacao:        item.sub_etapa ? `Serviço: ${item.sub_etapa}` : '',
        });
        nomesExist.add(nomeServico);
        servicosCriados++;
      }
    }

    // ── Grava em batch (2 writes no total, independente do volume) ────────────
    if (novasEtapas.length > 0) {
      await writeFile('ETAPAS_OBRA', [...etapasMut, ...novasEtapas]);
    }
    if (novosServicos.length > 0) {
      await writeFile('SERVICOS_ETAPA', [...svcsMut, ...novosServicos]);
    }

    return NextResponse.json({
      ok: true,
      etapas_criadas:   etapasCriadas,
      servicos_criados: servicosCriados,
      message: `${etapasCriadas} etapa(s) e ${servicosCriados} item(s) importados`,
    });
  } catch (err) {
    console.error('[importar-orcamento]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
