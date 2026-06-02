import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/db';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { ETAPAS } from '@/lib/types';

export const dynamic = 'force-dynamic';

function fmtN(n: number) {
  return Number(n.toFixed(2));
}
function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(a: number, b: number) {
  return b > 0 ? Number(((a / b) * 100).toFixed(2)) : 0;
}

// ─── Exportar Orçamento Analítico (ExcelJS — formatado) ──────────────────────
async function exportarOrcamento(orcamentoId: string): Promise<Buffer> {
  const orcamentos    = await readSheet('ORCAMENTOS');
  const orc           = orcamentos.find(o => o.id === orcamentoId);
  if (!orc) throw new Error('Orçamento não encontrado');

  const itensOrc   = await readSheet('ITENS_ORCAMENTO');
  const composicoes= await readSheet('COMPOSICOES');
  const itensComp  = await readSheet('ITENS_COMPOSICAO');
  const insumos    = await readSheet('INSUMOS');

  const compMap    = Object.fromEntries(composicoes.map(c => [c.id, c]));
  const insumoMap  = Object.fromEntries(insumos.map(i => [i.id, i]));

  const custoBase = (cid: string) =>
    itensComp
      .filter(ic => ic.composicao_id === cid)
      .reduce((a, ic) => a + Number(insumoMap[ic.insumo_id]?.preco || 0) * Number(ic.coeficiente || 0), 0);

  // Monta estrutura completa com insumos por item
  const bdi = Number(orc.bdi_percentual) || 0;
  const area = Number(orc.area_construida) || 0;

  const orcItens = itensOrc
    .filter(i => i.orcamento_id === orcamentoId)
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
    .map(i => {
      const comp = compMap[i.composicao_id];
      const qtd  = Number(i.quantidade) || 0;

      // Parse per-insumo overrides de quantidade
      const qtdOvs: Record<string, number> = {};
      try { Object.assign(qtdOvs, JSON.parse(i.qtd_overrides || '{}')); } catch { /**/ }

      // Calcula insumos PRIMEIRO (com overrides) — igual à API
      const insumosItem = itensComp
        .filter(ic => ic.composicao_id === i.composicao_id)
        .map(ic => {
          const ins    = insumoMap[ic.insumo_id];
          const coef   = Number(ic.coeficiente) || 0;
          const preco  = Number(ins?.preco || 0);
          const qtdIns = ic.insumo_id in qtdOvs ? qtdOvs[ic.insumo_id] : coef * qtd;
          return {
            insumo_id  : ic.insumo_id,
            descricao  : ins?.descricao || '',
            unidade    : ic.unidade || ins?.unidade || '',
            categoria  : ins?.categoria || '',
            tipo       : ins?.tipo || 'M',
            coeficiente: coef,
            preco_unit : preco,
            qtd_total  : qtdIns,
            custo_item : preco * qtdIns,
          };
        });

      // Deriva custo efetivo dos insumos (mesma lógica da API /orcamentos/[id]/route.ts)
      const custoTotalInsumos = insumosItem.reduce((a, ins) => a + ins.custo_item, 0);
      const cuOverride = Number(i.custo_unitario_override);
      let total: number;
      let cu: number;
      if (cuOverride) {
        total = cuOverride * qtd;
        cu    = cuOverride;
      } else if (insumosItem.length > 0) {
        total = custoTotalInsumos;
        cu    = qtd > 0 ? custoTotalInsumos / qtd : 0;
      } else {
        cu    = custoBase(i.composicao_id);
        total = cu * qtd;
      }

      const breakdown = { M: 0, MO: 0, E: 0, S: 0 };
      for (const ins of insumosItem) {
        const t = ins.tipo as keyof typeof breakdown;
        if (t in breakdown) breakdown[t] += ins.custo_item;
      }

      return {
        id: i.id, etapa_codigo: i.etapa_codigo, sub_etapa: i.sub_etapa || '',
        comp, qtd, cu, total, insumosItem, breakdown,
        descricao: i.descricao_override || comp?.descricao || '',
        unidade  : i.unidade_override   || comp?.unidade_producao || '',
        quantidade_tipo: i.quantidade_tipo,
      };
    });

  const totalDireto = orcItens.reduce((a, i) => a + i.total, 0);

  // ── Helpers de estilo ExcelJS ─────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Orçamento Civil';
  wb.created = new Date();

  const bordaFina: ExcelJS.Border = { style: 'thin', color: { argb: 'FFD0D0D0' } };
  const bordaFull = { top: bordaFina, left: bordaFina, bottom: bordaFina, right: bordaFina };

  function cor(hex: string): ExcelJS.Fill {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: hex } };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 1 — Orçamento Visual
  // ══════════════════════════════════════════════════════════════════════════
  const wsV = wb.addWorksheet('Orçamento Visual');
  wsV.columns = [
    { width: 6  }, // nível / recuo
    { width: 10 }, // código
    { width: 52 }, // descrição
    { width: 10 }, // unidade
    { width: 14 }, // quantidade
    { width: 18 }, // custo unit
    { width: 18 }, // total
  ];

  function addVisual(cells: (string | number)[], fill: string, bold = false, italic = false, indent = 0) {
    const row = wsV.addRow(cells);
    row.eachCell({ includeEmpty: true }, (cell, ci) => {
      cell.border = bordaFull;
      cell.fill = cor(fill);
      cell.font = { bold, italic, size: 9, color: { argb: fill === 'FF1E3A5F' ? 'FFFFFFFF' : 'FF1A1A1A' } };
      if (ci === 3) cell.alignment = { horizontal: 'left', indent, wrapText: true };
      if (ci >= 5) { cell.alignment = { horizontal: 'right' }; cell.numFmt = '#,##0.00'; }
      if (ci === 5) cell.alignment = { horizontal: 'center' };
    });
    return row;
  }

  // Cabeçalho do orçamento
  wsV.mergeCells('A1:G1');
  const cTitle = wsV.getCell('A1');
  cTitle.value = `ORÇAMENTO — ${orc.titulo}`;
  cTitle.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  cTitle.fill  = cor('FF1E3A5F');
  cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsV.getRow(1).height = 24;

  wsV.mergeCells('A2:G2');
  const cSub = wsV.getCell('A2');
  cSub.value = `Data: ${new Date().toLocaleDateString('pt-BR')}${area > 0 ? `   |   Área construída: ${area} m²` : ''}   |   BDI: ${bdi}%`;
  cSub.font  = { size: 9, italic: true };
  cSub.fill  = cor('FFE8EDF5');
  cSub.alignment = { horizontal: 'center' };

  // Cabeçalho das colunas
  addVisual(['Nível', 'Código', 'Descrição', 'Und', 'Qtd', 'Custo Unit.', 'Total'], 'FF2D5986', true);
  wsV.getRow(3).eachCell(c => { c.font = { ...c.font, color: { argb: 'FFFFFFFF' } }; });

  let totalGeralV = 0;

  for (const etapa of ETAPAS) {
    const etItens = orcItens.filter(i => i.etapa_codigo === etapa.codigo);
    if (etItens.length === 0) continue;

    const subtotalEtapa = etItens.reduce((a, i) => a + i.total, 0);
    totalGeralV += subtotalEtapa;

    // Linha de etapa
    addVisual(['E', etapa.codigo, `${etapa.codigo} — ${etapa.descricao}`, '', '', '', subtotalEtapa],
      'FF1E3A5F', true, false, 0);

    // Agrupar por sub-etapa
    const subEtapas = [...new Set(etItens.map(i => i.sub_etapa || ''))];
    for (const sub of subEtapas) {
      const subItens = etItens.filter(i => (i.sub_etapa || '') === sub);
      if (sub) {
        const subtotalSub = subItens.reduce((a, i) => a + i.total, 0);
        addVisual(['S', '', sub, '', '', '', subtotalSub], 'FFD6E0F0', false, false, 1);
      }

      for (const item of subItens) {
        // Linha da composição
        addVisual(
          ['C', item.comp?.codigo || '', item.descricao, item.unidade,
           fmtN(item.qtd), fmtN(item.cu), fmtN(item.total)],
          'FFF5F8FF', false, false, 2
        );

        // Linhas dos insumos
        for (const ins of item.insumosItem) {
          if (ins.custo_item <= 0) continue;
          addVisual(
            ['I', ins.tipo, ins.descricao, ins.unidade,
             fmtN(ins.qtd_total), fmtN(ins.preco_unit), fmtN(ins.custo_item)],
            'FFEEF4FF', false, true, 3
          );
        }
      }
    }
  }

  // Linha de total geral
  const rowTotal = wsV.addRow(['', '', 'TOTAL GERAL (Direto)', '', '', '', fmtN(totalGeralV)]);
  rowTotal.eachCell({ includeEmpty: true }, (cell, ci) => {
    cell.border = bordaFull;
    cell.fill = cor('FF0F2A4A');
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    if (ci >= 5) { cell.numFmt = '#,##0.00'; cell.alignment = { horizontal: 'right' }; }
  });
  if (bdi > 0) {
    const rowBDI  = wsV.addRow(['', '', `Total com BDI (${bdi}%)`, '', '', '', fmtN(totalGeralV * (1 + bdi / 100))]);
    rowBDI.eachCell({ includeEmpty: true }, (cell, ci) => {
      cell.fill = cor('FF163352');
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      if (ci >= 5) { cell.numFmt = '#,##0.00'; cell.alignment = { horizontal: 'right' }; }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 2 — Dados Brutos (linha por insumo)
  // ══════════════════════════════════════════════════════════════════════════
  const wsBrutos = wb.addWorksheet('Dados Brutos');
  const colsBrutos = [
    'id_item_orcamento','etapa_codigo','nome_etapa','sub_etapa',
    'codigo_composicao','descricao_composicao','unidade_composicao',
    'quantidade_composicao','custo_unit_composicao','custo_total_composicao',
    'insumo_id','codigo_insumo','descricao_insumo','categoria_insumo','tipo_insumo',
    'unidade_insumo','coeficiente','qtd_total_insumo','preco_unit_insumo',
    'custo_total_insumo','custo_total_etapa',
  ];
  wsBrutos.addRow(colsBrutos).eachCell(c => {
    c.fill = cor('FF2D5986'); c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    c.border = bordaFull;
  });
  wsBrutos.columns = colsBrutos.map(() => ({ width: 20 }));

  const etapaSubtotais: Record<string, number> = {};
  for (const et of ETAPAS) {
    etapaSubtotais[et.codigo] = orcItens.filter(i => i.etapa_codigo === et.codigo).reduce((a, i) => a + i.total, 0);
  }

  for (const item of orcItens) {
    const etapa = ETAPAS.find(e => e.codigo === item.etapa_codigo);
    for (const ins of item.insumosItem) {
      const row = wsBrutos.addRow([
        item.id, item.etapa_codigo, etapa?.descricao || '', item.sub_etapa,
        item.comp?.codigo || '', item.descricao, item.unidade,
        fmtN(item.qtd), fmtN(item.cu), fmtN(item.total),
        ins.insumo_id, (insumoMap[ins.insumo_id]?.codigo || ''),
        ins.descricao, ins.categoria, ins.tipo,
        ins.unidade, ins.coeficiente, fmtN(ins.qtd_total),
        fmtN(ins.preco_unit), fmtN(ins.custo_item),
        fmtN(etapaSubtotais[item.etapa_codigo] || 0),
      ]);
      row.eachCell(c => { c.border = bordaFull; c.font = { size: 9 }; });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 3 — Curva ABC (insumos agregados por tipo)
  // ══════════════════════════════════════════════════════════════════════════

  // Agrega insumos de todos os itens
  const insAggMap = new Map<string, { descricao: string; categoria: string; tipo: string; unidade: string; qtd: number; custo: number; preco_unit: number }>();
  for (const item of orcItens) {
    for (const ins of item.insumosItem) {
      const ex = insAggMap.get(ins.insumo_id);
      if (ex) { ex.qtd += ins.qtd_total; ex.custo += ins.custo_item; }
      else insAggMap.set(ins.insumo_id, { descricao: ins.descricao, categoria: ins.categoria, tipo: ins.tipo, unidade: ins.unidade, qtd: ins.qtd_total, custo: ins.custo_item, preco_unit: ins.preco_unit });
    }
  }
  const insAgg = Array.from(insAggMap.values()).sort((a, b) => b.custo - a.custo);

  function criarAbaABC(nomeAba: string, lista: typeof insAgg) {
    const ws = wb.addWorksheet(nomeAba);
    const cols = ['#','Insumo','Categoria','Tipo','Unidade','Qtd Total','Preço Unit. (R$)','Custo Total (R$)','% Item','% Acum.','Classe ABC'];
    ws.addRow(cols).eachCell(c => {
      c.fill = cor('FF2D5986'); c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; c.border = bordaFull;
    });
    ws.columns = [{ width: 5 },{ width: 40 },{ width: 22 },{ width: 12 },{ width: 10 },{ width: 14 },{ width: 18 },{ width: 18 },{ width: 10 },{ width: 10 },{ width: 12 }];
    const total = lista.reduce((a, i) => a + i.custo, 0);
    let acum = 0;
    lista.forEach((ins, idx) => {
      acum += ins.custo;
      const pctItem = pct(ins.custo, total);
      const pctAcum = pct(acum, total);
      const classe = pctAcum <= 50 ? 'A' : pctAcum <= 80 ? 'B' : 'C';
      const fill = classe === 'A' ? 'FFFFF0F0' : classe === 'B' ? 'FFFFFBE8' : 'FFF0FFF0';
      const row = ws.addRow([idx + 1, ins.descricao, ins.categoria, ins.tipo, ins.unidade, fmtN(ins.qtd), fmtN(ins.preco_unit), fmtN(ins.custo), pctItem, pctAcum, classe]);
      row.eachCell((c, ci) => { c.border = bordaFull; c.font = { size: 9 }; c.fill = cor(fill); if (ci === 11) c.font = { ...c.font, bold: true }; if (ci >= 6) c.numFmt = '#,##0.00'; });
    });
    if (lista.length > 0) {
      const rowTot = ws.addRow(['', 'TOTAL', '', '', '', '', '', fmtN(total), '', '', '']);
      rowTot.eachCell((c, ci) => { c.border = bordaFull; c.font = { bold: true, size: 9 }; c.fill = cor('FFD6E0F0'); if (ci >= 6) c.numFmt = '#,##0.00'; });
    }
  }

  criarAbaABC('ABC - Material',     insAgg.filter(i => i.tipo === 'M'));
  criarAbaABC('ABC - Mão de Obra',  insAgg.filter(i => i.tipo === 'MO'));
  criarAbaABC('ABC - Equipamento',  insAgg.filter(i => i.tipo === 'E'));
  criarAbaABC('ABC - Geral',        insAgg);

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 4 — Por Categoria de Insumo
  // ══════════════════════════════════════════════════════════════════════════
  const wsCat = wb.addWorksheet('Por Categoria');
  wsCat.columns = [{ width: 35 },{ width: 12 },{ width: 14 },{ width: 20 },{ width: 16 },{ width: 16 }];
  wsCat.addRow(['Categoria','Tipo','Qtd Insumos','Custo Total (R$)','% Total','R$/m²']).eachCell(c => {
    c.fill = cor('FF2D5986'); c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; c.border = bordaFull;
  });

  const catMap = new Map<string, { tipo: string; custo: number; qtdInsumos: number }>();
  for (const ins of insAgg) {
    const ex = catMap.get(ins.categoria);
    if (ex) { ex.custo += ins.custo; ex.qtdInsumos++; }
    else catMap.set(ins.categoria, { tipo: ins.tipo, custo: ins.custo, qtdInsumos: 1 });
  }
  const cats = Array.from(catMap.entries()).sort((a, b) => b[1].custo - a[1].custo);
  cats.forEach(([cat, v]) => {
    const row = wsCat.addRow([
      cat, v.tipo, v.qtdInsumos, fmtN(v.custo),
      pct(v.custo, totalDireto),
      area > 0 ? fmtN(v.custo / area) : 'N/A',
    ]);
    row.eachCell((c, ci) => {
      c.border = bordaFull; c.font = { size: 9 };
      if (ci >= 4) c.numFmt = '#,##0.00';
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 5 — Resumo / Dashboard
  // ══════════════════════════════════════════════════════════════════════════
  const wsRes = wb.addWorksheet('Resumo Dashboard');
  wsRes.columns = [{ width: 35 },{ width: 22 },{ width: 16 },{ width: 16 }];

  function secHeader(titulo: string) {
    const r = wsRes.addRow([titulo]);
    r.getCell(1).fill  = cor('FF1E3A5F');
    r.getCell(1).font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    wsRes.mergeCells(`A${r.number}:D${r.number}`);
    wsRes.addRow([]);
  }
  function kv(label: string, valor: string | number, fmt = false) {
    const r = wsRes.addRow([label, valor]);
    r.getCell(1).font = { bold: true, size: 9 };
    r.getCell(2).font = { size: 9 };
    if (fmt && typeof valor === 'number') r.getCell(2).numFmt = '#,##0.00';
    r.eachCell(c => c.border = bordaFull);
  }

  secHeader('DADOS GERAIS DO ORÇAMENTO');
  kv('Título', orc.titulo);
  kv('Data exportação', new Date().toLocaleDateString('pt-BR'));
  kv('Área construída (m²)', area > 0 ? area : 'Não informada');
  kv('Total direto (R$)', fmtN(totalDireto), true);
  kv('BDI (%)', bdi);
  kv('Total com BDI (R$)', fmtN(totalDireto * (1 + bdi / 100)), true);
  area > 0 && kv('Custo total / m²', fmtN(totalDireto * (1 + bdi / 100) / area), true);
  wsRes.addRow([]);

  secHeader('BREAKDOWN POR TIPO');
  const bdTotal = { M: 0, MO: 0, E: 0, S: 0 };
  for (const item of orcItens) { for (const k of ['M','MO','E','S'] as const) bdTotal[k] += item.breakdown[k]; }
  const tipoLabel: Record<string, string> = { M: 'Material', MO: 'Mão de Obra', E: 'Equipamento', S: 'Serviço' };
  wsRes.addRow(['Tipo','Valor (R$)','% Total', area > 0 ? 'R$/m²' : '']).eachCell(c => { c.font = { bold: true, size: 9 }; c.fill = cor('FFD6E0F0'); c.border = bordaFull; });
  for (const [k, v] of Object.entries(bdTotal)) {
    if (v <= 0) continue;
    const row = wsRes.addRow([tipoLabel[k] || k, fmtN(v), pct(v, totalDireto), area > 0 ? fmtN(v / area) : '']);
    row.eachCell((c, ci) => { c.border = bordaFull; c.font = { size: 9 }; if (ci >= 2) c.numFmt = '#,##0.00'; });
  }
  wsRes.addRow([]);

  secHeader('CUSTO POR ETAPA');
  wsRes.addRow(['Etapa','Subtotal (R$)','% Total', area > 0 ? 'R$/m²' : '']).eachCell(c => { c.font = { bold: true, size: 9 }; c.fill = cor('FFD6E0F0'); c.border = bordaFull; });
  for (const etapa of ETAPAS) {
    const sub = orcItens.filter(i => i.etapa_codigo === etapa.codigo).reduce((a, i) => a + i.total, 0);
    if (sub <= 0) continue;
    const row = wsRes.addRow([etapa.descricao, fmtN(sub), pct(sub, totalDireto), area > 0 ? fmtN(sub / area) : '']);
    row.eachCell((c, ci) => { c.border = bordaFull; c.font = { size: 9 }; if (ci >= 2) c.numFmt = '#,##0.00'; });
  }
  wsRes.addRow([]);

  secHeader('CUSTO POR CATEGORIA DE INSUMO');
  wsRes.addRow(['Categoria','Custo (R$)','% Total', area > 0 ? 'R$/m²' : '']).eachCell(c => { c.font = { bold: true, size: 9 }; c.fill = cor('FFD6E0F0'); c.border = bordaFull; });
  for (const [cat, v] of cats) {
    const row = wsRes.addRow([cat, fmtN(v.custo), pct(v.custo, totalDireto), area > 0 ? fmtN(v.custo / area) : '']);
    row.eachCell((c, ci) => { c.border = bordaFull; c.font = { size: 9 }; if (ci >= 2) c.numFmt = '#,##0.00'; });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── Exportar Modelo de Gabarito (XLSX simples) ───────────────────────────────
async function exportarModelo(): Promise<Buffer> {
  const composicoes = await readSheet('COMPOSICOES');
  const itensComp   = await readSheet('ITENS_COMPOSICAO');
  const insumos     = await readSheet('INSUMOS');
  const insumoMap   = Object.fromEntries(insumos.map(i => [i.id, i]));

  const custoBase = (cid: string) =>
    itensComp
      .filter(i => i.composicao_id === cid)
      .reduce((a, i) => a + Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0), 0);

  const wb = XLSX.utils.book_new();

  // Aba 1 — Modelo de preenchimento
  const wsModelo = XLSX.utils.json_to_sheet([
    { 'Composição (nome ou código)': composicoes[0]?.descricao || 'Limpeza de Terreno', 'Quantidade': 1 },
    { 'Composição (nome ou código)': composicoes[1]?.descricao || 'Estaca C25 3 metros', 'Quantidade': 12 },
    { 'Composição (nome ou código)': composicoes[2]?.descricao || 'Chapisco', 'Quantidade': 200 },
  ]);
  XLSX.utils.book_append_sheet(wb, wsModelo, 'Itens (preencher aqui)');

  // Aba 2 — Referência de composições
  const wsRef = XLSX.utils.json_to_sheet(
    composicoes.map(c => ({
      'Código': c.codigo,
      'Nome da Composição': c.descricao,
      'Unidade': c.unidade_producao,
      'Custo Unit. (R$)': Number(custoBase(c.id).toFixed(2)),
      'Etapa': c.etapa_codigo,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsRef, 'Composições (referência)');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}

// ─── Exportar base (insumos / composicoes) ────────────────────────────────────
async function exportarBase(tipo: string): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  if (tipo === 'insumos' || tipo === 'base') {
    const insumos = await readSheet('INSUMOS');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insumos.map(i => ({
      ID: i.id, Código: i.codigo, Descrição: i.descricao,
      Unidade: i.unidade, 'Preço (R$)': Number(i.preco) || 0,
      Tipo: i.tipo, Categoria: i.categoria, Status: i.status,
    }))), 'Insumos');
  }
  if (tipo === 'composicoes' || tipo === 'base') {
    const composicoes = await readSheet('COMPOSICOES');
    const itensComp   = await readSheet('ITENS_COMPOSICAO');
    const insumos     = await readSheet('INSUMOS');
    const insumoMap   = Object.fromEntries(insumos.map(i => [i.id, i]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(composicoes.map(c => ({
      ID: c.id, Código: c.codigo, Descrição: c.descricao,
      'Unidade Produção': c.unidade_producao, Status: c.status,
    }))), 'Composições');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itensComp.map(i => ({
      ID: i.id, 'ID Composição': i.composicao_id, 'ID Insumo': i.insumo_id,
      Insumo: insumoMap[i.insumo_id]?.descricao || '',
      Coeficiente: Number(i.coeficiente) || 0, Unidade: i.unidade,
    }))), 'Itens_Composição');
  }
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ─── Handler principal ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'insumos';
    const orcamentoId = searchParams.get('id');

    let buffer: Buffer;
    let filename: string;

    if (tipo === 'orcamento' && orcamentoId) {
      buffer   = await exportarOrcamento(orcamentoId);
      filename = `orcamento_${orcamentoId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (tipo === 'modelo-orcamento') {
      buffer   = await exportarModelo();
      filename = `modelo_exportacao_orcamento.xlsx`;
    } else {
      buffer   = await exportarBase(tipo);
      filename = `${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[exportar]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
