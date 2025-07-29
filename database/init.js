const { Pool } = require('pg');
const { createServicosTable, createServicosUpdateTrigger } = require('./servicos');

// Função para criar a tabela de clientes se ela não existir
async function createClientesTable(pool) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        endereco TEXT,
        cidade VARCHAR(100),
        cep VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Tabela "clientes" verificada/criada com sucesso');
    
    // Criar índices para melhor performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);',
      'CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);',
      'CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at);'
    ];
    
    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Índices da tabela "clientes" criados com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela clientes:', error);
    throw error;
  }
}

// Função para criar trigger de atualização automática do updated_at
async function createUpdateTrigger(pool) {
  try {
    // Criar função para atualizar updated_at
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    await pool.query(createFunctionQuery);
    
    // Criar trigger na tabela clientes
    const createTriggerQuery = `
      DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
      CREATE TRIGGER update_clientes_updated_at
        BEFORE UPDATE ON clientes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(createTriggerQuery);
    console.log('✅ Trigger de atualização automática criado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar trigger:', error);
    throw error;
  }
}

// Função principal para inicializar o banco de dados
async function initializeDatabase(pool) {
  try {
    console.log('🔧 Inicializando estrutura do banco de dados...');
    
    await createClientesTable(pool);
    await createUpdateTrigger(pool);
    
    // Verificar se tabela servicos existe
    const servicosExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'servicos'
      );
    `);
    
    if (servicosExists.rows[0].exists) {
      console.log('✅ Tabela "servicos" já existe e está pronta para uso');
    } else {
      await createServicosTable(pool);
      await createServicosUpdateTrigger(pool);
    }
    
    console.log('✅ Banco de dados inicializado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  createClientesTable,
  createUpdateTrigger
};
