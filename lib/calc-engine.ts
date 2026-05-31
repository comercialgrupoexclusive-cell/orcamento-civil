/**
 * calc-engine.ts
 * Motor de cálculo paramétrico de quantitativos para obras civis.
 *
 * PRINCÍPIO: o usuário preenche poucos campos → o motor calcula a quantidade
 * de cada serviço e devolve já vinculada à COMPOSIÇÃO REAL do catálogo
 * (mesmos códigos do COMPOSICOES.json / Excel), de modo que o custo sai
 * automático (Σ coeficiente × preço dos insumos da composição).
 *
 * composicao_id segue o padrão `cmp-<codigo>` (ex.: código 4002 → cmp-4002,
 * código 2003.1 → cmp-2003.1).
 */

import type {
  CalcGrupo, CalcTemplate, CalcItem, CalcParamsRaw, CalcVao,
  CalcPilarItem, CalcVigaIndItem, CalcLajeItem, CalcEstacaItem, CalcAmbienteEle,
} from '@/lib/types';

// ─── Grupos de parâmetros (acordeões da UI) ───────────────────────────────────

export const CALC_GRUPOS: CalcGrupo[] = [
  { id: 'preliminares', nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', cor: 'amber',  emoji: '🏗️', descricao: 'Limpeza, placa, tapume, ligações provisórias, poste e hidrômetro' },
  { id: 'fundacoes',    nome: 'Fundação — Viga Baldrame',       etapa_codigo: '02', cor: 'blue',   emoji: '🏠', descricao: 'Gabarito, armadura, fôrma, concreto e contrapiso (por metro de baldrame)' },
  { id: 'estacas',      nome: 'Fundação Profunda — Estacas',    etapa_codigo: '02', cor: 'blue',   emoji: '⚓', descricao: 'Estacas por PROFUNDIDADE em metros (livre) + blocos de coroamento' },
  { id: 'laje',         nome: 'Laje',                           etapa_codigo: '03', cor: 'teal',   emoji: '🟦', descricao: 'Laje pré-moldada, fôrma de fechamento e concreto' },
  { id: 'pilares',      nome: 'Pilares (concreto moldado)',     etapa_codigo: '03', cor: 'green',  emoji: '🏛️', descricao: 'Concreto de pilares — adicione cada tipo com suas dimensões' },
  { id: 'vigas_ind',    nome: 'Vigas (concreto moldado)',       etapa_codigo: '03', cor: 'violet', emoji: '📐', descricao: 'Concreto de vigas estruturais — por metro' },
  { id: 'alvenaria',    nome: 'Alvenaria e Vergas',             etapa_codigo: '04', cor: 'orange', emoji: '🧱', descricao: 'Alvenaria (descontando vãos), vergas e contravergas' },
  { id: 'esquadrias',   nome: 'Esquadrias e Vidros',            etapa_codigo: '05', cor: 'amber',  emoji: '🚪', descricao: 'Portas e janelas — geradas automaticamente dos vãos' },
  { id: 'cobertura',    nome: 'Cobertura',                      etapa_codigo: '07', cor: 'orange', emoji: '🏚️', descricao: 'Madeiramento, telha, rufos e calhas' },
  { id: 'imperme',      nome: 'Impermeabilização',              etapa_codigo: '08', cor: 'blue',   emoji: '💧', descricao: 'Áreas molhadas' },
  { id: 'revest',       nome: 'Revestimentos Internos',         etapa_codigo: '09', cor: 'teal',   emoji: '🧱', descricao: 'Chapisco, reboco e ceramica de parede' },
  { id: 'forro',        nome: 'Forro',                          etapa_codigo: '10', cor: 'violet', emoji: '⬜', descricao: 'Forro de PVC / drywall' },
  { id: 'pintura',      nome: 'Pintura',                        etapa_codigo: '12', cor: 'green',  emoji: '🎨', descricao: 'Massa e pintura interna/externa e teto' },
  { id: 'pisos',        nome: 'Pisos e Contrapisos',            etapa_codigo: '13', cor: 'amber',  emoji: '🔲', descricao: 'Contrapiso de regularização e piso cerâmico' },
  { id: 'acabamento',   nome: 'Acabamentos',                    etapa_codigo: '14', cor: 'orange', emoji: '✨', descricao: 'Rodapés e soleiras' },
  { id: 'eletrica',     nome: 'Instalações Elétricas',          etapa_codigo: '15', cor: 'amber',  emoji: '💡', descricao: 'Pontos por ambiente — 3 tomadas + 1 luz por peça (editável)' },
  { id: 'hidraulica',   nome: 'Instalações Hidráulicas',        etapa_codigo: '16', cor: 'blue',   emoji: '🚿', descricao: 'Pontos de água, rede e reservatório' },
  { id: 'esgoto',       nome: 'Esgoto e Águas Pluviais',        etapa_codigo: '17', cor: 'teal',   emoji: '🕳️', descricao: 'Conexões, caixas de gordura, sifonada e inspeção' },
  { id: 'banheiro',     nome: 'Louças e Metais (Banheiro)',     etapa_codigo: '18', cor: 'violet', emoji: '🛁', descricao: 'Kit por banheiro: louças + metais' },
  { id: 'complementos', nome: 'Limpeza e Complementos',         etapa_codigo: '19', cor: 'green',  emoji: '🧹', descricao: 'Limpeza final da obra' },
];

// ─── Templates de cálculo (cada um vinculado a uma composição real) ────────────

export const CALC_TEMPLATES: CalcTemplate[] = [
  // ══ 01 · Serviços Preliminares e Gerais ══════════════════════════════════════
  { id: 'prelim_limpeza',   ativo: true, nome: 'Limpeza do terreno (raspagem)',       grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Serviços Preliminares', composicao_id: 'cmp-1000', descricao: 'Limpeza Terreno - Raspagem Superficial com Retroescavadeira', unidade: 'hr', formula: 'Math.max(0.5, area_terreno / 150)', parametros: ['area_terreno'] },
  { id: 'prelim_placa',     ativo: true, nome: 'Placa de obra e sinalização',          grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Serviços Preliminares', composicao_id: 'cmp-1002', descricao: 'Placa de Obra e Placas de Sinalização', unidade: 'un', formula: '1', parametros: ['area_construida'] },
  { id: 'prelim_tapume',    ativo: true, nome: 'Tapume ecológico (fechamento)',        grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Tapumes',              composicao_id: 'cmp-1003', descricao: 'Fechamento/Isolamento de Obra Tapume Ecológico 50x200', unidade: 'm', formula: 'perimetro_terreno', parametros: ['perimetro_terreno'] },
  { id: 'prelim_inst_hidro',ativo: true, nome: 'Instalação provisória hidrossanitária',grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Ligações Provisórias', composicao_id: 'cmp-1005', descricao: 'Instalação Provisória Hidrossanitário', unidade: 'un', formula: '1', parametros: ['area_construida'] },
  { id: 'prelim_inst_energ',ativo: true, nome: 'Instalação provisória de energia',     grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Ligações Provisórias', composicao_id: 'cmp-1006', descricao: 'Instalação Provisória Energia', unidade: 'un', formula: '1', parametros: ['area_construida'] },
  { id: 'prelim_poste',     ativo: true, nome: 'Poste padrão de entrada (bifásico)',   grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Ligações Provisórias', composicao_id: 'cmp-1010', descricao: 'Poste Padrão Entrada de Energia - 1 Medidor - Concreto - Bifásico', unidade: 'un', formula: '1', parametros: ['area_construida'] },
  { id: 'prelim_hidrometro',ativo: true, nome: 'Pedestal de hidrômetro',              grupo_id: 'preliminares', grupo_nome: 'Serviços Preliminares e Gerais', etapa_codigo: '01', sub_etapa: 'Ligações Provisórias', composicao_id: 'cmp-1011', descricao: 'Pedestal Hidrômetro Padrão Concessionária', unidade: 'un', formula: '1', parametros: ['area_construida'] },

  // ══ 02 · Fundação — Viga Baldrame (por metro de baldrame) ════════════════════
  { id: 'fund_gabarito',   ativo: true, nome: 'Locação de obra (gabarito)',           grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Locação', composicao_id: 'cmp-2000', descricao: 'Locação de Obra - Gabarito', unidade: 'm', formula: 'comp_vigas', parametros: ['comp_vigas'] },
  { id: 'fund_armadura',   ativo: true, nome: 'Armadura da viga baldrame',            grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Viga Baldrame', composicao_id: 'cmp-2003.1', descricao: 'Armadura Viga Baldrame 15x30 4 Barras 8mm', unidade: 'm', formula: 'comp_vigas', parametros: ['comp_vigas'] },
  { id: 'fund_forma',      ativo: true, nome: 'Fôrma da viga baldrame',               grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Viga Baldrame', composicao_id: 'cmp-2003.2', descricao: 'Forma Viga Baldrame 30cm Altura 1 Tábua 30cm', unidade: 'm', formula: 'comp_vigas', parametros: ['comp_vigas'] },
  { id: 'fund_travamento', ativo: true, nome: 'Travamento/escoramento de fôrmas',     grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Viga Baldrame', composicao_id: 'cmp-2003.3', descricao: 'Travamento e Escoramento de Formas de Baldrame', unidade: 'm', formula: 'comp_vigas', parametros: ['comp_vigas'] },
  { id: 'fund_concreto',   ativo: true, nome: 'Concreto da viga baldrame',            grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Viga Baldrame', composicao_id: 'cmp-2002.3', descricao: 'Concreto Manual em Obra Preparo em Betoneira', unidade: 'm³', formula: 'comp_vigas * secao_b * secao_h', parametros: ['comp_vigas', 'secao_b', 'secao_h'] },
  { id: 'fund_reaterro',   ativo: true, nome: 'Reaterro e apiloamento',               grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Movimento de Terra', composicao_id: 'cmp-2004', descricao: 'Reaterro e Apiloamento', unidade: 'm²', formula: 'area_construida', parametros: ['area_construida'] },
  { id: 'fund_imperm',     ativo: true, nome: 'Impermeabilização de fundações',       grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Impermeabilização', composicao_id: 'cmp-2005', descricao: 'Impermeabilização de Fundações', unidade: 'm²', formula: 'comp_vigas', parametros: ['comp_vigas'] },
  { id: 'fund_contrapiso', ativo: true, nome: 'Contrapiso de concreto armado 5cm',    grupo_id: 'fundacoes', grupo_nome: 'Fundação — Viga Baldrame', etapa_codigo: '02', sub_etapa: 'Contrapiso', composicao_id: 'cmp-2006', descricao: 'Contrapiso Concreto Armado 5cm', unidade: 'm²', formula: 'area_construida', parametros: ['area_construida'] },

  // ══ 02b · Fundação Profunda — Estacas (por profundidade) ═════════════════════
  { id: 'estaca_exec',  ativo: true, nome: 'Estaca C25 (perfuração + armadura + concreto)', grupo_id: 'estacas', grupo_nome: 'Fundação Profunda — Estacas', etapa_codigo: '02', sub_etapa: 'Estacas', composicao_id: 'cmp-2001', descricao: 'Estaca C25 - Perfuração, Armaduras e Concretagem (por 3 m equiv.)', unidade: 'un', formula: 'estacas_equiv', parametros: ['estacas_equiv'] },
  { id: 'estaca_bloco', ativo: true, nome: 'Bloco de coroamento sobre estaca',              grupo_id: 'estacas', grupo_nome: 'Fundação Profunda — Estacas', etapa_codigo: '02', sub_etapa: 'Blocos', composicao_id: 'cmp-2002', descricao: 'Blocos Sobre 1 Estaca 55x55x40', unidade: 'un', formula: 'n_blocos_estaca', parametros: ['n_blocos_estaca'] },

  // ══ 03 · Laje ════════════════════════════════════════════════════════════════
  { id: 'laje_montagem', ativo: true, nome: 'Laje pré-moldada (tela + escoramento)', grupo_id: 'laje', grupo_nome: 'Laje', etapa_codigo: '03', sub_etapa: 'Laje', composicao_id: 'cmp-3007', descricao: 'Laje Pré Moldada - Tela + Escoramento', unidade: 'm²', formula: 'area_lajes', parametros: ['area_lajes'] },
  { id: 'laje_forma',    ativo: true, nome: 'Fôrma de fechamento da laje',            grupo_id: 'laje', grupo_nome: 'Laje', etapa_codigo: '03', sub_etapa: 'Laje', composicao_id: 'cmp-3008', descricao: 'Formas - Fechamento de Laje H=15cm', unidade: 'm', formula: 'comp_forma_laje', parametros: ['comp_forma_laje'] },
  { id: 'laje_concreto', ativo: true, nome: 'Concreto usinado FCK 25 — laje',         grupo_id: 'laje', grupo_nome: 'Laje', etapa_codigo: '03', sub_etapa: 'Laje', composicao_id: 'cmp-3009', descricao: 'Concreto Usinado FCK 25', unidade: 'm³', formula: 'volume_concreto_lajes', parametros: ['volume_concreto_lajes'] },

  // ══ 03 · Pilares e Vigas moldados (concreto via cmp-3009) ════════════════════
  { id: 'pilar_concreto', ativo: true, nome: 'Concreto de pilares (FCK 25)', grupo_id: 'pilares', grupo_nome: 'Pilares (concreto moldado)', etapa_codigo: '03', sub_etapa: 'Pilares', composicao_id: 'cmp-3009', descricao: 'Concreto Usinado FCK 25 — pilares', unidade: 'm³', formula: 'volume_concreto_pilares', parametros: ['volume_concreto_pilares'] },
  { id: 'viga_concreto',  ativo: true, nome: 'Concreto de vigas (FCK 25)',   grupo_id: 'vigas_ind', grupo_nome: 'Vigas (concreto moldado)', etapa_codigo: '03', sub_etapa: 'Vigas', composicao_id: 'cmp-3009', descricao: 'Concreto Usinado FCK 25 — vigas', unidade: 'm³', formula: 'volume_concreto_vigas_ind', parametros: ['volume_concreto_vigas_ind'] },

  // ══ 04 · Alvenaria e Vergas ══════════════════════════════════════════════════
  { id: 'alv_estrutural', ativo: true, nome: 'Alvenaria estrutural (bloco furo horizontal)', grupo_id: 'alvenaria', grupo_nome: 'Alvenaria e Vergas', etapa_codigo: '04', sub_etapa: 'Alvenaria', composicao_id: 'cmp-4002', descricao: 'Alvenaria Estrutural em Blocos Cerâmicos com Furos Horizontais', unidade: 'm²', formula: 'tipo_alv == 2 ? Math.max(0, comp_paredes * alt_paredes - area_vaos) : 0', parametros: ['tipo_alv', 'comp_paredes', 'alt_paredes', 'area_vaos'] },
  { id: 'alv_vedacao',    ativo: true, nome: 'Alvenaria de vedação (bloco furo vertical)',    grupo_id: 'alvenaria', grupo_nome: 'Alvenaria e Vergas', etapa_codigo: '04', sub_etapa: 'Alvenaria', composicao_id: 'cmp-4000', descricao: 'Alvenaria de Vedação em Blocos Cerâmicos com Furos Verticais', unidade: 'm²', formula: 'tipo_alv == 1 ? Math.max(0, comp_paredes * alt_paredes - area_vaos) : 0', parametros: ['tipo_alv', 'comp_paredes', 'alt_paredes', 'area_vaos'] },
  { id: 'alv_verga',      ativo: true, nome: 'Vergas e contravergas',                          grupo_id: 'alvenaria', grupo_nome: 'Alvenaria e Vergas', etapa_codigo: '04', sub_etapa: 'Vergas e Contravergas', composicao_id: 'cmp-4001', descricao: 'Verga e Contraverga em Canela Cerâmica', unidade: 'm', formula: 'comp_vergas + comp_contravergas', parametros: ['comp_vergas', 'comp_contravergas'] },

  // ══ 05 · Esquadrias (geradas dos vãos) ═══════════════════════════════════════
  { id: 'esq_porta',  ativo: true, nome: 'Portas de madeira (kit completo)',      grupo_id: 'esquadrias', grupo_nome: 'Esquadrias e Vidros', etapa_codigo: '05', sub_etapa: 'Portas',  composicao_id: 'cmp-5006', descricao: 'Porta de Madeira Popular - Kit Completo (0.80x2.10m)', unidade: 'un', formula: 'n_portas', parametros: ['n_portas'] },
  { id: 'esq_janela', ativo: true, nome: 'Janelas de alumínio c/ vidro',          grupo_id: 'esquadrias', grupo_nome: 'Esquadrias e Vidros', etapa_codigo: '05', sub_etapa: 'Janelas', composicao_id: 'cmp-5004', descricao: 'Esquadria de Alumínio Linha Popular c/ Vidro 4mm - Janela', unidade: 'm²', formula: 'area_vaos_janelas', parametros: ['area_vaos_janelas'] },

  // ══ 07 · Cobertura ═══════════════════════════════════════════════════════════
  { id: 'cob_madeira_barro', ativo: true, nome: 'Madeiramento (telha de barro)', grupo_id: 'cobertura', grupo_nome: 'Cobertura', etapa_codigo: '07', sub_etapa: 'Madeiramento', composicao_id: 'cmp-7004', descricao: 'Telhado Colonial - Trama de Madeira para Telha de Barro Cerâmica', unidade: 'm²', formula: 'tipo_telha == 1 ? area_telhado : 0', parametros: ['tipo_telha', 'area_telhado'] },
  { id: 'cob_telha_barro',   ativo: true, nome: 'Telhamento (telha de barro)',    grupo_id: 'cobertura', grupo_nome: 'Cobertura', etapa_codigo: '07', sub_etapa: 'Telhamento',   composicao_id: 'cmp-7005', descricao: 'Telhado Colonial Natural - Telhamento com Telha de Barro Cerâmica', unidade: 'm²', formula: 'tipo_telha == 1 ? area_telhado : 0', parametros: ['tipo_telha', 'area_telhado'] },
  { id: 'cob_madeira_aluz',  ativo: true, nome: 'Madeiramento (telha aluzinco)',  grupo_id: 'cobertura', grupo_nome: 'Cobertura', etapa_codigo: '07', sub_etapa: 'Madeiramento', composicao_id: 'cmp-7000', descricao: 'Telhado Aluzinco - Trama de Madeira (Madeiramento)', unidade: 'm²', formula: 'tipo_telha == 2 ? area_telhado : 0', parametros: ['tipo_telha', 'area_telhado'] },
  { id: 'cob_telha_aluz',    ativo: true, nome: 'Telhamento (telha aluzinco)',    grupo_id: 'cobertura', grupo_nome: 'Cobertura', etapa_codigo: '07', sub_etapa: 'Telhamento',   composicao_id: 'cmp-7001', descricao: 'Telhado Aluzinco - Telhamento com Telha de Aluzinco', unidade: 'm', formula: 'tipo_telha == 2 ? area_telhado : 0', parametros: ['tipo_telha', 'area_telhado'] },
  { id: 'cob_rufo',          ativo: true, nome: 'Rufos e algerosas',              grupo_id: 'cobertura', grupo_nome: 'Cobertura', etapa_codigo: '07', sub_etapa: 'Funilaria',    composicao_id: 'cmp-7002', descricao: 'Funilaria - Rufos e Algerosas', unidade: 'm', formula: 'comp_rufos', parametros: ['comp_rufos'] },
  { id: 'cob_calha',         ativo: true, nome: 'Calhas',                         grupo_id: 'cobertura', grupo_nome: 'Cobertura', etapa_codigo: '07', sub_etapa: 'Funilaria',    composicao_id: 'cmp-7003', descricao: 'Funilaria - Calhas', unidade: 'm', formula: 'comp_calhas', parametros: ['comp_calhas'] },

  // ══ 08 · Impermeabilização ═══════════════════════════════════════════════════
  { id: 'imp_molhada', ativo: true, nome: 'Impermeabilização de áreas molhadas', grupo_id: 'imperme', grupo_nome: 'Impermeabilização', etapa_codigo: '08', sub_etapa: 'Áreas Molhadas', composicao_id: 'cmp-8001', descricao: 'Impermeabilização de Piso e Paredes - Áreas Molhadas H=1,80m', unidade: 'm²', formula: 'area_imper_molhada', parametros: ['area_imper_molhada'] },

  // ══ 09 · Revestimentos Internos ══════════════════════════════════════════════
  { id: 'rev_chapisco', ativo: true, nome: 'Chapisco',                       grupo_id: 'revest', grupo_nome: 'Revestimentos Internos', etapa_codigo: '09', sub_etapa: 'Revestimento', composicao_id: 'cmp-9000', descricao: 'Chapisco', unidade: 'm2', formula: 'area_revest_interno', parametros: ['area_revest_interno'] },
  { id: 'rev_reboco',   ativo: true, nome: 'Emboco / reboco',               grupo_id: 'revest', grupo_nome: 'Revestimentos Internos', etapa_codigo: '09', sub_etapa: 'Revestimento', composicao_id: 'cmp-9001', descricao: 'Emboco/Reboco', unidade: 'm2', formula: 'area_revest_interno', parametros: ['area_revest_interno'] },
  { id: 'rev_ceramica', ativo: true, nome: 'Ceramica de parede (areas molhadas)', grupo_id: 'revest', grupo_nome: 'Revestimentos Internos', etapa_codigo: '09', sub_etapa: 'Ceramica', composicao_id: 'cmp-9004', descricao: 'Revestimento Ceramico em Paredes - Ceramica Classe A', unidade: 'm2', formula: 'area_ceramica_parede', parametros: ['area_ceramica_parede'] },

  // ══ 10 · Forro ═══════════════════════════════════════════════════════════════
  { id: 'forro_pvc', ativo: true, nome: 'Forro de PVC + trama de madeira', grupo_id: 'forro', grupo_nome: 'Forro', etapa_codigo: '10', sub_etapa: 'Forro', composicao_id: 'cmp-10002', descricao: 'Forro de PVC e Trama de Madeira', unidade: 'm²', formula: 'area_forro', parametros: ['area_forro'] },

  // ══ 12 · Pintura ═════════════════════════════════════════════════════════════
  { id: 'pint_massa_int', ativo: true, nome: 'Massa fina interna',             grupo_id: 'pintura', grupo_nome: 'Pintura', etapa_codigo: '12', sub_etapa: 'Pintura Interna', composicao_id: 'cmp-12002', descricao: 'Massa Fina de Acabamento Interna', unidade: 'm²', formula: 'area_pintura_interna', parametros: ['area_pintura_interna'] },
  { id: 'pint_int',       ativo: true, nome: 'Pintura acrílica interna',       grupo_id: 'pintura', grupo_nome: 'Pintura', etapa_codigo: '12', sub_etapa: 'Pintura Interna', composicao_id: 'cmp-12000', descricao: 'Pintura Acrílica Sobre Paredes - Interno', unidade: 'm²', formula: 'area_pintura_interna', parametros: ['area_pintura_interna'] },
  { id: 'pint_teto',      ativo: true, nome: 'Pintura de teto/forro',          grupo_id: 'pintura', grupo_nome: 'Pintura', etapa_codigo: '12', sub_etapa: 'Pintura Teto', composicao_id: 'cmp-12005', descricao: 'Pintura Acrílica em Teto - Forro', unidade: 'm²', formula: 'area_forro', parametros: ['area_forro'] },
  { id: 'pint_massa_ext', ativo: true, nome: 'Massa fina externa',             grupo_id: 'pintura', grupo_nome: 'Pintura', etapa_codigo: '12', sub_etapa: 'Pintura Externa', composicao_id: 'cmp-12003', descricao: 'Massa Fina de Acabamento Externa', unidade: 'm²', formula: 'area_pintura_externa', parametros: ['area_pintura_externa'] },
  { id: 'pint_ext',       ativo: true, nome: 'Pintura acrílica externa',       grupo_id: 'pintura', grupo_nome: 'Pintura', etapa_codigo: '12', sub_etapa: 'Pintura Externa', composicao_id: 'cmp-12001', descricao: 'Pintura Emborrachada Acrílica Sobre Paredes - Externo', unidade: 'm²', formula: 'area_pintura_externa', parametros: ['area_pintura_externa'] },

  // ══ 13 · Pisos e Contrapisos ═════════════════════════════════════════════════
  { id: 'piso_contrapiso', ativo: true, nome: 'Contrapiso de regularização', grupo_id: 'pisos', grupo_nome: 'Pisos e Contrapisos', etapa_codigo: '13', sub_etapa: 'Contrapiso', composicao_id: 'cmp-13000', descricao: 'Contrapiso de Regularização (Cimento e Areia)', unidade: 'm²', formula: 'area_piso', parametros: ['area_piso'] },
  { id: 'piso_ceramica',   ativo: true, nome: 'Piso cerâmico',                grupo_id: 'pisos', grupo_nome: 'Pisos e Contrapisos', etapa_codigo: '13', sub_etapa: 'Piso', composicao_id: 'cmp-13012', descricao: 'Revestimento Cerâmico em Pisos - Cerâmica Classe A', unidade: 'm²', formula: 'area_piso', parametros: ['area_piso'] },

  // ══ 14 · Acabamentos ═════════════════════════════════════════════════════════
  { id: 'acab_rodape', ativo: true, nome: 'Rodapé (poliestireno 7cm)', grupo_id: 'acabamento', grupo_nome: 'Acabamentos', etapa_codigo: '14', sub_etapa: 'Rodapés', composicao_id: 'cmp-14002', descricao: 'Rodapé - Poliestireno 7cm', unidade: 'm', formula: 'comp_rodape', parametros: ['comp_rodape'] },

  // ══ 15 · Instalações Elétricas (somatório dos ambientes) ═════════════════════
  { id: 'ele_qd',          ativo: true, nome: 'Quadro de distribuição (QD)',   grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Quadro', composicao_id: 'cmp-15005', descricao: 'QD - Quadro de Distribuição', unidade: 'un', formula: '1', parametros: ['ele_tomada_simples'] },
  { id: 'ele_aterramento', ativo: true, nome: 'Aterramento (haste)',           grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Aterramento', composicao_id: 'cmp-15006', descricao: 'Balde e Haste Aterramento', unidade: 'un', formula: '1', parametros: ['ele_tomada_simples'] },
  { id: 'ele_tomada_simples', ativo: true, nome: 'Tomadas simples',            grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Tomadas', composicao_id: 'cmp-15009', descricao: 'Tomada Simples - CJt Montado e Enfiação', unidade: 'un', formula: 'ele_tomada_simples', parametros: ['ele_tomada_simples'] },
  { id: 'ele_tomada_dupla',   ativo: true, nome: 'Tomadas duplas (4mm)',       grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Tomadas', composicao_id: 'cmp-15011', descricao: 'Tomada Dupla - CJt Montado e Enfiação Cabo 4mm', unidade: 'un', formula: 'ele_tomada_dupla', parametros: ['ele_tomada_dupla'] },
  { id: 'ele_interruptor',    ativo: true, nome: 'Interruptores simples',      grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Interruptores', composicao_id: 'cmp-15002', descricao: 'Interruptor Simples - CJt Montado e Enfiação', unidade: 'un', formula: 'ele_interruptor', parametros: ['ele_interruptor'] },
  { id: 'ele_luminaria',      ativo: true, nome: 'Pontos de luz (luminária LED)', grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Iluminação', composicao_id: 'cmp-15004', descricao: 'Luminária LED 18W - Cjt e Enfiação', unidade: 'un', formula: 'ele_luminaria', parametros: ['ele_luminaria'] },
  { id: 'ele_chuveiro',       ativo: true, nome: 'Pontos de chuveiro (6mm)',   grupo_id: 'eletrica', grupo_nome: 'Instalações Elétricas', etapa_codigo: '15', sub_etapa: 'Chuveiro', composicao_id: 'cmp-15013', descricao: 'Ponto Chuveiro - CJt Tampa Cega e Enfiação Cabo 6mm', unidade: 'un', formula: 'ele_chuveiro', parametros: ['ele_chuveiro'] },

  // ══ 16 · Instalações Hidráulicas ═════════════════════════════════════════════
  { id: 'hid_ponto', ativo: true, nome: 'Pontos de água fria',     grupo_id: 'hidraulica', grupo_nome: 'Instalações Hidráulicas', etapa_codigo: '16', sub_etapa: 'Pontos', composicao_id: 'cmp-16000', descricao: 'Conexões para Água Fria - Ponto Hidráulico', unidade: 'un', formula: 'n_pontos_agua', parametros: ['n_pontos_agua'] },
  { id: 'hid_rede',  ativo: true, nome: 'Rede de água fria (tubo 25mm)', grupo_id: 'hidraulica', grupo_nome: 'Instalações Hidráulicas', etapa_codigo: '16', sub_etapa: 'Rede', composicao_id: 'cmp-16006', descricao: 'Rede Hidráulica - Tubos PVC Água Fria 25mm por metro', unidade: 'm', formula: 'metros_rede_agua', parametros: ['metros_rede_agua'] },
  { id: 'hid_reserv',ativo: true, nome: 'Reservatório de água 1000L', grupo_id: 'hidraulica', grupo_nome: 'Instalações Hidráulicas', etapa_codigo: '16', sub_etapa: 'Reservatório', composicao_id: 'cmp-16005', descricao: 'Reservatório Água 1000L', unidade: 'un', formula: '1', parametros: ['n_pontos_agua'] },

  // ══ 17 · Esgoto e Águas Pluviais ═════════════════════════════════════════════
  { id: 'esg_conexoes', ativo: true, nome: 'Conexões de esgoto/pluvial', grupo_id: 'esgoto', grupo_nome: 'Esgoto e Águas Pluviais', etapa_codigo: '17', sub_etapa: 'Conexões', composicao_id: 'cmp-17001', descricao: 'Conexões para Esgoto/Pluvial', unidade: 'un', formula: 'n_pontos_esgoto', parametros: ['n_pontos_esgoto'] },
  { id: 'esg_gordura',  ativo: true, nome: 'Caixa de gordura',         grupo_id: 'esgoto', grupo_nome: 'Esgoto e Águas Pluviais', etapa_codigo: '17', sub_etapa: 'Caixas', composicao_id: 'cmp-17003', descricao: 'Caixa de Gordura', unidade: 'un', formula: '1', parametros: ['n_pontos_esgoto'] },
  { id: 'esg_sifonada', ativo: true, nome: 'Caixa sifonada',          grupo_id: 'esgoto', grupo_nome: 'Esgoto e Águas Pluviais', etapa_codigo: '17', sub_etapa: 'Caixas', composicao_id: 'cmp-17004', descricao: 'Caixa Sifonada Pvc 150X150X50Mm Com Grelha Branca', unidade: 'un', formula: 'n_caixa_sifonada', parametros: ['n_caixa_sifonada'] },
  { id: 'esg_inspecao', ativo: true, nome: 'Caixa de inspeção',       grupo_id: 'esgoto', grupo_nome: 'Esgoto e Águas Pluviais', etapa_codigo: '17', sub_etapa: 'Caixas', composicao_id: 'cmp-17006', descricao: 'Caixa de inspeção com tampa - 50x50x50', unidade: 'un', formula: 'n_caixa_inspecao', parametros: ['n_caixa_inspecao'] },

  // ══ 18 · Louças e Metais (kit por banheiro) ══════════════════════════════════
  { id: 'ban_loucas', ativo: true, nome: 'Louças (bacia + lavatório + acessórios)', grupo_id: 'banheiro', grupo_nome: 'Louças e Metais (Banheiro)', etapa_codigo: '18', sub_etapa: 'Louças', composicao_id: 'cmp-18000', descricao: 'Louças - Bacia Sanitária Caixa Acoplada, Lavatório e Acessórios', unidade: 'un', formula: 'n_banheiros', parametros: ['n_banheiros'] },
  { id: 'ban_metais', ativo: true, nome: 'Metais (torneiras, registros, chuveiro)',  grupo_id: 'banheiro', grupo_nome: 'Louças e Metais (Banheiro)', etapa_codigo: '18', sub_etapa: 'Metais', composicao_id: 'cmp-18001', descricao: 'Metais', unidade: 'un', formula: 'n_banheiros', parametros: ['n_banheiros'] },

  // ══ 19 · Limpeza e Complementos ══════════════════════════════════════════════
  { id: 'comp_limpeza', ativo: true, nome: 'Limpeza final da obra', grupo_id: 'complementos', grupo_nome: 'Limpeza e Complementos', etapa_codigo: '19', sub_etapa: 'Limpeza', composicao_id: 'cmp-19001', descricao: 'Produtos de Limpeza Final', unidade: 'un', formula: '1', parametros: ['area_construida'] },
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

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Deriva parâmetros automáticos a partir das listas de entrada */
export function derivarParams(
  raw: Partial<CalcParamsRaw>,
  vaos: CalcVao[],
  pilares: CalcPilarItem[] = [],
  vigasInd: CalcVigaIndItem[] = [],
  lajes: CalcLajeItem[] = [],
  estacas: CalcEstacaItem[] = [],
  ambientesEle: CalcAmbienteEle[] = [],
): Partial<CalcParamsRaw> {
  // Vãos (qtd é multiplicador de cada vão)
  const area_vaos = vaos.reduce((s, v) => s + (v.qtd || 1) * (v.largura || 0) * (v.altura || 0), 0);
  const area_vaos_janelas = vaos.filter(v => v.tipo === 'janela')
    .reduce((s, v) => s + (v.qtd || 1) * (v.largura || 0) * (v.altura || 0), 0);
  const comp_vergas = vaos.reduce((s, v) => s + (v.qtd || 1) * ((v.largura || 0) + 0.60), 0);
  const comp_contravergas = vaos.filter(v => v.tipo === 'janela')
    .reduce((s, v) => s + (v.qtd || 1) * ((v.largura || 0) + 0.60), 0);
  const n_portas = vaos.filter(v => v.tipo === 'porta').reduce((s, v) => s + (v.qtd || 1), 0);

  // Pilares / vigas / lajes
  const volume_concreto_pilares = pilares.reduce((s, p) => s + p.qtd * p.l1 * p.l2 * p.h, 0);
  const area_forma_pilares = pilares.reduce((s, p) => s + p.qtd * 2 * (p.l1 + p.l2) * p.h, 0);
  const volume_concreto_vigas_ind = vigasInd.reduce((s, v) => s + v.b * v.h * v.comp, 0);
  const tabuas_pinus_vigas = vigasInd.reduce((s, v) => s + Math.ceil((v.comp || 0) * 2 / 2.70), 0);
  const tabuas_euclp_vigas = vigasInd.filter(v => v.tipo === 'aerea').reduce((s, v) => s + Math.ceil((v.comp || 0) / 5.40), 0);
  const escoras_vigas_f = vigasInd.filter(v => v.tipo === 'aerea').reduce((s, v) => s + (v.esp_escoras > 0 ? Math.ceil((v.comp || 0) / v.esp_escoras) : 0), 0);
  const area_lajes = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg, 0);
  const volume_concreto_lajes = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg * l.esp, 0);
  const comp_forma_laje = lajes.reduce((s, l) => s + l.qtd * 2 * (l.comp + l.larg), 0);

  // Estacas: custo linear por metro → equivalente em "estacas de 3 m"
  const estacas_equiv = estacas.reduce((s, e) => s + (e.qtd || 0) * (e.prof || 0) / 3, 0);
  const n_blocos_estaca = estacas.reduce((s, e) => s + (e.blocos || 0), 0);

  // Elétrica: somatório dos ambientes
  const ele_tomada_simples = ambientesEle.reduce((s, a) => s + (a.tomadas || 0), 0);
  const ele_tomada_dupla = ambientesEle.reduce((s, a) => s + (a.tomadas_duplas || 0), 0);
  const ele_interruptor = ambientesEle.reduce((s, a) => s + (a.interruptores || 0), 0);
  const ele_luminaria = ambientesEle.reduce((s, a) => s + (a.luminarias || 0), 0);
  const ele_chuveiro = ambientesEle.reduce((s, a) => s + (a.chuveiro ? 1 : 0), 0);

  return {
    ...raw,
    area_vaos: r2(area_vaos),
    area_vaos_janelas: r2(area_vaos_janelas),
    comp_vergas: r2(comp_vergas),
    comp_contravergas: r2(comp_contravergas),
    n_portas,
    volume_concreto_pilares: r3(volume_concreto_pilares),
    area_forma_pilares: r2(area_forma_pilares),
    volume_concreto_vigas_ind: r3(volume_concreto_vigas_ind),
    tabuas_pinus_vigas,
    tabuas_euclp_vigas,
    escoras_vigas_f,
    area_lajes: r2(area_lajes),
    volume_concreto_lajes: r3(volume_concreto_lajes),
    comp_forma_laje: r2(comp_forma_laje),
    estacas_equiv: r2(estacas_equiv),
    n_blocos_estaca,
    ele_tomada_simples,
    ele_tomada_dupla,
    ele_interruptor,
    ele_luminaria,
    ele_chuveiro,
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
  const keys = Object.keys(ctx).sort((a, b) => b.length - a.length);
  for (const key of keys) legivel = legivel.replaceAll(key, String(ctx[key]));
  legivel = legivel
    .replace(/Math\.ceil\(([^)]+)\)/g, '⌈$1⌉')
    .replace(/Math\.max\(0,\s*/g, 'máx(0, ')
    .replace(/Math\.max\(1,\s*/g, 'máx(1, ')
    .replace(/Math\.max\(0\.5,\s*/g, 'máx(0,5, ');
  return `${legivel} = ${resultado} ${unidade}`;
}

/**
 * Calcula todos os quantitativos a partir dos parâmetros e listas de entrada.
 * Inclui apenas itens com todos os parâmetros necessários preenchidos e qtd > 0.
 */
export function calcularQuantitativos(
  rawParams: Partial<CalcParamsRaw>,
  vaos: CalcVao[],
  pilares: CalcPilarItem[] = [],
  vigasInd: CalcVigaIndItem[] = [],
  lajes: CalcLajeItem[] = [],
  estacas: CalcEstacaItem[] = [],
  ambientesEle: CalcAmbienteEle[] = [],
): CalcItem[] {
  const params = derivarParams(rawParams, vaos, pilares, vigasInd, lajes, estacas, ambientesEle);

  return CALC_TEMPLATES.filter(t => t.ativo).map(template => {
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
