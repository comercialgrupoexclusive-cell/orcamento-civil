import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { readSheet, appendRow } from '@/lib/db';
import type { TipoInsumo } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ImportResult {
  importados: number;
  ignorados: number;
  erros: string[];
}

async function importarInsumos(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const existentes = await readSheet('INSUMOS');
  const codigosExistentes = new Set(existentes.map(i => i.codigo));

  let importados = 0;
  let ignorados = 0;
  const erros: string[] = [];

  for (const row of rows) {
    const codigo = String(row['Código'] || row['codigo'] || '').trim();
    const descricao = String(row['Descrição'] || row['descricao'] || '').trim();
    const unidade = String(row['Unidade'] || row['unidade'] || '').trim();

    if (!descricao || !unidade) {
      erros.push(`Linha ignorada: descrição ou unidade ausente (código: ${codigo || 'sem código'})`);
      ignorados++;
      continue;
    }

    if (codigo && codigosExistentes.has(codigo)) {
      erros.push(`Código duplicado ignorado: ${codigo}`);
      ignorados++;
      continue;
    }

    await appendRow('INSUMOS', {
      id: String(row['ID'] || row['id'] || uuidv4()),
      codigo: codigo || uuidv4().slice(0, 8),
      descricao,
      unidade,
      preco: Number(row['Preço (R$)'] || row['preco'] || 0),
      tipo: String(row['Tipo'] || row['tipo'] || 'M') as TipoInsumo,
      categoria: String(row['Categoria'] || row['categoria'] || '').trim(),
      status: 'ativo',
    });
    importados++;
  }

  return { importados, ignorados, erros };
}

async function importarComposicoes(
  compRows: Record<string, unknown>[],
  itensRows: Record<string, unknown>[]
): Promise<ImportResult> {
  const existentes = await readSheet('COMPOSICOES');
  const codigosExistentes = new Set(existentes.map(c => c.codigo));

  let importados = 0;
  let ignorados = 0;
  const erros: string[] = [];

  const idMap: Record<string, string> = {};

  for (const row of compRows) {
    const codigo = String(row['Código'] || row['codigo'] || '').trim();
    const descricao = String(row['Descrição'] || row['descricao'] || '').trim();

    if (!descricao) {
      erros.push(`Composição sem descrição ignorada (código: ${codigo || 'sem código'})`);
      ignorados++;
      continue;
    }

    if (codigo && codigosExistentes.has(codigo)) {
      erros.push(`Código duplicado ignorado: ${codigo}`);
      ignorados++;
      continue;
    }

    const oldId = String(row['ID'] || row['id'] || '');
    const newId = uuidv4();
    if (oldId) idMap[oldId] = newId;

    await appendRow('COMPOSICOES', {
      id: newId,
      codigo: codigo || uuidv4().slice(0, 8),
      descricao,
      unidade_producao: String(row['Unidade Produção'] || row['unidade_producao'] || '').trim(),
      producao: Number(row['Produção'] || row['producao'] || 1),
      descricao_tecnica: String(row['Descrição Técnica'] || row['descricao_tecnica'] || '').trim(),
      status: 'ativo',
    });
    importados++;
  }

  if (itensRows.length > 0) {
    const insumos = await readSheet('INSUMOS');
    const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

    for (const row of itensRows) {
      const compIdOrig = String(row['ID Composição'] || row['composicao_id'] || '');
      const insumoId = String(row['ID Insumo'] || row['insumo_id'] || '');
      const compId = idMap[compIdOrig] || compIdOrig;

      if (!compId || !insumoId || !insumoMap[insumoId]) continue;

      await appendRow('ITENS_COMPOSICAO', {
        id: uuidv4(),
        composicao_id: compId,
        insumo_id: insumoId,
        coeficiente: Number(row['Coeficiente'] || row['coeficiente'] || 0),
        unidade: String(row['Unidade'] || row['unidade'] || '').trim(),
      });
    }
  }

  return { importados, ignorados, erros };
}

/** Deriva o código de etapa (01-20) a partir do código da composição */
function etapaFromCodigo(codigo: string): string {
  const num = parseInt(codigo.split('.')[0].replace(/[^0-9]/g, '') || '0', 10);
  if (!num) return '01';
  const prefix = Math.floor(num / 1000);
  return String(prefix || 1).padStart(2, '0');
}

