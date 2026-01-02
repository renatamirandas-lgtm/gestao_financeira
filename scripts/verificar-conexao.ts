// Script para verificar apenas a conexão e listar tabelas
import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente PRIMEIRO
config({ path: resolve(__dirname, '../.env.local') });

import { Pool } from 'pg';

async function verificarConexao() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.log('❌ DATABASE_URL não encontrada no .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
  });

  try {
    console.log('🔄 Testando conexão com o banco...\n');
    
    // Testar conexão básica
    await pool.query('SELECT 1');
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Listar tabelas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Tabelas encontradas (${tablesResult.rows.length}):`);
    console.log('─'.repeat(50));
    tablesResult.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    await pool.end();
    console.log('\n✅ Verificação concluída!');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    if (error.code) {
      console.error('   Código:', error.code);
    }
    await pool.end();
    process.exit(1);
  }
}

verificarConexao();

