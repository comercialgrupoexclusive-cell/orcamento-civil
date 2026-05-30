/**
 * seed-data.ts
 * Insumos, composições e itens pré-definidos com IDs fixos para
 * referenciação estática nos CALC_TEMPLATES.
 * Preços baseados em SINAPI Mai/2026 — região Sul/Sudeste.
 */

export interface SeedInsumo {
  id: string; codigo: string; descricao: string;
  unidade: string; preco: number; tipo: string;
  categoria: string; status: string; data_alteracao: string;
}

export interface SeedComposicao {
  id: string; codigo: string; descricao: string;
  unidade_producao: string; producao: number;
  descricao_tecnica: string; status: string; data_alteracao: string;
}

export interface SeedItemComposicao {
  id: string; composicao_id: string; insumo_id: string;
  coeficiente: number; unidade: string;
}

const TODAY = new Date().toISOString().split('T')[0];

// ─── Insumos ──────────────────────────────────────────────────────────────────

export const SEED_INSUMOS: SeedInsumo[] = [
  // Materiais
  {
    id: 'ins-m-001', codigo: 'M-0001',
    descricao: 'Concreto usinado FCK 25 MPa',
    unidade: 'm³', preco: 420.00, tipo: 'M',
    categoria: 'Material Básico', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-002', codigo: 'M-0002',
    descricao: 'Tábua de madeira pinus 15 cm × 2,70 m (fôrma)',
    unidade: 'un', preco: 18.00, tipo: 'M',
    categoria: 'Madeira', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-003', codigo: 'M-0003',
    descricao: 'Tábua de madeira eucalipto 15 cm × 5,40 m (fundo viga)',
    unidade: 'un', preco: 32.00, tipo: 'M',
    categoria: 'Madeira', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-004', codigo: 'M-0004',
    descricao: 'Aço CA-50 ø10 mm barra 12 m',
    unidade: 'barra', preco: 85.00, tipo: 'M',
    categoria: 'Aço e Ferragem', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-005', codigo: 'M-0005',
    descricao: 'Aço CA-60 ø6,3 mm barra 12 m (estribo)',
    unidade: 'barra', preco: 42.00, tipo: 'M',
    categoria: 'Aço e Ferragem', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-006', codigo: 'M-0006',
    descricao: 'Tapume ecológico 0,50 × 2,00 m',
    unidade: 'un', preco: 38.00, tipo: 'M',
    categoria: 'Material Básico', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-007', codigo: 'M-0007',
    descricao: 'Tijolo furado 9×14×19 cm',
    unidade: 'un', preco: 1.20, tipo: 'M',
    categoria: 'Alvenaria e Bloco', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-008', codigo: 'M-0008',
    descricao: 'Argamassa de assentamento traço 1:2:8',
    unidade: 'm³', preco: 280.00, tipo: 'M',
    categoria: 'Argamassa e Cimento', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-009', codigo: 'M-0009',
    descricao: 'Argamassa de reboco traço 1:4',
    unidade: 'm³', preco: 260.00, tipo: 'M',
    categoria: 'Argamassa e Cimento', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-010', codigo: 'M-0010',
    descricao: 'Tinta látex PVA — 2 demãos',
    unidade: 'l', preco: 22.00, tipo: 'M',
    categoria: 'Pintura e Verniz', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-011', codigo: 'M-0011',
    descricao: 'Verga/contraverga de concreto armado pré-moldada',
    unidade: 'm', preco: 28.00, tipo: 'M',
    categoria: 'Material Básico', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-m-012', codigo: 'M-0012',
    descricao: 'Escora metálica telescópica — locação/peça',
    unidade: 'un', preco: 45.00, tipo: 'M',
    categoria: 'Ferramentas', status: 'ativo', data_alteracao: TODAY,
  },
  // Mão de Obra
  {
    id: 'ins-mo-001', codigo: 'MO-0001',
    descricao: 'Carpinteiro — fôrma e escoramento',
    unidade: 'h', preco: 28.00, tipo: 'MO',
    categoria: 'Mão de Obra', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-mo-002', codigo: 'MO-0002',
    descricao: 'Pedreiro',
    unidade: 'h', preco: 24.00, tipo: 'MO',
    categoria: 'Mão de Obra', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-mo-003', codigo: 'MO-0003',
    descricao: 'Servente de obras',
    unidade: 'h', preco: 17.50, tipo: 'MO',
    categoria: 'Mão de Obra', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-mo-004', codigo: 'MO-0004',
    descricao: 'Armador — corte, dobra e montagem de aço',
    unidade: 'h', preco: 30.00, tipo: 'MO',
    categoria: 'Mão de Obra', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-mo-005', codigo: 'MO-0005',
    descricao: 'Pintor',
    unidade: 'h', preco: 26.00, tipo: 'MO',
    categoria: 'Mão de Obra', status: 'ativo', data_alteracao: TODAY,
  },
  // Equipamentos
  {
    id: 'ins-e-001', codigo: 'E-0001',
    descricao: 'Retroescavadeira — locação/hora',
    unidade: 'h', preco: 280.00, tipo: 'E',
    categoria: 'Equipamento', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-e-002', codigo: 'E-0002',
    descricao: 'Caçamba estacionária 5 m³ — locação',
    unidade: 'un', preco: 750.00, tipo: 'E',
    categoria: 'Equipamento', status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'ins-e-003', codigo: 'E-0003',
    descricao: 'Vibrador de imersão para concreto',
    unidade: 'h', preco: 15.00, tipo: 'E',
    categoria: 'Equipamento', status: 'ativo', data_alteracao: TODAY,
  },
];

