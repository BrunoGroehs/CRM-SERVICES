// Script de migração para remover colunas antigas de servicos
require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  try {
    console.log('🔧 Removendo colunas legacy (funcionario_responsavel, funcionarios)...');
    await pool.query('ALTER TABLE servicos DROP COLUMN IF EXISTS funcionario_responsavel;');
    await pool.query('ALTER TABLE servicos DROP COLUMN IF EXISTS funcionarios;');
    console.log('✅ Colunas removidas (ou já inexistentes)');
  } catch (e) {
    console.error('❌ Erro ao remover colunas legacy:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };