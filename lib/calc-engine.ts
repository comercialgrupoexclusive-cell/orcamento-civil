/**
 * calc-engine.ts
 * Motor de cálculo paramétrico de quantitativos para obras civis.
 * Define grupos de parâmetros, templates de cálculo e fórmulas.
 */

import type {
  CalcGrupo, CalcTemplate, CalcItem, CalcParamsRaw, CalcVao,
  CalcPilarItem, CalcVigaIndItem, CalcLajeItem,
} from '@/lib/types';

// ─── Grupos de parâmetros ─────────────────────────────────────────────────────

export const CALC_GRUPOS: CalcGrupo[] = [
  {
    id: 'preliminares',
    nome: 'Serviços Preliminares',
    etapa_codigo: '01',
    cor: 'amber',
    emoji: '🏗️',
    descricao: 'Raspagem, marcação, tapumes, maquinário de limpeza',
  },
  {
    id: 'fundacoes',
    nome: 'Vigas de Fundação',
    etapa_codigo: '02',
    cor: 'blue',
    emoji: '🏠',
    descricao: 'Concreto, fôrma, aço longitudinal e estribos',
  },
  {
    id: 'alvenaria',
    nome: 'Alvenaria e Revestimento',
    etapa_codigo: '04',
    cor: 'orange',
    emoji: '🧱',
    descricao: 'Alvenaria, reboco, pintura, vergas e contravergas',
  },
  {
    id: 'pilares',
    nome: 'Pilares',
    etapa_codigo: '03',
    cor: 'green',
    emoji: '🏛️',
    descricao: 'Concreto e fôrma de pilares — adicione cada tipo com suas dimensões',
  },
  {
    id: 'vigas_ind',
    nome: 'Vigas Formas e Concreto',
    etapa_codigo: '03',
    cor: 'violet',
    emoji: '📐',
    descricao: 'Concreto e tábuas de fôrma — baldrame (2 faces) ou viga aérea (3 faces + escoras)',
  },
  {
    id: 'laje',
    nome: 'Laje',
    etapa_codigo: '03',
    cor: 'teal',
    emoji: '🟦',
    descricao: 'Área, concreto e escoras de lajes — por ambiente ou tipo',
  },
];

// ─── Templates de cálculo ─────────────────────────────────────────────────────

