import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow, deleteRowById } from '@/lib/db';
import { ETAPAS } from '@/lib/types';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: obra_id } = await params;
    const body = await req.json().catch(() => ({}));
    const modo: 'merge' | 'replace' = body.modo === 'replace' ? 'replace' : 'merge';

    // ── Valida obra e orçamento ───────────────────────────────────────────────
    const obras = await readSheet('OBRAS');
    const obra  = obras.find(o => o.id === obra_id);
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

    const orcamento_id = body.orcamento_id || obra.orcamento_id;
    if (!orcamento_id)
      return NextResponse.json({ error: 'Nenhum orçamento vinculado à obra' }, { status: 400 });

    // ── Carrega dados do orçamento ────────────────────────────────────────────
    const [itensOrc, composicoes] = await Promise.all([
      readSheet('ITENS_ORCAMENTO'),
      readSheet('COMPOSICOES'),
    ]);
    const compMap = Object.fromEntries(composicoes.map(c => [c.id, c]));
    const itensFiltrados = itensOrc
      .filter(i => i.orcamento_id === orcamento_id)
      .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));

    if (itensFiltrados.length === 0)
      return NextResponse.json({ error: 'Orçamento não possui itens' }, { status: 400 });

    // ── Modo replace: apaga etapas + serviços existentes da obra ──────────────
    if (modo === 'replace') {
      const [etapasExist, svcsExist] = await Promise.all([
        readSheet('ETAPAS_OBRA'),
        readSheet('SERVICOS_ETAPA'),
      ]);
      const etapasObra = etapasExist.filter(e => e.obra_id === obra_id);
      const svcsObra   = svcsExist.filter(s => s.obra_id === obra_id);
      await Promise.all([
        ...etapasObra.map(e => deleteRowById('ETAPAS_OBRA',   e.id)),
        ...svcsObra.map(s  => deleteRowById('SERVICOS_ETAPA', s.id)),
      ]);
    }

    // ── Agrupa itens por etapa_codigo ─────────────────────────────────────────
    const grupoEtapas = new Map<string, typeof itensFiltrados>();
    for (const item of itensFiltrados) {
      const ec = item.etapa_codigo || '';
      if (!grupoEtapas.has(ec)) grupoEtapas.set(ec, []);
      grupoEtapas.get(ec)!.push(item);
    }

    // ── Carrega estado atual para merge ───────────────────────────────────────
    const [etapasAtual, svcsAtual] = await Promise.all([
      readSheet('ETAPAS_OBRA'),
      readSheet('SERVICOS_ETAPA'),
    ]);
    const etapasObraAtual  = etapasAtual.filter(e => e.obra_id === obra_id);
    const codigosExistentes = new Set(etapasObraAtual.map(e => e.etapa_codigo));

    let etapasCriadas  = 0;
    let servicosCriados = 0;

    for (const [etapa_codigo, itens] of grupoEtapas) {
      const etapaInfo  = ETAPAS.find(e => e.codigo === etapa_codigo);
      const etapa_nome = etapaInfo?.descricao || `Etapa ${etapa_codigo}`;

      // Cria ETAPAS_OBRA se não existir
      let etapaObraId: string;
      if (codigosExistentes.has(etapa_codigo) && modo === 'merge') {
        etapaObraId = etapasObraAtual.find(e => e.etapa_codigo === etapa_codigo)!.id;
      } else {
        etapaObraId = randomUUID();
        await appendRow('ETAPAS_OBRA', {
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
        etapasCriadas++;
        codigosExistentes.add(etapa_codigo);
      }

      // Serviços já existentes nessa etapa (evita duplicata no merge)
      const svcsEtapa = svcsAtual.filter(s => s.etapa_obra_id === etapaObraId);
      const nomesExist = new Set(svcsEtapa.map(s => s.servico_nome));

      // Cria um SERVICO_ETAPA para cada item do orçamento dentro desta etapa
      for (const item of itens) {
        const comp = compMap[item.composicao_id];
        const nomeServico = item.descricao_override || comp?.descricao || item.sub_etapa || 'Serviço';
        if (modo === 'merge' && nomesExist.has(nomeServico)) continue;
        await appendRow('SERVICOS_ETAPA', {
          id:               randomUUID(),
          etapa_obra_id:    etapaObraId,
          obra_id,
          etapa_codigo,
          composicao_codigo: comp?.codigo || '',
          servico_nome:     nomeServico,
          unidade:          item.unidade_override || comp?.unidade_producao || '',
          quantidade:       String(Number(item.quantidade) || 0),
          status_compra:    'pendente',
          fornecedor_id:    '',
          observacao:       item.sub_etapa ? `Serviço: ${item.sub_etapa}` : '',
        });
        servicosCriados++;
        nomesExist.add(nomeServico);
      }
    }

    return NextResponse.json({
      ok: true,
      etapas_criadas:  etapasCriadas,
      servicos_criados: servicosCriados,
      message: `${etapasCriadas} etapa(s) e ${servicosCriados} item(s) importados`,
    });
  } catch (err) {
    console.error('[importar-orcamento]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
