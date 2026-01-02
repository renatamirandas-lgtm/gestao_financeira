// Teste simples de conexão
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

console.log('DATABASE_URL encontrada?', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  // Mascarar senha para segurança
  const url = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log('DATABASE_URL:', url);
} else {
  console.log('❌ DATABASE_URL não encontrada no .env.local');
}

