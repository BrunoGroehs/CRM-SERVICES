const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkColumns() {
  try {
    console.log('🔍 Verificando estrutura da tabela clientes...');
    
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clientes'
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    console.log('\n📋 Colunas da tabela clientes:');
    console.log('=====================================');
    result.rows.forEach(col => {
      console.log(`${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });
    
    // Verificar especificamente a coluna quantidade_placas
    const placasColumn = result.rows.find(col => col.column_name === 'quantidade_placas');
    if (placasColumn) {
      console.log('\n✅ Coluna quantidade_placas encontrada!');
      console.log(`Tipo: ${placasColumn.data_type}`);
      console.log(`Nullable: ${placasColumn.is_nullable}`);
    } else {
      console.log('\n❌ Coluna quantidade_placas NÃO encontrada!');
      console.log('💡 Será necessário adicionar a coluna ao banco de dados.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();