export const CALC_TEMPLATES: CalcTemplate[] = [
  // ── Serviços Preliminares ────────────────────────────────────────────────────
  {
    id: 'prelim_raspagem',
    ativo: true,
    nome: 'Raspagem e limpeza superficial',
    grupo_id: 'preliminares',
    grupo_nome: 'Serviços Preliminares',
    etapa_codigo: '01',
    sub_etapa: 'Serviços Preliminares',
    composicao_id: 'cmp-001',
    descricao: 'Raspagem e limpeza superficial do terreno',
    unidade: 'm²',
    formula: 'area_terreno',
    parametros: ['area_terreno'],
  },
  {
    id: 'prelim_marcacao',
    ativo: true,
    nome: 'Marcação de obra',
    grupo_id: 'preliminares',
    grupo_nome: 'Serviços Preliminares',
    etapa_codigo: '01',
    sub_etapa: 'Serviços Preliminares',
    composicao_id: 'cmp-002',
    descricao: 'Marcação de obra com gabarito',
    unidade: 'm²',
    formula: 'area_construida',
    parametros: ['area_construida'],
  },
  {
    id: 'prelim_tapumes',
    ativo: true,
    nome: 'Tapumes ecológicos (0,50 × 2,00 m)',
    grupo_id: 'preliminares',
    grupo_nome: 'Serviços Preliminares',
    etapa_codigo: '01',
    sub_etapa: 'Tapumes',
    composicao_id: 'cmp-003',
    descricao: 'Tapume ecológico 0,50 × 2,00 m — fechamento do canteiro',
    unidade: 'un',
    formula: 'Math.ceil(perimetro_terreno / 0.50)',
    parametros: ['perimetro_terreno'],
  },
  {
    id: 'prelim_retro',
    ativo: true,
    nome: 'Retroescavadeira — limpeza e escavação',
    grupo_id: 'preliminares',
    grupo_nome: 'Serviços Preliminares',
    etapa_codigo: '01',
    sub_etapa: 'Maquinário',
    composicao_id: 'cmp-004',
    descricao: 'Locação de retroescavadeira para limpeza do terreno',
    unidade: 'h',
    formula: 'Math.ceil(area_terreno / 150)',
    parametros: ['area_terreno'],
  },
  {
    id: 'prelim_cacamba',
    ativo: true,
    nome: 'Caçambas para entulho / vegetação',
    grupo_id: 'preliminares',
    grupo_nome: 'Serviços Preliminares',
    etapa_codigo: '01',
    sub_etapa: 'Serviços Preliminares',
    composicao_id: 'cmp-005',
    descricao: 'Caçambas estacionárias para remoção e descarte de vegetação',
    unidade: 'un',
    formula: 'Math.max(1, Math.ceil(area_terreno * 0.03))',
    parametros: ['area_terreno'],
  },

  // ── Vigas de Fundação ────────────────────────────────────────────────────────
  {
    id: 'fund_concreto',
    ativo: true,
    nome: 'Concreto para vigas de fundação',
    grupo_id: 'fundacoes',
    grupo_nome: 'Vigas de Fundação',
    etapa_codigo: '02',
    sub_etapa: 'Vigas de Fundação',
    composicao_id: 'cmp-006',
    descricao: 'Concreto usinado FCK 25 MPa lançado e vibrado — vigas baldrame',
    unidade: 'm³',
    formula: 'comp_vigas * secao_b * secao_h',
    parametros: ['comp_vigas', 'secao_b', 'secao_h'],
  },
  {
    id: 'fund_forma_m2',
    ativo: true,
    nome: 'Fôrma para vigas de fundação — área (m²)',
    grupo_id: 'fundacoes',
    grupo_nome: 'Vigas de Fundação',
    etapa_codigo: '02',
    sub_etapa: 'Vigas de Fundação',
    composicao_id: 'cmp-021',
    descricao: 'Fôrma de madeira para vigas de fundação (duas faces laterais)',
    unidade: 'm²',
    formula: '2 * comp_vigas * secao_h',
    parametros: ['comp_vigas', 'secao_h'],
  },
  {
    id: 'fund_tabuas',
    ativo: true,
    nome: 'Tábuas de pinus para fôrma (2,70 m)',
    grupo_id: 'fundacoes',
    grupo_nome: 'Vigas de Fundação',
    etapa_codigo: '02',
    sub_etapa: 'Vigas de Fundação',
    composicao_id: 'cmp-007',
    descricao: 'Tábuas de pinus 2,70 m para fôrma lateral de vigas de fundação',
    unidade: 'un',
    formula: 'Math.ceil((2 * comp_vigas * secao_h) / (tabua_larg * 2.70))',
    parametros: ['comp_vigas', 'secao_h', 'tabua_larg'],
  },
  {
    id: 'fund_aco_long',
    ativo: true,
    nome: 'Aço CA-50 longitudinal — barras 12 m',
    grupo_id: 'fundacoes',
    grupo_nome: 'Vigas de Fundação',
    etapa_codigo: '02',
    sub_etapa: 'Vigas de Fundação',
    composicao_id: 'cmp-009',
    descricao: 'Barras de aço CA-50 ø10 mm longitudinais (12 m) — vigas de fundação',
    unidade: 'barra',
    formula: 'Math.ceil(n_barras_long * comp_vigas * 1.10 / 12)',
    parametros: ['n_barras_long', 'comp_vigas'],
  },
  {
    id: 'fund_estribo',
    ativo: true,
    nome: 'Aço CA-60 estribos — barras 12 m',
    grupo_id: 'fundacoes',
    grupo_nome: 'Vigas de Fundação',
    etapa_codigo: '02',
    sub_etapa: 'Vigas de Fundação',
    composicao_id: 'cmp-010',
    descricao: 'Barras de aço CA-60 ø6.3 mm para dobramento de estribos (12 m)',
    unidade: 'barra',
    formula:
      'Math.ceil((Math.ceil(comp_vigas / esp_estribo) * (2 * secao_b + 2 * secao_h + 0.10)) / 12)',
    parametros: ['comp_vigas', 'esp_estribo', 'secao_b', 'secao_h'],
  },

  // ── Pilares ──────────────────────────────────────────────────────────────────
  {
    id: 'pilar_concreto',
    ativo: true,
    nome: 'Concreto para pilares',
    grupo_id: 'pilares',
    grupo_nome: 'Pilares',
    etapa_codigo: '03',
    sub_etapa: 'Pilares',
    composicao_id: 'cmp-011',
    descricao: 'Concreto usinado FCK 25 MPa lançado e vibrado — pilares',
    unidade: 'm³',
    formula: 'volume_concreto_pilares',
    parametros: ['volume_concreto_pilares'],
  },
  {
    id: 'pilar_forma',
    ativo: true,
    nome: 'Fôrma para pilares (m²)',
    grupo_id: 'pilares',
    grupo_nome: 'Pilares',
    etapa_codigo: '03',
    sub_etapa: 'Pilares',
    composicao_id: 'cmp-012',
    descricao: 'Fôrma de madeira para pilares — 4 faces',
    unidade: 'm²',
    formula: 'area_forma_pilares',
    parametros: ['area_forma_pilares'],
  },

  // ── Vigas Formas e Concreto ───────────────────────────────────────────────────
  {
    id: 'viga_ind_concreto',
    ativo: true,
    nome: 'Concreto para vigas',
    grupo_id: 'vigas_ind',
    grupo_nome: 'Vigas Formas e Concreto',
    etapa_codigo: '03',
    sub_etapa: 'Vigas',
    composicao_id: 'cmp-006',
    descricao: 'Concreto usinado FCK 25 MPa lançado e vibrado — vigas estruturais',
    unidade: 'm³',
    formula: 'volume_concreto_vigas_ind',
    parametros: ['volume_concreto_vigas_ind'],
  },
  {
    id: 'viga_tabuas_pinus',
    ativo: true,
    nome: 'Tábuas de pinus — fôrma lateral (2,70 m)',
    grupo_id: 'vigas_ind',
    grupo_nome: 'Vigas Formas e Concreto',
    etapa_codigo: '03',
    sub_etapa: 'Vigas',
    composicao_id: 'cmp-007',
    descricao: 'Tábuas de pinus 2,70 m para fôrma lateral das vigas (2 lados)',
    unidade: 'un',
    formula: 'tabuas_pinus_vigas',
    parametros: ['tabuas_pinus_vigas'],
  },
  {
    id: 'viga_tabuas_euclp',
    ativo: true,
    nome: 'Tábuas de eucalipto — fundo viga aérea (5,40 m)',
    grupo_id: 'vigas_ind',
    grupo_nome: 'Vigas Formas e Concreto',
    etapa_codigo: '03',
    sub_etapa: 'Vigas',
    composicao_id: 'cmp-008',
    descricao: 'Tábuas de eucalipto 5,40 m para fundo de vigas aéreas',
    unidade: 'un',
    formula: 'tabuas_euclp_vigas',
    parametros: ['tabuas_euclp_vigas'],
  },
  {
    id: 'viga_escoras_aerea',
    ativo: true,
    nome: 'Escoras — vigas aéreas',
    grupo_id: 'vigas_ind',
    grupo_nome: 'Vigas Formas e Concreto',
    etapa_codigo: '03',
    sub_etapa: 'Vigas',
    composicao_id: 'cmp-013',
    descricao: 'Escoras metálicas telescópicas para suporte de vigas aéreas',
    unidade: 'un',
    formula: 'escoras_vigas_f',
    parametros: ['escoras_vigas_f'],
  },

  // ── Laje ─────────────────────────────────────────────────────────────────────
  {
    id: 'laje_area',
    ativo: true,
    nome: 'Laje — armação e fôrma (m²)',
    grupo_id: 'laje',
    grupo_nome: 'Laje',
    etapa_codigo: '03',
    sub_etapa: 'Laje',
    composicao_id: 'cmp-015',
    descricao: 'Laje treliçada — armação, EPS e fôrma (excl. concreto)',
    unidade: 'm²',
    formula: 'area_lajes',
    parametros: ['area_lajes'],
  },
  {
    id: 'laje_concreto',
    ativo: true,
    nome: 'Concreto para lajes',
    grupo_id: 'laje',
    grupo_nome: 'Laje',
    etapa_codigo: '03',
    sub_etapa: 'Laje',
    composicao_id: 'cmp-014',
    descricao: 'Concreto usinado FCK 25 MPa lançado e vibrado — lajes',
    unidade: 'm³',
    formula: 'volume_concreto_lajes',
    parametros: ['volume_concreto_lajes'],
  },
  {
    id: 'laje_escoras',
    ativo: true,
    nome: 'Escoras para laje',
    grupo_id: 'laje',
    grupo_nome: 'Laje',
    etapa_codigo: '03',
    sub_etapa: 'Laje',
    composicao_id: 'cmp-013',
    descricao: 'Escoras metálicas telescópicas — 1 escora a cada 1,5 m²',
    unidade: 'un',
    formula: 'Math.ceil(area_lajes / 1.5)',
    parametros: ['area_lajes'],
  },

  // ── Alvenaria e Revestimento ─────────────────────────────────────────────────
  {
    id: 'alv_alvenaria',
    ativo: true,
    nome: 'Alvenaria de tijolo',
    grupo_id: 'alvenaria',
    grupo_nome: 'Alvenaria e Revestimento',
    etapa_codigo: '04',
    sub_etapa: 'Alvenaria',
    composicao_id: 'cmp-016',
    descricao: 'Alvenaria de tijolo furado — área líquida (descontados os vãos)',
    unidade: 'm²',
    formula: 'Math.max(0, comp_paredes * alt_paredes - area_vaos)',
    parametros: ['comp_paredes', 'alt_paredes', 'area_vaos'],
  },
  {
    id: 'alv_chapisco',
    ativo: true,
    nome: 'Chapisco e reboco',
    grupo_id: 'alvenaria',
    grupo_nome: 'Alvenaria e Revestimento',
    etapa_codigo: '09',
    sub_etapa: 'Revestimento',
    composicao_id: 'cmp-017',
    descricao: 'Chapisco + reboco paulista — 2 faces (descontados os vãos)',
    unidade: 'm²',
    formula: '2 * Math.max(0, comp_paredes * alt_paredes - area_vaos)',
    parametros: ['comp_paredes', 'alt_paredes', 'area_vaos'],
  },
  {
    id: 'alv_pintura',
    ativo: true,
    nome: 'Pintura (paredes)',
    grupo_id: 'alvenaria',
    grupo_nome: 'Alvenaria e Revestimento',
    etapa_codigo: '12',
    sub_etapa: 'Pintura',
    composicao_id: 'cmp-018',
    descricao: 'Pintura látex PVA — 2 demãos, 2 faces × área líquida de paredes',
    unidade: 'm²',
    formula: '2 * Math.max(0, comp_paredes * alt_paredes - area_vaos)',
    parametros: ['comp_paredes', 'alt_paredes', 'area_vaos'],
  },
  {
    id: 'alv_vergas',
    ativo: true,
    nome: 'Vergas (portas e janelas)',
    grupo_id: 'alvenaria',
    grupo_nome: 'Alvenaria e Revestimento',
    etapa_codigo: '04',
    sub_etapa: 'Vergas e Contravergas',
    composicao_id: 'cmp-019',
    descricao: 'Vergas pré-moldadas — largura do vão + 30 cm cada lado (transpasse)',
    unidade: 'm',
    formula: 'comp_vergas',
    parametros: ['comp_vergas'],
  },
  {
    id: 'alv_contravergas',
    ativo: true,
    nome: 'Contravergas (janelas)',
    grupo_id: 'alvenaria',
    grupo_nome: 'Alvenaria e Revestimento',
    etapa_codigo: '04',
    sub_etapa: 'Vergas e Contravergas',
    composicao_id: 'cmp-020',
    descricao: 'Contravergas pré-moldadas — largura da janela + 30 cm cada lado',
    unidade: 'm',
    formula: 'comp_contravergas',
    parametros: ['comp_contravergas'],
  },
];

