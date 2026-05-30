import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const orcamentos = await readSheet('ORCAMENTOS');
    const original = orcamentos.find(o => o.id === id);
    if (!original) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    const isTemplate = body.as_template === true;
    const novoId = uuidv4();
    const titulo = body.titulo?.trim() ||
      (isTemplate ? `[Template] ${original.titulo}` : `Cópia de ${original.titulo}`);

    const novoOrc = {
      ...original,
      id: novoId,
      titulo,
      status: isTemplate ? 'template' : 'em_andamento',
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString(),
    };
    await appendRow('ORCAMENTOS', novoOrc);

    // Clonar itens
    const itens = await readSheet('ITENS_ORCAMENTO');
    const itensOriginal = itens.filter(i => i.orcamento_id === id);
    for (const item of itensOriginal) {
      await appendRow('ITENS_ORCAMENTO', {
        ...item,
        id: uuidv4(),
        orcamento_id: novoId,
      });
    }

    return NextResponse.json({ id: novoId, titulo, status: novoOrc.status }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
