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
  // Serviços Preliminares
  area_terreno: number;
  perimetro_terreno: number;
  area_construida: number;
  // Vigas de Fundação
  comp_vigas: number;
  secao_b: number;
  secao_h: number;
  n_barras_long: number;
  esp_estribo: number;
  tabua_larg: number;
  // Alvenaria
  comp_paredes: number;
  alt_paredes: number;
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
  area_imper_molhada: number;
  // Revestimento interno
  area_revest_interno: number;      // chapisco + reboco (2 faces internas)
  area_ceramica_parede: number;     // áreas molhadas com cerâmica
  // Forro
  area_forro: number;
  // Pintura
  area_pintura_interna: number;
  area_pintura_externa: number;
  // Pisos
  area_piso: number;
  // Acabamento
  comp_rodape: number;
  // Elétrica (derivado da lista de ambientes)
  ele_tomada_simples: number;
  ele_tomada_dupla: number;
  ele_interruptor: number;
  ele_luminaria: number;
  ele_chuveiro: number;
  // Hidráulica
  n_pontos_agua: number;
  metros_rede_agua: number;
  // Esgoto
  n_pontos_esgoto: number;
  n_caixa_sifonada: number;
  n_caixa_inspecao: number;
  // Louças e metais / banheiro
  n_banheiros: number;
  // Fundação profunda (derivado da lista de estacas)
  estacas_equiv: number;            // Σ qtd × (prof / 3) — custo linear por metro
  n_blocos_estaca: number;
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
  tipo: 'baldrame' | 'aerea';
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

// Elétrica — pontos por ambiente (default 3 tomadas + 1 luz, editável)
export interface CalcAmbienteEle {
  id: string;
  nome: string;
  tomadas: number;        // tomadas simples
  tomadas_duplas: number; // tomadas duplas
  interruptores: number;
  luminarias: number;
  chuveiro: boolean;      // ponto de chuveiro
}
