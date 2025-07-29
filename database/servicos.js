const { Pool } = require('pg');

// Função para criar a tabela de serviços se ela não existir
async function createServicosTable(pool) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        data DATE NOT NULL,
        hora VARCHAR(10) NOT NULL,
        valor DECIMAL(10,2),
        notas TEXT,
        status VARCHAR(50) DEFAULT 'agendado',
        funcionario_responsavel VARCHAR(255),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Tabela "servicos" verificada/criada com sucesso');
    
    // Criar índices para melhor performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_servicos_cliente_id ON servicos(cliente_id);',
      'CREATE INDEX IF NOT EXISTS idx_servicos_data ON servicos(data);',
      'CREATE INDEX IF NOT EXISTS idx_servicos_status ON servicos(status);'
    ];
    
    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Índices da tabela "servicos" criados com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela servicos:', error);
    throw error;
  }
}

// Função para criar trigger de atualização automática do updated_at para serviços
async function createServicosUpdateTrigger(pool) {
  try {
    // Criar trigger na tabela servicos
    const createTriggerQuery = `
      DROP TRIGGER IF EXISTS update_servicos_updated_at ON servicos;
      CREATE TRIGGER update_servicos_updated_at
        BEFORE UPDATE ON servicos
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(createTriggerQuery);
    console.log('✅ Trigger de atualização automática para serviços criado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar trigger para servicos:', error);
    throw error;
  }
}

module.exports = {
  createServicosTable,
  createServicosUpdateTrigger
};
