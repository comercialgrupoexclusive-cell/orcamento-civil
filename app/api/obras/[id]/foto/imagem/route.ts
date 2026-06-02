/**
 * Proxy que serve a foto da obra do Vercel Blob privado.
 * Usa Authorization: Bearer para autenticar com o blob store privado.
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

    const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';

    // Blob privado: requer Authorization header
    const res = await fetch(fotoUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Sem cache no fetch do servidor para sempre pegar a versão mais recente
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[foto proxy] fetch falhou: ${res.status} ${fotoUrl.slice(0, 80)}`);
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=1800',
      },
    });
  } catch (err) {
    console.error('[foto proxy] erro:', err);
    return new NextResponse(null, { status: 500 });
  }
}
