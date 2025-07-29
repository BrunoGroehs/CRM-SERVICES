require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateRecontatosTable() {
  try {
    console.log('🔧 Iniciando migração da tabela recontatos...');
    
    // Adicionar colunas que estão faltando
    const alterQueries = [
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS hora_agendada TIME;',
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS tipo_recontato VARCHAR(100) DEFAULT \'follow-up\';',
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS motivo TEXT;',
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS funcionario_responsavel VARCHAR(255);',
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS data_realizado TIMESTAMP;',
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS resultado TEXT;',
      'ALTER TABLE recontatos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;',
      
      // Alterar data_agendada para o tipo correto (de TIMESTAMP para DATE)
      'ALTER TABLE recontatos ALTER COLUMN data_agendada TYPE DATE;',
      
      // Alterar status para ter default
      'ALTER TABLE recontatos ALTER COLUMN status SET DEFAULT \'agendado\';'
    ];
    
    for (const query of alterQueries) {
      try {
        await pool.query(query);
        console.log('✅ Executado:', query.substring(0, 60) + '...');
      } catch (error) {
        if (error.code !== '42701' && error.code !== '42P16') { // Ignore "column already exists" and "type already exists"
          console.log('⚠️ Aviso:', error.message);
        }
      }
    }
    
    // Criar trigger para updated_at se não existir
    const triggerQuery = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_recontatos_updated_at ON recontatos;
      CREATE TRIGGER update_recontatos_updated_at
          BEFORE UPDATE ON recontatos
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(triggerQuery);
    console.log('✅ Trigger de updated_at criado');
    
    // Criar índices
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_recontatos_cliente_id ON recontatos(cliente_id);',
      'CREATE INDEX IF NOT EXISTS idx_recontatos_data_agendada ON recontatos(data_agendada);',
      'CREATE INDEX IF NOT EXISTS idx_recontatos_status ON recontatos(status);',
      'CREATE INDEX IF NOT EXISTS idx_recontatos_created_at ON recontatos(created_at);'
    ];
    
    for (const query of indexQueries) {
      await pool.query(query);
      console.log('✅ Índice criado:', query.match(/idx_\w+/)[0]);
    }
    
    console.log('🎉 Migração da tabela recontatos concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    await pool.end();
  }
}

migrateRecontatosTable();
