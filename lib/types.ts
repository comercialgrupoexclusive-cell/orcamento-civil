export type TipoInsumo = 'M' | 'MO' | 'E' | 'S';
export const TIPOS_INSUMO_ATIVOS: TipoInsumo[] = ['M', 'MO', 'E']; // S removido por solicitação
export type OrcamentoStatus = 'em_andamento' | 'aguardando_aprovacao' | 'aprovado';
export const ORCAMENTO_STATUS_LABEL: Record<OrcamentoStatus | string, string> = {
  em_andamento: 'Em Andamento',
  aguardando_aprovacao: 'Aguard. Aprovação',
  aprovado: 'Aprovado',
  ativo: 'Em Andamento', // legado
};
export type StatusRegistro = 'ativo' | 'inativo';
export type QuantidadeTipo = 'AUTO' | 'MANUAL';

export interface Insumo {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco: number;
  tipo: TipoInsumo;
  categoria: string;
  status: StatusRegistro;
}

export interface Composicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade_producao: string;
  producao: number;
  descricao_tecnica: string;
  status: StatusRegistro;
  custo_unitario?: number;
  etapa_codigo?: string;
}

export interface ItemComposicao {
  id: string;
  composicao_id: string;
  insumo_id: string;
  coeficiente: number;
  unidade: string;
  insumo?: Insumo;
  custo_total?: number;
}

export interface Orcamento {
  id: string;
  titulo: string;
  descricao: string;
  data_criacao: string;
  status: StatusRegistro;
  bdi_percentual: number;
}

export interface ItemOrcamento {
  id: string;
  orcamento_id: string;
  etapa_codigo: string;
  composicao_id: string;
  descricao_override: string;
  unidade_override: string;
  custo_unitario_override: number;
  quantidade: number;
  quantidade_tipo: QuantidadeTipo;
  composicao?: Composicao;
  custo_total?: number;
}

export interface Etapa {
  codigo: string;
  descricao: string;
}

export const ETAPAS: Etapa[] = [
  { codigo: '01', descricao: 'Serviços Preliminares e Gerais' },
  { codigo: '02', descricao: 'Infraestrutura' },
  { codigo: '03', descricao: 'Supraestrutura' },
  { codigo: '04', descricao: 'Paredes e Painéis' },
  { codigo: '05', descricao: 'Esquadrias' },
  { codigo: '06', descricao: 'Vidros e Plásticos' },
  { codigo: '07', descricao: 'Coberturas' },
  { codigo: '08', descricao: 'Impermeabilizações' },
  { codigo: '09', descricao: 'Revestimentos Internos' },
  { codigo: '10', descricao: 'Forros' },
  { codigo: '11', descricao: 'Revestimentos Externos' },
  { codigo: '12', descricao: 'Pintura' },
  { codigo: '13', descricao: 'Pisos' },
  { codigo: '14', descricao: 'Acabamentos' },
  { codigo: '15', descricao: 'Instalações Elétricas e Telefônicas' },
  { codigo: '16', descricao: 'Instalações Hidráulicas' },
  { codigo: '17', descricao: 'Instalações de Esgoto e Águas Pluviais' },
  { codigo: '18', descricao: 'Louças e Metais' },
  { codigo: '19', descricao: 'Complementos' },
  { codigo: '20', descricao: 'Outros Serviços' },
];

export const TIPO_INSUMO_LABEL: Record<TipoInsumo, string> = {
  M: 'Material',
  MO: 'Mão de Obra',
  E: 'Equipamento',
  S: 'Serviço',
};

export const UNIDADES_PADRAO = [
  'm', 'm²', 'm³', 'kg', 'g', 't', 'un', 'vb', 'cj', 'pç',
  'l', 'ml', 'h', 'hr', 'dia', 'mês', 'sc', 'saco',
  'cx', 'rolo', 'par', 'barra', 'chapa', 'fardo', 'lata', 'bd',
];

export const CATEGORIAS_PADRAO = [
  'Material Básico', 'Aço e Ferragem', 'Argamassa e Cimento',
  'Areia e Brita', 'Madeira', 'Impermeabilização',
  'Revestimento e Piso', 'Tubulação e Hidráulica', 'Elétrico',
  'Alvenaria e Bloco', 'Cobertura e Telha', 'Esquadria',
  'Fundação', 'Pavimentação', 'Pintura e Verniz',
  'Mão de Obra', 'Equipamento', 'Ferramentas', 'Locação', 'Serviços Gerais',
];

