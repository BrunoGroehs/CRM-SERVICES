const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function updateDatabaseStructure() {
  try {
    console.log('🔧 Atualizando estrutura do banco de dados...');
    
    // Adicionar coluna created_by se não existir
    console.log('📝 Adicionando coluna created_by na tabela usuarios...');
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Estrutura do banco atualizada com sucesso!');
    
    // Verificar a estrutura atual
    console.log('\n📋 Estrutura atual da tabela usuarios:');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      ORDER BY ordinal_position
    `);
    
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar estrutura do banco:', error);
  } finally {
    await pool.end();
  }
}

updateDatabaseStructure();
