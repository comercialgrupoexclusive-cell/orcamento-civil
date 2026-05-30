import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TABELAS = ['INSUMOS', 'COMPOSICOES', 'ITENS_COMPOSICAO', 'ORCAMENTOS', 'ITENS_ORCAMENTO'] as const;

/** GET /api/backup — exporta backup completo em JSON */
export async function GET() {
  try {
    const backup: Record<string, unknown[]> = {};
    for (const tabela of TABELAS) {
      backup[tabela] = await readSheet(tabela);
    }
    backup['_meta'] = [{
      versao: '1.0',
      data: new Date().toISOString(),
      totais: Object.fromEntries(
        TABELAS.map(t => [t, (backup[t] as unknown[]).length])
      ),
    }];

    const json = JSON.stringify(backup, null, 2);
    const filename = `backup_orcamento_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** POST /api/backup — restaura backup a partir de JSON */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

    const text = await file.text();
    let backup: Record<string, unknown[]>;
    try {
      backup = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Arquivo JSON inválido' }, { status: 400 });
    }

    // Validação mínima
    const tabelasFaltando = TABELAS.filter(t => !(t in backup));
    if (tabelasFaltando.length > 0) {
      return NextResponse.json(
        { error: `Backup inválido: tabelas ausentes — ${tabelasFaltando.join(', ')}` },
        { status: 400 }
      );
    }

    // Restaurar cada tabela
    const totais: Record<string, number> = {};
    for (const tabela of TABELAS) {
      const rows = backup[tabela] as Record<string, string>[];
      await writeFile(tabela, rows);
      totais[tabela] = rows.length;
    }

    return NextResponse.json({
      ok: true,
      mensagem: 'Backup restaurado com sucesso',
      totais,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
