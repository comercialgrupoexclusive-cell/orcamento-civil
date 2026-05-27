import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';
import { validarCampoObrigatorio, validarCoeficiente, coletarErros } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const itens = await readSheet('ITENS_COMPOSICAO');
    const insumos = await readSheet('INSUMOS');
    const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

    const result = itens
      .filter(i => i.composicao_id === id)
      .map(i => ({
        ...i,
        coeficiente: Number(i.coeficiente),
        insumo: insumoMap[i.insumo_id],
        custo_total: Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0),
      }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const erros = coletarErros([
      validarCampoObrigatorio(body.insumo_id, 'Insumo'),
      validarCoeficiente(body.coeficiente),
      validarCampoObrigatorio(body.unidade, 'Unidade'),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    // Verify insumo exists
    const insumos = await readSheet('INSUMOS');
    const insumo = insumos.find(i => i.id === body.insumo_id);
    if (!insumo) return NextResponse.json({ erros: ['Insumo não encontrado'] }, { status: 400 });

    const item = {
      id: uuidv4(),
      composicao_id: id,
      insumo_id: body.insumo_id,
      coeficiente: Number(body.coeficiente),
      unidade: String(body.unidade).trim(),
    };

    await appendRow('ITENS_COMPOSICAO', item);
    return NextResponse.json({
      ...item,
      insumo,
      custo_total: Number(insumo.preco || 0) * item.coeficiente,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
