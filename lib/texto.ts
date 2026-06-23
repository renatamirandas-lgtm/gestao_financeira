export function digitarMaiusculo(valor: string): string {
  return valor.toLocaleUpperCase('pt-BR');
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function mascararCpf(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

export function mascararCnpj(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 14);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  if (digitos.length <= 8) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
  if (digitos.length <= 12) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

export function mascararDocumento(valor: string, tipoPessoa: 'Física' | 'Jurídica'): string {
  return tipoPessoa === 'Jurídica' ? mascararCnpj(valor) : mascararCpf(valor);
}

function todosDigitosIguais(digitos: string): boolean {
  return /^(\d)\1+$/.test(digitos);
}

export function validarCpf(valor: string): boolean {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 11 || todosDigitosIguais(digitos)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(digitos[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digitos[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(digitos[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(digitos[10], 10);
}

export function validarCnpj(valor: string): boolean {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 14 || todosDigitosIguais(digitos)) return false;

  const calcularDigito = (base: string, pesos: number[]): number => {
    const soma = base.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  if (calcularDigito(digitos.slice(0, 12), pesos1) !== parseInt(digitos[12], 10)) return false;
  return calcularDigito(digitos.slice(0, 13), pesos2) === parseInt(digitos[13], 10);
}

export function validarDocumento(valor: string, tipoPessoa: 'Física' | 'Jurídica'): boolean {
  const digitos = somenteDigitos(valor);
  if (!digitos) return true;
  return tipoPessoa === 'Jurídica' ? validarCnpj(valor) : validarCpf(valor);
}
