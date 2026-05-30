import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';
import { gerarCodigoInsumo } from '@/lib/codigo-generator';
import { validarCampoObrigatorio, validarPreco, coletarErros, normalizar } from '@/lib/validators';
import type { Insumo, TipoInsumo } from '@/lib/types';

export const dynamic = 'force-dynamic';

function rowToInsumo(r: Record<string, string>): Insumo {
  return {
    id: r.id,
    codigo: r.codigo,
    descricao: r.descricao,
    unidade: r.unidade,
    preco: Number(r.preco) || 0,
    tipo: (r.tipo as TipoInsumo) || 'M',
    categoria: r.categoria,
    status: (r.status as 'ativo' | 'inativo') || 'ativo',
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.toLowerCase();

    let rows = await readSheet('INSUMOS');

    if (tipo) rows = rows.filter(r => r.tipo === tipo);
    if (status) rows = rows.filter(r => r.status === status);
    if (q) {
      const qn = normalizar(q);
      rows = rows.filter(r =>
        normalizar(r.descricao || '').includes(qn) ||
        normalizar(r.codigo || '').includes(qn) ||
        normalizar(r.categoria || '').includes(qn)
      );
    }

    return NextResponse.json(rows.map(rowToInsumo));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const erros = coletarErros([
      validarCampoObrigatorio(body.descricao, 'Descrição'),
      validarCampoObrigatorio(body.unidade, 'Unidade'),
      validarCampoObrigatorio(body.tipo, 'Tipo'),
      validarPreco(body.preco),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    // Impede insumo duplicado (mesma descrição normalizada)
    const todos = await readSheet('INSUMOS');
    const descNorm = normalizar(String(body.descricao).trim());
    const existente = todos.find(r => normalizar(r.descricao || '') === descNorm);
    if (existente) {
      return NextResponse.json(
        { erros: [`Já existe um insumo com descrição similar: "${existente.descricao}" (${existente.codigo})`] },
        { status: 409 }
      );
    }

    const codigo = await gerarCodigoInsumo(body.tipo as TipoInsumo);
    const insumo: Insumo = {
      id: uuidv4(),
      codigo,
      descricao: String(body.descricao).trim(),
      unidade: String(body.unidade).trim(),
      preco: Number(body.preco) || 0,
      tipo: body.tipo as TipoInsumo,
      categoria: String(body.categoria || '').trim(),
      status: 'ativo',
    };

    await appendRow('INSUMOS', insumo as unknown as Record<string, unknown>);
    return NextResponse.json(insumo, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
