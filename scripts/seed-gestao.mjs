import { writeFileSync } from 'fs';

const obras = [{
  id: 'obra-001', nome: 'Residencia Familia Silva',
  endereco: 'Rua das Acacias, 142', bairro: 'Centro',
  cidade: 'Eldorado do Sul', estado: 'RS', cep: '92990-000',
  status: 'em_andamento', data_inicio: '2026-04-01', data_prev_termino: '2026-10-30',
  area_construida: '80', foto_url: '', responsavel: 'Joao da Silva',
  telefone_responsavel: '(51) 99123-4567', orcamento_id: 'orc-geminada-42m2-2026',
  observacoes: 'Casa geminada terrea. Terreno plano. Acesso pela rua principal.',
  data_criacao: new Date().toISOString(), data_atualizacao: new Date().toISOString()
}];

const fornecedores = [
  { id: 'forn-001', obra_id: 'obra-001', nome: 'Materiais Eldorado Ltda', especialidade: 'Material de Construcao', telefone: '(51) 3482-1100', whatsapp: '555134821100', email: 'vendas@materiaiseldorado.com.br', observacoes: 'Fornecedor principal. Entrega no local.', status: 'ativo' },
  { id: 'forn-002', obra_id: 'obra-001', nome: 'Ferragens Central RS', especialidade: 'Aco e Ferragem', telefone: '(51) 98765-4321', whatsapp: '5551987654321', email: '', observacoes: 'Melhor preco em vergalhao CA-50.', status: 'ativo' },
  { id: 'forn-003', obra_id: 'obra-001', nome: 'Eletrica Gaucha Servicos', especialidade: 'Instalacoes Eletricas', telefone: '(51) 99234-5678', whatsapp: '5551992345678', email: 'eletricagaucha@gmail.com', observacoes: 'Empreiteiro eletrico. Contrato por servico completo.', status: 'ativo' },
  { id: 'forn-004', obra_id: 'obra-001', nome: 'Ceramica Sul Revestimentos', especialidade: 'Revestimentos e Pisos', telefone: '(51) 3481-9900', whatsapp: '555134819900', email: 'vendas@ceramicasul.com.br', observacoes: 'Perguntar por Marcos.', status: 'ativo' }
];

