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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tipo = String(formData.get('tipo') || 'insumos');

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });

    let resultado: ImportResult = { importados: 0, ignorados: 0, erros: [] };

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
    }

    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
