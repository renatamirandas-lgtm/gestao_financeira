// Teste completo de conexão com o banco
import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente PRIMEIRO
config({ path: resolve(__dirname, '../.env.local') });

import { Pool } from 'pg';

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.log('❌ DATABASE_URL não encontrada no .env.local');
    console.log('📝 Crie o arquivo .env.local na raiz do projeto com:');
    console.log('   DATABASE_URL=sua_string_de_conexao_aqui');
    process.exit(1);
  }

  // Mascarar senha para segurança
  const maskedUrl = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log('📡 Tentando conectar em:', maskedUrl);
  console.log('');

  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
  });

  try {
    console.log('🔄 Testando conexão...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ CONECTADO COM SUCESSO!');
    console.log('⏰ Horário do servidor:', result.rows[0].current_time);
    console.log('📦 Versão PostgreSQL:', result.rows[0].version.split(',')[0]);
    console.log('');

    // Verificar tabelas
    console.log('🔍 Verificando tabelas existentes...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada no banco.');
      console.log('📝 Você precisa criar as tabelas executando o script create-tables.sql');
    } else {
      console.log(`✅ Encontradas ${tablesResult.rows.length} tabela(s):`);
      tablesResult.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
    }

    await pool.end();
    console.log('');
    console.log('✅ Teste concluído com sucesso!');

  } catch (error: any) {
    console.error('❌ ERRO AO CONECTAR:');
    console.error('   Código:', error.code);
    console.error('   Mensagem:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 O erro ECONNREFUSED geralmente significa:');
      console.log('   1. A DATABASE_URL está incorreta');
      console.log('   2. O banco de dados está inativo');
      console.log('   3. Há problemas de rede/firewall');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();