// ─── Calculadora Paramétrica de Quantitativos ─────────────────────────────────

export interface CalcVao {
  id: string;
  tipo: 'porta' | 'janela';
  qtd: number;     // quantidade desse vão (multiplicador)
  largura: number; // metros
  altura: number;  // metros
}

/** Parâmetros brutos digitados pelo usuário + derivados calculados automaticamente */
export interface CalcParamsRaw {
  // Dados do projeto / Serviços Preliminares
  area_construida: number;          // Área Construída Total (m²)
  area_terreno: number;             // Área Terreno (m²)
  perimetro_terreno: number;        // Perímetro Terreno (m)
  perimetro_paredes: number;        // Perímetro de Paredes (m) — total de paredes
  perimetro_externo: number;        // Perímetro Externo Edificação (m)
  comp_paredes_internas: number;    // Comprimento Paredes Internas (m)
  pe_direito: number;               // Pé Direito (m)
  // Vigas de Fundação (baldrame)
  comp_vigas: number;
  secao_b: number;
  secao_h: number;
  n_barras_long: number;
  esp_estribo: number;
  tabua_larg: number;
  bitola_baldrame: number;          // bitola do ferro longitudinal (mm)
  // Alvenaria / Paredes e Painéis
  comp_paredes: number;
  alt_paredes: number;
  cinta_coroamento: number;        // 1 = incluir cinta superior, 0 = não
  // Derivados de vaos[]
  area_vaos: number;
  area_vaos_janelas: number;
  comp_vergas: number;
  comp_contravergas: number;
  // Derivados das listas de elementos estruturais
  volume_concreto_pilares: number;
  area_forma_pilares: number;
  volume_concreto_vigas_ind: number;
  tabuas_pinus_vigas: number;   // tábuas pinus 2,70m — fôrma lateral (ambos tipos)
  tabuas_euclp_vigas: number;   // tábuas eucalipto 5,40m — fundo viga aérea
  escoras_vigas_f: number;      // escoras de vigas aéreas
  area_lajes: number;
  volume_concreto_lajes: number;
  comp_forma_laje: number;          // perímetro de fechamento das lajes (m)
  // Alvenaria — tipo
  tipo_alv: number;                 // 1 = vedação, 2 = estrutural
  // Esquadrias (derivado dos vãos)
  n_portas: number;
  // (area_vaos_janelas já existe acima — usado para esquadria de janela)
  // Cobertura
  area_telhado: number;
  comp_rufos: number;
  comp_calhas: number;
  tipo_telha: number;               // 1 = barro colonial, 2 = aluzinco
  // Impermeabilização
  area_imper_molhada: number;       // derivado dos ambientes área molhada (piso+paredes)
  area_imper_paredes: number;       // = perímetro de paredes × 2 (argamassa polimérica H=1m)
  // Revestimento interno/externo
  area_revest_interno: number;      // chapisco + reboco internos
  area_revest_externo: number;      // chapisco + reboco externos
  area_ceramica_parede: number;     // áreas molhadas com cerâmica (derivado ambientes)
  // Forro
  area_forro: number;
  forro_tipo: number;               // 1 = PVC, 2 = drywall
  // Pintura
  area_pintura_interna: number;
  area_pintura_externa: number;
  massa_int: number;                // 1 = aplicar massa fina interna, 0 = não
  // Pisos
  area_piso: number;
  piso_tipo: number;                // 1 = cerâmica classe A, 2 = porcelanato
  contrapiso_armado: number;        // 1 = concreto armado 5cm, 0 = regularização
  rodape_tipo: number;              // 1 = poliestireno 7cm, 2 = próprio piso
  // Acabamento
  comp_rodape: number;              // perímetro interno − larguras das portas
  comp_pingadeiras: number;         // Σ largura janelas + 0,05 cada
  comp_soleiras: number;            // Σ largura portas + 0,05 cada
  // Elétrica (derivado da lista de ambientes)
  ele_tomada_simples: number;
  ele_tomada_dupla: number;
  ele_interruptor: number;
  ele_luminaria: number;
  ele_chuveiro: number;
  // Hidrossanitária (derivado da lista de ambientes)
  n_pontos_agua: number;
  metros_rede_agua: number;
  n_pontos_esgoto: number;
  n_caixa_sifonada: number;
  n_caixa_inspecao: number;
  // Louças e metais (derivado dos ambientes banheiro/cozinha)
  n_banheiros: number;
  n_cozinhas: number;
  // Fundação profunda (derivado da lista de estacas)
  estacas_equiv: number;            // Σ qtd × (prof / 3) — perfuração + armadura por 3 m
  volume_concreto_estacas: number;  // Σ qtd × prof × 0,30 × 0,30 (m³)
  n_blocos_estaca: number;
  // ── Muro ───────────────────────────────────────────────────────────────────
  perimetro_muro: number;           // perímetro do muro (entrada base)
  comp_vigas_muro: number;          // comprimento das vigas = perimetro_muro
  secao_b_muro: number;
  secao_h_muro: number;
  comp_alv_muro: number;            // comprimento de alvenaria = perimetro_muro
  alt_alv_muro: number;             // altura da alvenaria do muro
  tipo_alv_muro: number;            // 1=vedação, 2=estrutural
  area_revest_muro: number;         // = perimetro_muro × alt_alv_muro × 2
  area_pintura_muro: number;        // = perimetro_muro × alt_alv_muro × 2
  cinta_muro: number;               // 1=incluir cinta de coroamento
  // Estacas do muro (derivado de estacas_muro[])
  estacas_muro_equiv: number;
  volume_concreto_estacas_muro: number;
  n_blocos_estaca_muro: number;
}