/** Normaliza string para comparação: minúsculas, sem acentos, sem espaços extras */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function importarOrcamento(
  rows: Record<string, unknown>[],
  titulo: string,
  bdi: number,
): Promise<ImportResult & { orcamento_id?: string }> {
  const composicoes = await readSheet('COMPOSICOES');

  // Índices de busca: por código exato, por nome exato e por nome normalizado
  const compPorCodigo = Object.fromEntries(composicoes.map(c => [c.codigo.trim(), c]));
  const compPorNome   = Object.fromEntries(composicoes.map(c => [c.descricao.trim(), c]));
  const compPorNormNome = Object.fromEntries(composicoes.map(c => [norm(c.descricao), c]));

  let importados = 0;
  let ignorados = 0;
  const erros: string[] = [];

  const orcId = uuidv4();
  await appendRow('ORCAMENTOS', {
    id: orcId,
    titulo: titulo || 'Orçamento Importado',
    descricao: '',
    data_criacao: new Date().toISOString(),
    data_atualizacao: new Date().toISOString(),
    status: 'em_andamento',
    bdi_percentual: bdi,
  });

  let ordem = 1;
  for (const row of rows) {
    // Coluna nova (simplificada): "Composição (nome ou código)" | "Quantidade"
    // Coluna legada:               "Etapa" | "Sub-Etapa" | "Código Composição" | "Quantidade"
    const compInput    = String(
      row['Composição (nome ou código)'] ||
      row['Composicao (nome ou codigo)'] ||
      row['Composição'] ||
      row['Codigo Composicao'] ||
      row['Código Composição'] ||
      row['codigo_composicao'] ||
      row['composicao'] ||
      ''
    ).trim();

    const qtd = Number(
      row['Quantidade'] || row['quantidade'] || row['Qtd'] || 1
    );

    // Campos opcionais / legados
    const etapaManual  = String(row['Etapa'] || row['etapa'] || row['etapa_codigo'] || '').trim();
    const subEtapa     = String(row['Sub-Etapa'] || row['Sub_Etapa'] || row['sub_etapa'] || '').trim();
    const descOverride = String(row['Descrição'] || row['descricao'] || '').trim();
    const unOverride   = String(row['Unidade']   || row['unidade']   || '').trim();
    const custoOverride = Number(row['Custo Unitário'] || row['custo_unitario'] || 0);

    if (!compInput && !descOverride) {
      erros.push(`Linha ${ordem}: composição não informada`);
      ignorados++;
      continue;
    }

    // Buscar composição: código → nome exato → nome normalizado → substring
    let comp = compPorCodigo[compInput]
      || compPorNome[compInput]
      || compPorNormNome[norm(compInput)]
      || composicoes.find(c => norm(c.descricao).includes(norm(compInput)) && norm(compInput).length > 4);

    if (compInput && !comp) {
      erros.push(`Linha ${ordem}: composição não encontrada — "${compInput}"`);
      ignorados++;
      continue;
    }

    // Derivar etapa automaticamente a partir do código da composição
    const etapa = etapaManual || (comp ? etapaFromCodigo(comp.codigo) : '01');

    await appendRow('ITENS_ORCAMENTO', {
      id: uuidv4(),
      orcamento_id: orcId,
      etapa_codigo: etapa,
      sub_etapa: subEtapa,
      composicao_id: comp?.id || '',
      descricao_override: descOverride,
      unidade_override: unOverride,
      custo_unitario_override: custoOverride,
      quantidade: qtd || 1,
      quantidade_tipo: 'MANUAL',
      ordem,
    });

    importados++;
    ordem++;
  }

  return { importados, ignorados, erros, orcamento_id: orcId };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tipo = String(formData.get('tipo') || 'insumos');
    const titulo = String(formData.get('titulo') || '');
    const bdi = Number(formData.get('bdi') || 0);

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });

    let resultado: ImportResult & { orcamento_id?: string } = { importados: 0, ignorados: 0, erros: [] };

    if (tipo === 'insumos') {
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      resultado = await importarInsumos(rows);
    } else if (tipo === 'composicoes') {
      const wsComp = wb.Sheets['Composições'] || wb.Sheets[wb.SheetNames[0]];
      const wsItens = wb.Sheets['Itens_Composição'] || wb.Sheets[wb.SheetNames[1]];
      const compRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsComp);
      const itensRows = wsItens ? XLSX.utils.sheet_to_json<Record<string, unknown>>(wsItens) : [];
      resultado = await importarComposicoes(compRows, itensRows);
    } else if (tipo === 'orcamento') {
      const ws = wb.Sheets['Itens'] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      resultado = await importarOrcamento(rows, titulo, bdi);
    }

    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