// ─── Composições ──────────────────────────────────────────────────────────────

export const SEED_COMPOSICOES: SeedComposicao[] = [
  {
    id: 'cmp-001', codigo: 'C-0001',
    descricao: 'Raspagem e limpeza superficial do terreno',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Raspagem manual + auxílio de retroescavadeira. Remoção de vegetação rasa.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-002', codigo: 'C-0002',
    descricao: 'Marcação de obra com gabarito',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Marcação de eixos com gabarito de madeira, nível e trena.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-003', codigo: 'C-0003',
    descricao: 'Tapume ecológico 0,50 × 2,00 m — fornec. e mont.',
    unidade_producao: 'un', producao: 1,
    descricao_tecnica: 'Fornecimento e montagem de tapume ecológico em chapa plástica.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-004', codigo: 'C-0004',
    descricao: 'Retroescavadeira — limpeza e escavação',
    unidade_producao: 'h', producao: 1,
    descricao_tecnica: 'Locação de retroescavadeira para limpeza do terreno e escavação inicial.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-005', codigo: 'C-0005',
    descricao: 'Caçamba estacionária 5 m³ — locação',
    unidade_producao: 'un', producao: 1,
    descricao_tecnica: 'Locação de caçamba estacionária para coleta e descarte de entulho/vegetação.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-006', codigo: 'C-0006',
    descricao: 'Concreto usinado FCK 25 MPa — lançado e vibrado',
    unidade_producao: 'm³', producao: 1,
    descricao_tecnica: 'Concreto usinado FCK 25 MPa. Lançamento, adensamento com vibrador e cura úmida 7 dias. Inclui perdas de 5%.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-007', codigo: 'C-0007',
    descricao: 'Tábua de pinus 2,70 m — fôrma lateral',
    unidade_producao: 'un', producao: 1,
    descricao_tecnica: 'Fornecimento, corte e fixação de tábua de pinus 15 cm × 2,70 m para fôrma lateral de vigas e fundação.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-008', codigo: 'C-0008',
    descricao: 'Tábua de eucalipto 5,40 m — fundo de viga aérea',
    unidade_producao: 'un', producao: 1,
    descricao_tecnica: 'Fornecimento, corte e fixação de tábua de eucalipto 15 cm × 5,40 m para fundo de vigas aéreas.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-009', codigo: 'C-0009',
    descricao: 'Aço CA-50 ø10 mm barra 12 m — longitudinal',
    unidade_producao: 'barra', producao: 1,
    descricao_tecnica: 'Fornecimento, corte e montagem de barra de aço CA-50 ø10 mm × 12 m para armação longitudinal. Inclui 10% perdas.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-010', codigo: 'C-0010',
    descricao: 'Aço CA-60 ø6,3 mm barra 12 m — estribo',
    unidade_producao: 'barra', producao: 1,
    descricao_tecnica: 'Fornecimento, corte, dobramento e montagem de barra CA-60 ø6,3 mm × 12 m para estribos.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-011', codigo: 'C-0011',
    descricao: 'Concreto FCK 25 MPa em pilares — lançado e vibrado',
    unidade_producao: 'm³', producao: 1,
    descricao_tecnica: 'Concreto usinado FCK 25 MPa em pilares. Inclui lançamento controlado, vibração por imersão e cura. Perdas 5%.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-012', codigo: 'C-0012',
    descricao: 'Fôrma de madeira para pilares (m²)',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Fôrma de tábuas de pinus para pilares, 4 faces. Inclui corte, montagem e desmontagem.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-013', codigo: 'C-0013',
    descricao: 'Escora metálica telescópica — locação e posicionamento',
    unidade_producao: 'un', producao: 1,
    descricao_tecnica: 'Locação, montagem e desmontagem de escora metálica telescópica para escoramento de lajes e vigas aéreas.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-014', codigo: 'C-0014',
    descricao: 'Concreto FCK 25 MPa em lajes — lançado e vibrado',
    unidade_producao: 'm³', producao: 1,
    descricao_tecnica: 'Concreto usinado FCK 25 MPa em lajes. Lançamento, espalhamento, vibração e cura úmida. Inclui perdas de 5%.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-015', codigo: 'C-0015',
    descricao: 'Laje treliçada — armação, EPS e montagem (m²)',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Serviço de montagem de laje treliçada (nervurada): posicionamento de tavelas EPS, treliças metálicas e tela de distribuição. Concreto cobrado separado.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-016', codigo: 'C-0016',
    descricao: 'Alvenaria de tijolo furado 9×14×19 cm (m²)',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Alvenaria de tijolo furado, assentado em pé com argamassa traço 1:2:8. ~28 tijolos/m². Inclui argamassa de assentamento.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-017', codigo: 'C-0017',
    descricao: 'Chapisco + reboco paulista (m²)',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Chapisco com argamassa de cimento e areia, seguido de reboco paulista (e=15 mm). Consumo: ~0,025 m³ argamassa/m².',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-018', codigo: 'C-0018',
    descricao: 'Pintura látex PVA — 2 demãos (m²)',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Pintura de paredes com tinta látex PVA, 2 demãos. Consumo: ~0,70 l/m².',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-019', codigo: 'C-0019',
    descricao: 'Verga pré-moldada de concreto armado (m)',
    unidade_producao: 'm', producao: 1,
    descricao_tecnica: 'Fornecimento e assentamento de verga pré-moldada de concreto armado sobre vãos de portas e janelas.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-020', codigo: 'C-0020',
    descricao: 'Contraverga pré-moldada de concreto armado (m)',
    unidade_producao: 'm', producao: 1,
    descricao_tecnica: 'Fornecimento e assentamento de contraverga pré-moldada de concreto armado sob vãos de janelas.',
    status: 'ativo', data_alteracao: TODAY,
  },
  {
    id: 'cmp-021', codigo: 'C-0021',
    descricao: 'Fôrma de madeira para vigas de fundação (m²)',
    unidade_producao: 'm²', producao: 1,
    descricao_tecnica: 'Fôrma de tábuas de pinus para vigas de fundação, 2 faces laterais. Inclui corte, montagem e desmontagem.',
    status: 'ativo', data_alteracao: TODAY,
  },
];

