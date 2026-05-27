import { readSheet } from './db';
import type { TipoInsumo } from './types';

const PREFIXOS: Record<TipoInsumo, string> = {
  M: 'M',
  MO: 'MO',
  E: 'E',
  S: 'S',
};

function proxSeq(codigos: string[], prefixo: string): string {
  const nums = codigos
    .filter(c => c?.startsWith(prefixo + '-'))
    .map(c => parseInt(c.split('-')[1] || '0', 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefixo}-${String(max + 1).padStart(4, '0')}`;
}

export async function gerarCodigoInsumo(tipo: TipoInsumo): Promise<string> {
  const rows = await readSheet('INSUMOS');
  const codigos = rows.filter(r => r.tipo === tipo).map(r => r.codigo);
  return proxSeq(codigos, PREFIXOS[tipo]);
}

export async function gerarCodigoComposicao(): Promise<string> {
  const rows = await readSheet('COMPOSICOES');
  return proxSeq(rows.map(r => r.codigo), 'C');
}
