import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SEED_INSUMOS, SEED_COMPOSICOES, SEED_ITENS_COMPOSICAO } from '@/lib/seed-data';

const DATA_DIR = path.join(process.cwd(), 'data');

function writeJson(name: string, data: unknown[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST() {
  try {
    // Limpa e reescreve dados de referência
    writeJson('INSUMOS', SEED_INSUMOS);
    writeJson('COMPOSICOES', SEED_COMPOSICOES);
    writeJson('ITENS_COMPOSICAO', SEED_ITENS_COMPOSICAO);
    // Limpa orçamentos existentes
    writeJson('ORCAMENTOS', []);
    writeJson('ITENS_ORCAMENTO', []);

    return NextResponse.json({
      ok: true,
      insumos: SEED_INSUMOS.length,
      composicoes: SEED_COMPOSICOES.length,
      itens_composicao: SEED_ITENS_COMPOSICAO.length,
    });
  } catch (err) {
    console.error('[seed] Erro:', err);
    return NextResponse.json({ error: 'Erro ao executar seed' }, { status: 500 });
  }
}
