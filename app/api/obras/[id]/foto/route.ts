import { NextRequest, NextResponse } from 'next/server';
import { updateRowById } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 });
    }
    // Máx 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande (máx 5 MB)' }, { status: 400 });
    }

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const filename = `obras/${id}/foto.${ext}`;

    const { put } = await import('@vercel/blob');
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Salvar URL na obra
    await updateRowById('OBRAS', id, { foto_url: blob.url });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('[foto upload]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await updateRowById('OBRAS', id, { foto_url: '' });
  return NextResponse.json({ ok: true });
}
