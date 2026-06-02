import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRowById, deleteRowById } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obras = await readSheet('OBRAS');
  const obra = obras.find(o => o.id === id);
  if (!obra) return NextResponse.json({ error: 'Obra nao encontrada' }, { status: 404 });

  const [etapas, servicos, fornecedores, orcamentos] = await Promise.all([
    readSheet('ETAPAS_OBRA'),
    readSheet('SERVICOS_ETAPA'),
    readSheet('FORNECEDORES'),
    readSheet('ORCAMENTOS'),
  ]);

  const orc = orcamentos.find(o => o.id === obra.orcamento_id);
  const obraEtapas = etapas.filter(e => e.obra_id === id).sort((a, b) => Number(a.ordem) - Number(b.ordem));
  const obraForn = fornecedores.filter(f => f.obra_id === id);

  const etapasComServicos = obraEtapas.map(et => ({
    ...et,
    servicos: servicos.filter(s => s.etapa_obra_id === et.id),
  }));

  return NextResponse.json({ ...obra, etapas: etapasComServicos, fornecedores: obraForn, orcamento: orc || null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updates = { ...body, data_atualizacao: new Date().toISOString() };
  const ok = await updateRowById('OBRAS', id, updates);
  if (!ok) return NextResponse.json({ error: 'Obra nao encontrada' }, { status: 404 });
  return NextResponse.json({ id, ...updates });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteRowById('OBRAS', id);
  if (!ok) return NextResponse.json({ error: 'Obra nao encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
