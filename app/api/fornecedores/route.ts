import { NextRequest, NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/db';
import { randomUUID } from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const obra_id = new URL(req.url).searchParams.get('obra_id');
  const lista = await readSheet('FORNECEDORES');
  return NextResponse.json(obra_id ? lista.filter(f => f.obra_id === obra_id) : lista);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });
  const forn = {
    id: randomUUID(),
    obra_id: String(body.obra_id || ''),
    nome: String(body.nome).trim(),
    especialidade: String(body.especialidade || ''),
    telefone: String(body.telefone || ''),
    whatsapp: String(body.whatsapp || ''),
    email: String(body.email || ''),
    observacoes: String(body.observacoes || ''),
    status: 'ativo',
  };
  await appendRow('FORNECEDORES', forn);
  return NextResponse.json(forn, { status: 201 });
}
