/**
 * Proxy que serve a foto da obra diretamente do Vercel Blob privado.
 * O browser chama /api/obras/[id]/foto/imagem e esta rota
 * baixa o blob com autenticação e retorna os bytes como image/jpeg.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const obras = await readSheet('OBRAS');
    const obra = obras.find(o => o.id === id) as Record<string, string> | undefined;

    if (!obra) return new NextResponse(null, { status: 404 });

    const fotoUrl = obra.foto_url || '';
    if (!fotoUrl) return new NextResponse(null, { status: 404 });

    // Tenta buscar diretamente (funciona para URLs públicas)
    // Para blobs privados legados, tenta também com o token
    let res = await fetch(fotoUrl);
    if (!res.ok) {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token) {
        res = await fetch(fotoUrl, { headers: { Authorization: `Bearer ${token}` } });
      }
    }
    if (!res.ok) return new NextResponse(null, { status: res.status });

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    });
  } catch (err) {
    console.error('[foto proxy]', err);
    return new NextResponse(null, { status: 500 });
  }
}
