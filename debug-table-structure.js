require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTableStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'recontatos'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estrutura da tabela recontatos:');
    console.log(result.rows);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