// ─── Motor de cálculo ─────────────────────────────────────────────────────────

/** Avalia fórmula JS com escopo restrito aos parâmetros + Math */
export function avaliarFormula(
  formula: string,
  ctx: Record<string, number>,
): number {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      ...Object.keys(ctx),
      'Math',
      `"use strict"; return (${formula});`,
    ) as (...args: unknown[]) => number;
    const resultado = fn(...Object.values(ctx), Math);
    const n = Number(resultado);
    return isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0;
  } catch {
    return 0;
  }
}

/** Deriva parâmetros automáticos a partir das listas de entrada */
export function derivarParams(
  raw: Partial<CalcParamsRaw>,
  vaos: CalcVao[],
  pilares: CalcPilarItem[] = [],
  vigasInd: CalcVigaIndItem[] = [],
  lajes: CalcLajeItem[] = [],
): Partial<CalcParamsRaw> {
  // Alvenaria — vãos (qtd é multiplicador de cada vão)
  const area_vaos = vaos.reduce((s, v) => s + (v.qtd || 1) * (v.largura || 0) * (v.altura || 0), 0);
  const area_vaos_janelas = vaos
    .filter(v => v.tipo === 'janela')
    .reduce((s, v) => s + (v.qtd || 1) * (v.largura || 0) * (v.altura || 0), 0);
  const comp_vergas = vaos.reduce((s, v) => s + (v.qtd || 1) * ((v.largura || 0) + 0.60), 0);
  const comp_contravergas = vaos
    .filter(v => v.tipo === 'janela')
    .reduce((s, v) => s + (v.qtd || 1) * ((v.largura || 0) + 0.60), 0);

  // Pilares: volume = qtd × l1 × l2 × h; fôrma = qtd × 2(l1+l2) × h
  const volume_concreto_pilares = pilares.reduce((s, p) => s + p.qtd * p.l1 * p.l2 * p.h, 0);
  const area_forma_pilares = pilares.reduce((s, p) => s + p.qtd * 2 * (p.l1 + p.l2) * p.h, 0);

  // Vigas: comp = total de metros; volume = b × h × comp
  // Tábuas pinus (2 faces laterais): Math.ceil(comp × 2 / 2.70) por linha
  // Tábuas eucalipto (fundo): apenas vigas aéreas, Math.ceil(comp / 5.40)
  // Escoras: apenas vigas aéreas, Math.ceil(comp / esp_escoras)
  const volume_concreto_vigas_ind = vigasInd.reduce((s, v) => s + v.b * v.h * v.comp, 0);
  const tabuas_pinus_vigas = vigasInd.reduce(
    (s, v) => s + Math.ceil((v.comp || 0) * 2 / 2.70), 0,
  );
  const tabuas_euclp_vigas = vigasInd
    .filter(v => v.tipo === 'aerea')
    .reduce((s, v) => s + Math.ceil((v.comp || 0) / 5.40), 0);
  const escoras_vigas_f = vigasInd
    .filter(v => v.tipo === 'aerea')
    .reduce((s, v) => s + (v.esp_escoras > 0 ? Math.ceil((v.comp || 0) / v.esp_escoras) : 0), 0);

  // Lajes: área = qtd × comp × larg; volume = qtd × comp × larg × esp
  const area_lajes = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg, 0);
  const volume_concreto_lajes = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg * l.esp, 0);

  return {
    ...raw,
    area_vaos: Math.round(area_vaos * 100) / 100,
    area_vaos_janelas: Math.round(area_vaos_janelas * 100) / 100,
    comp_vergas: Math.round(comp_vergas * 100) / 100,
    comp_contravergas: Math.round(comp_contravergas * 100) / 100,
    volume_concreto_pilares: Math.round(volume_concreto_pilares * 1000) / 1000,
    area_forma_pilares: Math.round(area_forma_pilares * 100) / 100,
    volume_concreto_vigas_ind: Math.round(volume_concreto_vigas_ind * 1000) / 1000,
    tabuas_pinus_vigas,
    tabuas_euclp_vigas,
    escoras_vigas_f,
    area_lajes: Math.round(area_lajes * 100) / 100,
    volume_concreto_lajes: Math.round(volume_concreto_lajes * 1000) / 1000,
  };
}

