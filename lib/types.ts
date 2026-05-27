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