const etapas = [
  { id: 'etob-001', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '01', etapa_nome: 'Servicos Preliminares', status_execucao: 'concluido', data_inicio: '2026-04-01', data_fim_prevista: '2026-04-07', data_fim_real: '2026-04-05', ordem: '1' },
  { id: 'etob-002', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '02', etapa_nome: 'Infraestrutura', status_execucao: 'concluido', data_inicio: '2026-04-07', data_fim_prevista: '2026-04-21', data_fim_real: '2026-04-22', ordem: '2' },
  { id: 'etob-003', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '03', etapa_nome: 'Supraestrutura', status_execucao: 'em_andamento', data_inicio: '2026-04-23', data_fim_prevista: '2026-05-15', data_fim_real: '', ordem: '3' },
  { id: 'etob-004', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '04', etapa_nome: 'Paredes e Paineis', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-05-30', data_fim_real: '', ordem: '4' },
  { id: 'etob-005', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '07', etapa_nome: 'Coberturas', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-06-15', data_fim_real: '', ordem: '5' },
  { id: 'etob-006', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '09', etapa_nome: 'Revestimentos Internos', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-07-15', data_fim_real: '', ordem: '6' },
  { id: 'etob-007', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '12', etapa_nome: 'Pintura', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-08-15', data_fim_real: '', ordem: '7' },
  { id: 'etob-008', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '13', etapa_nome: 'Pisos e Contrapisos', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-08-30', data_fim_real: '', ordem: '8' },
  { id: 'etob-009', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '15', etapa_nome: 'Instalacoes Eletricas', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-09-15', data_fim_real: '', ordem: '9' },
  { id: 'etob-010', obra_id: 'obra-001', orcamento_id: 'orc-geminada-42m2-2026', etapa_codigo: '16', etapa_nome: 'Instalacoes Hidraulicas', status_execucao: 'nao_iniciado', data_inicio: '', data_fim_prevista: '2026-09-30', data_fim_real: '', ordem: '10' }
];

const servicos = [
  { id: 'svc-001', etapa_obra_id: 'etob-001', obra_id: 'obra-001', etapa_codigo: '01', composicao_codigo: '1003', servico_nome: 'Tapume ecologico', unidade: 'm', quantidade: '37', status_compra: 'comprado', fornecedor_id: 'forn-001', observacao: '' },
  { id: 'svc-002', etapa_obra_id: 'etob-001', obra_id: 'obra-001', etapa_codigo: '01', composicao_codigo: '1002', servico_nome: 'Placa de obra', unidade: 'un', quantidade: '1', status_compra: 'comprado', fornecedor_id: '', observacao: '' },
  { id: 'svc-003', etapa_obra_id: 'etob-002', obra_id: 'obra-001', etapa_codigo: '02', composicao_codigo: '2001.1', servico_nome: 'Estacas - perfuracao e armadura', unidade: 'un', quantidade: '11', status_compra: 'comprado', fornecedor_id: 'forn-002', observacao: '' },
  { id: 'svc-004', etapa_obra_id: 'etob-002', obra_id: 'obra-001', etapa_codigo: '02', composicao_codigo: '2002.3', servico_nome: 'Concreto manual - estacas', unidade: 'm3', quantidade: '1.2', status_compra: 'comprado', fornecedor_id: 'forn-001', observacao: '' },
  { id: 'svc-005', etapa_obra_id: 'etob-002', obra_id: 'obra-001', etapa_codigo: '02', composicao_codigo: '2003.1', servico_nome: 'Armadura viga baldrame', unidade: 'm', quantidade: '43', status_compra: 'comprado', fornecedor_id: 'forn-002', observacao: 'Vergalhao 8mm' },
  { id: 'svc-006', etapa_obra_id: 'etob-002', obra_id: 'obra-001', etapa_codigo: '02', composicao_codigo: '2006', servico_nome: 'Contrapiso concreto armado 5cm', unidade: 'm2', quantidade: '42', status_compra: 'comprado', fornecedor_id: 'forn-001', observacao: '' },
  { id: 'svc-007', etapa_obra_id: 'etob-003', obra_id: 'obra-001', etapa_codigo: '03', composicao_codigo: '3009', servico_nome: 'Concreto usinado FCK 25', unidade: 'm3', quantidade: '3.8', status_compra: 'comprado', fornecedor_id: 'forn-001', observacao: 'Caminhao betoneira agendado' },
  { id: 'svc-008', etapa_obra_id: 'etob-003', obra_id: 'obra-001', etapa_codigo: '03', composicao_codigo: '3007', servico_nome: 'Laje pre-moldada', unidade: 'm2', quantidade: '0', status_compra: 'pendente', fornecedor_id: '', observacao: 'Aguardar definicao do projeto' },
  { id: 'svc-009', etapa_obra_id: 'etob-004', obra_id: 'obra-001', etapa_codigo: '04', composicao_codigo: '4002', servico_nome: 'Alvenaria estrutural', unidade: 'm2', quantidade: '178', status_compra: 'pedido_feito', fornecedor_id: 'forn-001', observacao: 'Pedido 1500 blocos feito em 28/05' },
  { id: 'svc-010', etapa_obra_id: 'etob-004', obra_id: 'obra-001', etapa_codigo: '04', composicao_codigo: '4001', servico_nome: 'Vergas e contravergas', unidade: 'm', quantidade: '28', status_compra: 'pendente', fornecedor_id: '', observacao: '' },
  { id: 'svc-011', etapa_obra_id: 'etob-005', obra_id: 'obra-001', etapa_codigo: '07', composicao_codigo: '7004', servico_nome: 'Madeiramento telhado barro', unidade: 'm2', quantidade: '56', status_compra: 'pendente', fornecedor_id: '', observacao: '' },
  { id: 'svc-012', etapa_obra_id: 'etob-005', obra_id: 'obra-001', etapa_codigo: '07', composicao_codigo: '7005', servico_nome: 'Telhamento telha barro', unidade: 'm2', quantidade: '56', status_compra: 'pendente', fornecedor_id: '', observacao: '' },
  { id: 'svc-013', etapa_obra_id: 'etob-008', obra_id: 'obra-001', etapa_codigo: '13', composicao_codigo: '13012', servico_nome: 'Piso ceramico 60x60', unidade: 'm2', quantidade: '42', status_compra: 'parcial', fornecedor_id: 'forn-004', observacao: '20m2 ja separado na loja' }
];

writeFileSync('data/OBRAS.json', JSON.stringify(obras, null, 2));
writeFileSync('data/FORNECEDORES.json', JSON.stringify(fornecedores, null, 2));
writeFileSync('data/ETAPAS_OBRA.json', JSON.stringify(etapas, null, 2));
writeFileSync('data/SERVICOS_ETAPA.json', JSON.stringify(servicos, null, 2));
console.log('OBRAS:', obras.length, '| FORN:', fornecedores.length, '| ETAPAS:', etapas.length, '| SERVICOS:', servicos.length);