// ─── Itens de composição ──────────────────────────────────────────────────────
// coeficiente = quantidade do insumo por unidade de produção da composição

export const SEED_ITENS_COMPOSICAO: SeedItemComposicao[] = [
  // CMP-001: Raspagem (m²) — servente 0,05h + retroescav 0,007h
  { id: 'itc-001-1', composicao_id: 'cmp-001', insumo_id: 'ins-mo-003', coeficiente: 0.050, unidade: 'h' },
  { id: 'itc-001-2', composicao_id: 'cmp-001', insumo_id: 'ins-e-001',  coeficiente: 0.007, unidade: 'h' },

  // CMP-002: Marcação (m²) — pedreiro 0,04h + servente 0,04h
  { id: 'itc-002-1', composicao_id: 'cmp-002', insumo_id: 'ins-mo-002', coeficiente: 0.040, unidade: 'h' },
  { id: 'itc-002-2', composicao_id: 'cmp-002', insumo_id: 'ins-mo-003', coeficiente: 0.040, unidade: 'h' },

  // CMP-003: Tapume (un) — material 1un + servente 0,25h
  { id: 'itc-003-1', composicao_id: 'cmp-003', insumo_id: 'ins-m-006',  coeficiente: 1.000, unidade: 'un' },
  { id: 'itc-003-2', composicao_id: 'cmp-003', insumo_id: 'ins-mo-003', coeficiente: 0.250, unidade: 'h' },

  // CMP-004: Retroescavadeira (h) — 1h equipamento
  { id: 'itc-004-1', composicao_id: 'cmp-004', insumo_id: 'ins-e-001',  coeficiente: 1.000, unidade: 'h' },

  // CMP-005: Caçamba (un) — 1un equipamento
  { id: 'itc-005-1', composicao_id: 'cmp-005', insumo_id: 'ins-e-002',  coeficiente: 1.000, unidade: 'un' },

  // CMP-006: Concreto vigas/pilares/lajes (m³) — concreto 1,05m³ + pedreiro 3,5h + servente 3,5h + vibrador 1h
  { id: 'itc-006-1', composicao_id: 'cmp-006', insumo_id: 'ins-m-001',  coeficiente: 1.050, unidade: 'm³' },
  { id: 'itc-006-2', composicao_id: 'cmp-006', insumo_id: 'ins-mo-002', coeficiente: 3.500, unidade: 'h' },
  { id: 'itc-006-3', composicao_id: 'cmp-006', insumo_id: 'ins-mo-003', coeficiente: 3.500, unidade: 'h' },
  { id: 'itc-006-4', composicao_id: 'cmp-006', insumo_id: 'ins-e-003',  coeficiente: 1.000, unidade: 'h' },

  // CMP-007: Tábua pinus 2,70m (un) — tábua + carpinteiro 0,30h + servente 0,15h
  { id: 'itc-007-1', composicao_id: 'cmp-007', insumo_id: 'ins-m-002',  coeficiente: 1.000, unidade: 'un' },
  { id: 'itc-007-2', composicao_id: 'cmp-007', insumo_id: 'ins-mo-001', coeficiente: 0.300, unidade: 'h' },
  { id: 'itc-007-3', composicao_id: 'cmp-007', insumo_id: 'ins-mo-003', coeficiente: 0.150, unidade: 'h' },

  // CMP-008: Tábua eucalipto 5,40m (un) — tábua + carpinteiro 0,50h + servente 0,25h
  { id: 'itc-008-1', composicao_id: 'cmp-008', insumo_id: 'ins-m-003',  coeficiente: 1.000, unidade: 'un' },
  { id: 'itc-008-2', composicao_id: 'cmp-008', insumo_id: 'ins-mo-001', coeficiente: 0.500, unidade: 'h' },
  { id: 'itc-008-3', composicao_id: 'cmp-008', insumo_id: 'ins-mo-003', coeficiente: 0.250, unidade: 'h' },

  // CMP-009: Aço CA-50 barra 12m longitudinal (barra) — barra + armador 0,80h + servente 0,40h
  { id: 'itc-009-1', composicao_id: 'cmp-009', insumo_id: 'ins-m-004',  coeficiente: 1.000, unidade: 'barra' },
  { id: 'itc-009-2', composicao_id: 'cmp-009', insumo_id: 'ins-mo-004', coeficiente: 0.800, unidade: 'h' },
  { id: 'itc-009-3', composicao_id: 'cmp-009', insumo_id: 'ins-mo-003', coeficiente: 0.400, unidade: 'h' },

  // CMP-010: Aço CA-60 barra 12m estribo (barra) — barra + armador 1,20h + servente 0,60h
  { id: 'itc-010-1', composicao_id: 'cmp-010', insumo_id: 'ins-m-005',  coeficiente: 1.000, unidade: 'barra' },
  { id: 'itc-010-2', composicao_id: 'cmp-010', insumo_id: 'ins-mo-004', coeficiente: 1.200, unidade: 'h' },
  { id: 'itc-010-3', composicao_id: 'cmp-010', insumo_id: 'ins-mo-003', coeficiente: 0.600, unidade: 'h' },

  // CMP-011: Concreto pilares (m³) — concreto 1,05m³ + pedreiro 5h + servente 5h + vibrador 1,5h
  { id: 'itc-011-1', composicao_id: 'cmp-011', insumo_id: 'ins-m-001',  coeficiente: 1.050, unidade: 'm³' },
  { id: 'itc-011-2', composicao_id: 'cmp-011', insumo_id: 'ins-mo-002', coeficiente: 5.000, unidade: 'h' },
  { id: 'itc-011-3', composicao_id: 'cmp-011', insumo_id: 'ins-mo-003', coeficiente: 5.000, unidade: 'h' },
  { id: 'itc-011-4', composicao_id: 'cmp-011', insumo_id: 'ins-e-003',  coeficiente: 1.500, unidade: 'h' },

  // CMP-012: Fôrma pilares (m²) — tábuas 2,5un + carpinteiro 1,20h + servente 0,60h
  { id: 'itc-012-1', composicao_id: 'cmp-012', insumo_id: 'ins-m-002',  coeficiente: 2.500, unidade: 'un' },
  { id: 'itc-012-2', composicao_id: 'cmp-012', insumo_id: 'ins-mo-001', coeficiente: 1.200, unidade: 'h' },
  { id: 'itc-012-3', composicao_id: 'cmp-012', insumo_id: 'ins-mo-003', coeficiente: 0.600, unidade: 'h' },

  // CMP-013: Escora telescópica (un) — escora 1un + servente 0,30h
  { id: 'itc-013-1', composicao_id: 'cmp-013', insumo_id: 'ins-m-012',  coeficiente: 1.000, unidade: 'un' },
  { id: 'itc-013-2', composicao_id: 'cmp-013', insumo_id: 'ins-mo-003', coeficiente: 0.300, unidade: 'h' },

  // CMP-014: Concreto lajes (m³) — concreto 1,05m³ + pedreiro 3h + servente 3h + vibrador 0,8h
  { id: 'itc-014-1', composicao_id: 'cmp-014', insumo_id: 'ins-m-001',  coeficiente: 1.050, unidade: 'm³' },
  { id: 'itc-014-2', composicao_id: 'cmp-014', insumo_id: 'ins-mo-002', coeficiente: 3.000, unidade: 'h' },
  { id: 'itc-014-3', composicao_id: 'cmp-014', insumo_id: 'ins-mo-003', coeficiente: 3.000, unidade: 'h' },
  { id: 'itc-014-4', composicao_id: 'cmp-014', insumo_id: 'ins-e-003',  coeficiente: 0.800, unidade: 'h' },

  // CMP-015: Laje armação e montagem (m²) — pedreiro 2,5h + servente 2,5h
  { id: 'itc-015-1', composicao_id: 'cmp-015', insumo_id: 'ins-mo-002', coeficiente: 2.500, unidade: 'h' },
  { id: 'itc-015-2', composicao_id: 'cmp-015', insumo_id: 'ins-mo-003', coeficiente: 2.500, unidade: 'h' },

  // CMP-016: Alvenaria (m²) — 28 tijolos + 0,012m³ argamassa + pedreiro 0,9h + servente 0,45h
  { id: 'itc-016-1', composicao_id: 'cmp-016', insumo_id: 'ins-m-007',  coeficiente: 28.000, unidade: 'un' },
  { id: 'itc-016-2', composicao_id: 'cmp-016', insumo_id: 'ins-m-008',  coeficiente: 0.012, unidade: 'm³' },
  { id: 'itc-016-3', composicao_id: 'cmp-016', insumo_id: 'ins-mo-002', coeficiente: 0.900, unidade: 'h' },
  { id: 'itc-016-4', composicao_id: 'cmp-016', insumo_id: 'ins-mo-003', coeficiente: 0.450, unidade: 'h' },

  // CMP-017: Chapisco + reboco (m²) — 0,025m³ argamassa + pedreiro 0,60h + servente 0,30h
  { id: 'itc-017-1', composicao_id: 'cmp-017', insumo_id: 'ins-m-009',  coeficiente: 0.025, unidade: 'm³' },
  { id: 'itc-017-2', composicao_id: 'cmp-017', insumo_id: 'ins-mo-002', coeficiente: 0.600, unidade: 'h' },
  { id: 'itc-017-3', composicao_id: 'cmp-017', insumo_id: 'ins-mo-003', coeficiente: 0.300, unidade: 'h' },

  // CMP-018: Pintura PVA (m²) — 0,70l tinta + pintor 0,30h
  { id: 'itc-018-1', composicao_id: 'cmp-018', insumo_id: 'ins-m-010',  coeficiente: 0.700, unidade: 'l' },
  { id: 'itc-018-2', composicao_id: 'cmp-018', insumo_id: 'ins-mo-005', coeficiente: 0.300, unidade: 'h' },

  // CMP-019: Verga (m) — 1m verga + pedreiro 0,15h + servente 0,15h
  { id: 'itc-019-1', composicao_id: 'cmp-019', insumo_id: 'ins-m-011',  coeficiente: 1.000, unidade: 'm' },
  { id: 'itc-019-2', composicao_id: 'cmp-019', insumo_id: 'ins-mo-002', coeficiente: 0.150, unidade: 'h' },
  { id: 'itc-019-3', composicao_id: 'cmp-019', insumo_id: 'ins-mo-003', coeficiente: 0.150, unidade: 'h' },

  // CMP-020: Contraverga (m) — idem verga
  { id: 'itc-020-1', composicao_id: 'cmp-020', insumo_id: 'ins-m-011',  coeficiente: 1.000, unidade: 'm' },
  { id: 'itc-020-2', composicao_id: 'cmp-020', insumo_id: 'ins-mo-002', coeficiente: 0.150, unidade: 'h' },
  { id: 'itc-020-3', composicao_id: 'cmp-020', insumo_id: 'ins-mo-003', coeficiente: 0.150, unidade: 'h' },

  // CMP-021: Fôrma vigas fundação (m²) — 2,5 tábuas + carpinteiro 1h + servente 0,5h
  { id: 'itc-021-1', composicao_id: 'cmp-021', insumo_id: 'ins-m-002',  coeficiente: 2.500, unidade: 'un' },
  { id: 'itc-021-2', composicao_id: 'cmp-021', insumo_id: 'ins-mo-001', coeficiente: 1.000, unidade: 'h' },
  { id: 'itc-021-3', composicao_id: 'cmp-021', insumo_id: 'ins-mo-003', coeficiente: 0.500, unidade: 'h' },
];
