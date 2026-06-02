import { NextRequest, NextResponse } from 'next/server';
import { updateRowById, readSheet } from '@/lib/db';
import { put, del } from '@vercel/blob';

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
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Apenas imagens' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Máx 5 MB' }, { status: 400 });

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const filename = `obras/${id}/foto.${ext}`;

    // Blob store é privado — usar access: 'private'
    // A URL retornada é temporária (signed URL) ou podemos servir via API
    const blob = await put(filename, await file.arrayBuffer(), {
      access: 'private',
      contentType: file.type,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Salvar o pathname (não a URL completa, pois signed URLs expiram)
    await updateRowById('OBRAS', id, {
      foto_url: blob.url,
      foto_pathname: blob.pathname,
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    console.error('[foto upload]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Retorna a URL atual da foto da obra
  const { id } = await params;
  const obras = await readSheet('OBRAS');
  const obra = obras.find(o => o.id === id);
  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  return NextResponse.json({ url: obra.foto_url || '', pathname: (obra as Record<string, string>).foto_pathname || '' });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const obras = await readSheet('OBRAS');
  const obra = obras.find(o => o.id === id);
  const pathname = (obra as Record<string, string> | undefined)?.foto_pathname;
  if (pathname) {
    try {
      await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch { /* ignora se não existir */ }
  }
  await updateRowById('OBRAS', id, { foto_url: '', foto_pathname: '' });
  return NextResponse.json({ ok: true });
}