/** Composição inserida livremente pelo usuário na etapa Outros */
export interface CalcComposicaoLivre {
  id: string;
  composicao_id: string;
  quantidade: number;
  descricao_override: string;   // opcional — sobrescreve o nome
}

export interface CalcItem {
  template_id: string;
  nome: string;
  grupo_id: string;
  grupo_nome: string;
  etapa_codigo: string;
  sub_etapa: string;
  composicao_id: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  formula_legivel: string;
  incluir: boolean;
}

export interface CalcTemplate {
  id: string;
  ativo: boolean;
  nome: string;
  grupo_id: string;
  grupo_nome: string;
  etapa_codigo: string;
  sub_etapa: string;
  composicao_id: string | null;
  descricao: string;
  unidade: string;
  formula: string;
  parametros: (keyof CalcParamsRaw)[];
}

export interface CalcGrupo {
  id: string;
  nome: string;
  etapa_codigo: string;
  cor: string;
  emoji: string;
  descricao: string;
}

// ─── Elementos estruturais com múltiplos tipos ────────────────────────────────

export interface CalcPilarItem {
  id: string;
  desc: string;
  qtd: number;
  l1: number;
  l2: number;
  h: number;
}

export interface CalcVigaIndItem {
  id: string;
  desc: string;
  b: number;           // largura (m)
  h: number;           // altura (m)
  comp: number;        // total de metros desse tipo de viga (perímetro)
  tipo: 'sob_parede' | 'aerea';
  esp_escoras: number; // espaçamento entre escoras em m (apenas para 'aerea')
}

export interface CalcLajeItem {
  id: string;
  desc: string;
  qtd: number;
  comp: number;
  larg: number;
  esp: number;
}

// Fundação profunda — estacas com profundidade livre (m)
export interface CalcEstacaItem {
  id: string;
  desc: string;
  qtd: number;     // número de estacas desse tipo
  prof: number;    // profundidade em metros (livre — o usuário escolhe)
  blocos: number;  // nº de blocos de coroamento desse grupo
}

export type TipoAmbiente = 'quarto' | 'sala' | 'cozinha' | 'banheiro' | 'area_servico' | 'outro';

/**
 * Ambiente unificado (espelho) — uma única fonte de verdade compartilhada entre
 * Elétrica, Hidrossanitária, Louças/Metais, Impermeabilização e Revestimento
 * cerâmico. O usuário pode ou não cadastrar; se cadastrar, preenche o que puder.
 */
export interface CalcAmbiente {
  id: string;
  nome: string;
  tipo: TipoAmbiente;
  qtd: number;            // quantidade desse ambiente (multiplicador)
  area: number;           // m²
  comp_parede: number;    // comprimento/perímetro de parede do ambiente (m)
  pe_direito: number;     // m
  area_molhada: boolean;  // alimenta impermeabilização + cerâmica de parede
  // Elétrica
  tomadas: number;
  tomadas_duplas: number;
  interruptores: number;
  luminarias: number;
  // Hidrossanitária
  pontos_agua: number;
  pontos_esgoto: number;
}

/** @deprecated mantido por compatibilidade; use CalcAmbiente */
export type CalcAmbienteEle = CalcAmbiente;
