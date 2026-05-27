export function validarCampoObrigatorio(valor: unknown, nome: string): string | null {
  if (!valor || String(valor).trim() === '') return `${nome} é obrigatório`;
  return null;
}

export function validarPreco(preco: unknown): string | null {
  const num = Number(preco);
  if (isNaN(num) || num < 0) return 'Preço deve ser um número não negativo';
  return null;
}

export function validarCoeficiente(coef: unknown): string | null {
  const num = Number(coef);
  if (isNaN(num) || num <= 0) return 'Coeficiente deve ser um número positivo';
  return null;
}

export function validarBDI(bdi: unknown): string | null {
  const num = Number(bdi);
  if (isNaN(num) || num < 0 || num > 100) return 'BDI deve ser entre 0 e 100%';
  return null;
}

export function validarQuantidade(qtd: unknown): string | null {
  const num = Number(qtd);
  if (isNaN(num) || num < 0) return 'Quantidade deve ser um número não negativo';
  return null;
}

export function coletarErros(erros: (string | null)[]): string[] {
  return erros.filter((e): e is string => e !== null);
}

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}
