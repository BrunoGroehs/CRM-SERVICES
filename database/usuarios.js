// Módulo para criação e gerenciamento da tabela de usuários
async function createUsuariosTable(pool) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        foto_perfil TEXT,
        role VARCHAR(20) DEFAULT 'user',
        ativo BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        ultimo_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    
    // Adicionar coluna created_by se não existir (para tabelas existentes)
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;');
    } catch (error) {
      // Ignorar erro se a coluna já existir
    }
    
    console.log('✅ Tabela "usuarios" verificada/criada com sucesso');
    
    // Criar índices para melhor performance e segurança
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);',
      'CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);',
      'CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);',
      'CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);'
    ];
    
    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Índices da tabela "usuarios" criados com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela "usuarios":', error);
    throw error;
  }
}

// Função para criar trigger de updated_at
async function createUsuariosUpdateTrigger(pool) {
  try {
    const createTriggerQuery = `
      CREATE OR REPLACE FUNCTION update_usuarios_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS trigger_update_usuarios_updated_at ON usuarios;
      
      CREATE TRIGGER trigger_update_usuarios_updated_at
        BEFORE UPDATE ON usuarios
        FOR EACH ROW
        EXECUTE FUNCTION update_usuarios_updated_at();
    `;
    
    await pool.query(createTriggerQuery);
    console.log('✅ Trigger de atualização da tabela "usuarios" criado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar trigger da tabela "usuarios":', error);
    throw error;
  }
}

module.exports = {
  createUsuariosTable,
  createUsuariosUpdateTrigger
};
