require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estrutura atual do banco de dados...\n');
    
    // Verificar estrutura da tabela servicos
    const servicosColumns = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'servicos' 
      ORDER BY ordinal_position;
    `;
    
    const servicosResult = await pool.query(servicosColumns);
    console.log('📋 TABELA SERVICOS - Estrutura atual:');
    console.log('=====================================');
    servicosResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`   ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}`);
    });
    
    // Verificar dados existentes
    const servicosData = await pool.query('SELECT COUNT(*) as total FROM servicos');
    console.log(`\n📊 Total de registros: ${servicosData.rows[0].total}`);
    
    if (servicosData.rows[0].total > 0) {
      console.log('\n📄 Primeiros 3 registros (para verificar campos usados):');
      const sampleData = await pool.query('SELECT * FROM servicos LIMIT 3');
      sampleData.rows.forEach((row, index) => {
        console.log(`\nRegistro ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`   ${key}: ${row[key]}`);
        });
      });
    }
    
    console.log('\n=====================================');
    
    // Verificar outras tabelas relacionadas
    console.log('\n🔗 Verificando tabelas relacionadas...');
    
    const clientesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 TABELA CLIENTES:');
    clientesColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
    const recontatosColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recontatos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 TABELA RECONTATOS:');
    recontatosColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseStructure();
