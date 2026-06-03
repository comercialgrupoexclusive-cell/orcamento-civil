/**
 * POST /api/obras/[id]/gerar-lista-insumos
 * Lê o orçamento vinculado à obra, agrega todos os insumos das composições
 * e cria SERVICOS_ETAPA (um por insumo único) sob uma etapa "Lista de Insumos".
 * Modo 'replace' apaga a etapa existente antes de recriar.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ETAPA_LISTA_CODIGO = 'LC'; // código especial para a etapa de lista de insumos

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obra_id } = await params;
    const body = await req.json().catch(() => ({}));
    const modo: 'merge' | 'replace' = body.modo === 'replace' ? 'replace' : 'replace'; // sempre replace para lista de insumos

    // ── Carrega tudo de uma vez ───────────────────────────────────────────────
    const [obras, itensOrcAll, composicoes, itensCompAll, insumosAll, etapasAll, svcsAll] = await Promise.all([
      readSheet('OBRAS'),
      readSheet('ITENS_ORCAMENTO'),
      readSheet('COMPOSICOES'),
      readSheet('ITENS_COMPOSICAO'),
      readSheet('INSUMOS'),
      readSheet('ETAPAS_OBRA'),
      readSheet('SERVICOS_ETAPA'),
    ]);

    const obra = obras.find(o => o.id === obra_id);
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

    const orcamento_id = obra.orcamento_id;
    if (!orcamento_id)
      return NextResponse.json({ error: 'Obra sem orçamento vinculado' }, { status: 400 });

    const compMap    = Object.fromEntries(composicoes.map(c => [c.id, c]));
    const insumoMap  = Object.fromEntries(insumosAll.map(i => [i.id, i]));
    const icByComp   = new Map<string, typeof itensCompAll>();
    for (const ic of itensCompAll) {
      if (!icByComp.has(ic.composicao_id)) icByComp.set(ic.composicao_id, []);
      icByComp.get(ic.composicao_id)!.push(ic);
    }

    const itensFiltrados = itensOrcAll.filter(i => i.orcamento_id === orcamento_id);
    if (itensFiltrados.length === 0)
      return NextResponse.json({ error: 'Orçamento sem itens' }, { status: 400 });

    // ── Agrega insumos com quantidades (considerando qtd_overrides) ───────────
    const insAgg = new Map<string, {
      insumo_id: string; descricao: string; unidade: string; tipo: string;
      categoria: string; qtd: number;
    }>();

    for (const item of itensFiltrados) {
      const qtdItem = Number(item.quantidade) || 0;
      const qtdOvs: Record<string, number> = {};
      try { Object.assign(qtdOvs, JSON.parse(item.qtd_overrides || '{}')); } catch { /**/ }

      const ics = icByComp.get(item.composicao_id) || [];
      for (const ic of ics) {
        const ins     = insumoMap[ic.insumo_id];
        if (!ins) continue;
        const coef    = Number(ic.coeficiente) || 0;
        const qtdIns  = ic.insumo_id in qtdOvs ? qtdOvs[ic.insumo_id] : coef * qtdItem;
        const existing = insAgg.get(ic.insumo_id);
        if (existing) {
          existing.qtd += qtdIns;
        } else {
          insAgg.set(ic.insumo_id, {
            insumo_id: ic.insumo_id,
            descricao: ins.descricao || '',
            unidade:   ic.unidade || ins.unidade || '',
            tipo:      ins.tipo || 'M',
            categoria: ins.categoria || '',
            qtd:       qtdIns,
          });
        }
      }
    }

    if (insAgg.size === 0)
      return NextResponse.json({ error: 'Nenhum insumo encontrado nas composições' }, { status: 400 });

    // ── Remove etapa "Lista de Insumos" existente (sempre replace) ────────────
    const etapaListaExist = etapasAll.find(e => e.obra_id === obra_id && e.etapa_codigo === ETAPA_LISTA_CODIGO);
    let etapasMut = etapasAll.filter(e => !(e.obra_id === obra_id && e.etapa_codigo === ETAPA_LISTA_CODIGO));
    let svcsMut   = svcsAll.filter(s => s.etapa_obra_id !== etapaListaExist?.id);

    // ── Cria nova etapa "Lista de Insumos" ────────────────────────────────────
    const novaEtapaId = randomUUID();
    etapasMut.push({
      id:              novaEtapaId,
      obra_id,
      orcamento_id,
      etapa_codigo:    ETAPA_LISTA_CODIGO,
      etapa_nome:      'Lista de Insumos',
      status_execucao: 'nao_iniciado',
      data_inicio:     '',
      data_fim_prevista: '',
      data_fim_real:   '',
      ordem:           '99',
    });

    // ── Cria SERVICOS_ETAPA para cada insumo agregado ─────────────────────────
    const TIPO_LABEL: Record<string, string> = { M: 'Material', MO: 'Mão de Obra', E: 'Equipamento', S: 'Serviço' };
    const novosSvcs: typeof svcsMut = [];
    for (const ins of insAgg.values()) {
      if (ins.qtd <= 0) continue;
      novosSvcs.push({
        id:                randomUUID(),
        etapa_obra_id:     novaEtapaId,
        obra_id,
        etapa_codigo:      ETAPA_LISTA_CODIGO,
        composicao_codigo: ins.insumo_id, // guarda o insumo_id aqui
        servico_nome:      ins.descricao,
        unidade:           ins.unidade,
        quantidade:        String(Math.round(ins.qtd * 100) / 100),
        status_compra:     'pendente',
        fornecedor_id:     '',
        observacao:        `${TIPO_LABEL[ins.tipo] || ins.tipo}${ins.categoria ? ' · ' + ins.categoria : ''}`,
      });
    }

    // Ordena: Material → MO → E → S
    const tipoOrdem: Record<string, number> = { M: 1, MO: 2, E: 3, S: 4 };
    novosSvcs.sort((a, b) => {
      const ta = insAgg.get(a.composicao_codigo)?.tipo || 'M';
      const tb = insAgg.get(b.composicao_codigo)?.tipo || 'M';
      return (tipoOrdem[ta] || 5) - (tipoOrdem[tb] || 5) || a.servico_nome.localeCompare(b.servico_nome);
    });

    // ── Batch write ──────────────────────────────────────────────────────────
    await Promise.all([
      writeFile('ETAPAS_OBRA',    etapasMut),
      writeFile('SERVICOS_ETAPA', [...svcsMut, ...novosSvcs]),
    ]);

    return NextResponse.json({
      ok: true,
      insumos: novosSvcs.length,
      message: `${novosSvcs.length} insumo(s) adicionado(s) à lista de compras`,
    });
  } catch (err) {
    console.error('[gerar-lista-insumos]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
