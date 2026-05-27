import { NextResponse } from 'next/server';
import { initSheets } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const resultado = await initSheets();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
