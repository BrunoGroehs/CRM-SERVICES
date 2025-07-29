const { Pool } = require('pg');

// Função para criar a tabela de recontatos se ela não existir
async function createRecontatosTable(pool) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS recontatos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        data_agendada DATE NOT NULL,
        hora_agendada TIME,
        tipo_recontato VARCHAR(100) DEFAULT 'follow-up',
        motivo TEXT,
        status VARCHAR(50) DEFAULT 'agendado',
        observacoes TEXT,
        funcionario_responsavel VARCHAR(255),
        data_realizado TIMESTAMP,
        resultado TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Tabela "recontatos" verificada/criada com sucesso');
    
    // Criar índices para melhor performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_recontatos_cliente_id ON recontatos(cliente_id);',
      'CREATE INDEX IF NOT EXISTS idx_recontatos_data_agendada ON recontatos(data_agendada);',
      'CREATE INDEX IF NOT EXISTS idx_recontatos_status ON recontatos(status);',
      'CREATE INDEX IF NOT EXISTS idx_recontatos_created_at ON recontatos(created_at);'
    ];
    
    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Índices da tabela "recontatos" criados com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela recontatos:', error);
    throw error;
  }
}

// Função para criar trigger de atualização automática do updated_at para recontatos
async function createRecontatosUpdateTrigger(pool) {
  try {
    // Criar trigger na tabela recontatos
    const createTriggerQuery = `
      DROP TRIGGER IF EXISTS update_recontatos_updated_at ON recontatos;
      CREATE TRIGGER update_recontatos_updated_at
        BEFORE UPDATE ON recontatos
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(createTriggerQuery);
    console.log('✅ Trigger de atualização automática para recontatos criado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar trigger para recontatos:', error);
    throw error;
  }
}

module.exports = {
  createRecontatosTable,
  createRecontatosUpdateTrigger
};
