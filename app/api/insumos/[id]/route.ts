import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRowById, deleteRowById } from '@/lib/db';
import { validarCampoObrigatorio, validarPreco, coletarErros } from '@/lib/validators';
import type { Insumo, TipoInsumo } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await readSheet('INSUMOS');
    const row = rows.find(r => r.id === id);
    if (!row) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const erros = coletarErros([
      validarCampoObrigatorio(body.descricao, 'Descrição'),
      validarCampoObrigatorio(body.unidade, 'Unidade'),
      validarPreco(body.preco),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const updates: Partial<Insumo> & { data_alteracao?: string } = {
      descricao: String(body.descricao).trim(),
      unidade: String(body.unidade).trim(),
      preco: Number(body.preco) || 0,
      categoria: String(body.categoria || '').trim(),
      status: body.status || 'ativo',
      data_alteracao: new Date().toISOString(),
    };
    if (body.tipo) updates.tipo = body.tipo as TipoInsumo;

    const ok = await updateRowById('INSUMOS', id, updates);
    if (!ok) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });

    return NextResponse.json({ id, ...updates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteRowById('INSUMOS', id);
    if (!ok) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
