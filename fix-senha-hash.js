const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSenhaHashConstraint() {
  try {
    console.log('🔧 Corrigindo constraint da coluna senha_hash...');
    
    // Tornar senha_hash opcional (nullable) para permitir login OAuth
    await pool.query('ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;');
    console.log('✅ Coluna senha_hash agora é opcional (permite NULL)');
    
    // Verificar estrutura atual
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name IN ('senha_hash', 'google_id', 'email')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Estrutura das colunas principais:');
    columns.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    console.log('\n✅ Agora usuários podem se cadastrar via Google OAuth sem senha!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

fixSenhaHashConstraint();