/** Formata fórmula legível substituindo nomes de parâmetros pelos valores */
function formulaLegivel(
  formula: string,
  ctx: Record<string, number>,
  resultado: number,
  unidade: string,
): string {
  let legivel = formula;
  // Substitui nomes de parâmetros pelos valores (do maior para o menor nome para evitar substituições parciais)
  const keys = Object.keys(ctx).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const val = ctx[key];
    legivel = legivel.replaceAll(key, String(val));
  }
  // Remove "Math.ceil" → "⌈ ⌉" visualmente
  legivel = legivel
    .replace(/Math\.ceil\(([^)]+)\)/g, '⌈$1⌉')
    .replace(/Math\.max\(0,\s*/g, 'máx(0, ')
    .replace(/Math\.max\(1,\s*/g, 'máx(1, ');
  return `${legivel} = ${resultado} ${unidade}`;
}

/**
 * Calcula todos os quantitativos a partir dos parâmetros e lista de vãos.
 * Retorna um CalcItem por template ativo, incluindo apenas itens com
 * todos os parâmetros necessários preenchidos.
 */
export function calcularQuantitativos(
  rawParams: Partial<CalcParamsRaw>,
  vaos: CalcVao[],
  pilares: CalcPilarItem[] = [],
  vigasInd: CalcVigaIndItem[] = [],
  lajes: CalcLajeItem[] = [],
): CalcItem[] {
  const params = derivarParams(rawParams, vaos, pilares, vigasInd, lajes);

  return CALC_TEMPLATES.filter(t => t.ativo).map(template => {
    // Verifica se todos os parâmetros necessários estão presentes e > 0
    const ctx: Record<string, number> = {};
    let parametrosFaltando = false;

    for (const p of template.parametros) {
      const val = params[p];
      if (val === undefined || val === null || isNaN(val as number)) {
        parametrosFaltando = true;
        break;
      }
      ctx[p] = val as number;
    }

    const quantidade = parametrosFaltando ? 0 : avaliarFormula(template.formula, ctx);
    const incluir = !parametrosFaltando && quantidade > 0;

    return {
      template_id: template.id,
      nome: template.nome,
      grupo_id: template.grupo_id,
      grupo_nome: template.grupo_nome,
      etapa_codigo: template.etapa_codigo,
      sub_etapa: template.sub_etapa,
      composicao_id: template.composicao_id,
      descricao: template.descricao,
      unidade: template.unidade,
      quantidade,
      formula_legivel: incluir
        ? formulaLegivel(template.formula, ctx, quantidade, template.unidade)
        : '—',
      incluir,
    } satisfies CalcItem;
  });
}

/** Retorna um número formatado em pt-BR com casas decimais adequadas */
export function fmtQtd(n: number, unidade: string): string {
  const inteiros = ['un', 'barra', 'cx', 'sc', 'saco', 'rolo', 'pç', 'par', 'chapa', 'bd'];
  if (inteiros.includes(unidade)) return String(Math.ceil(n));
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}
