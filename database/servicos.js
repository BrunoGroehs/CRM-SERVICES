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
  funcionario_responsavel VARCHAR(255)[], -- agora array de IDs (como texto) dos usuários responsáveis
  funcionarios JSONB DEFAULT '[]',       -- DEPRECATED: antigo array de objetos { id, nome }
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Tabela "servicos" verificada/criada com sucesso');
  // Garantir coluna funcionarios para instalações existentes
  await pool.query("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS funcionarios JSONB DEFAULT '[]';");
  await pool.query("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS funcionario_responsavel VARCHAR(255)[];");

  // Garantir que a coluna funcionario_responsavel tenha o tipo ARRAY (caso instalações antigas tenham VARCHAR simples)
  try {
    const checkType = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'servicos' AND column_name = 'funcionario_responsavel'
    `);
    if (checkType.rows.length === 1 && checkType.rows[0].data_type !== 'ARRAY') {
      console.log('⚠️  Ajustando tipo da coluna funcionario_responsavel para ARRAY...');
      await pool.query(`
        ALTER TABLE servicos
        ALTER COLUMN funcionario_responsavel TYPE VARCHAR(255)[]
        USING (
          CASE 
            WHEN funcionario_responsavel IS NULL OR funcionario_responsavel::text = '' THEN NULL
            -- Se era uma string simples, coloca em array
            ELSE ARRAY[funcionario_responsavel::varchar(255)]
          END
        );
      `);
      console.log('✅ Coluna funcionario_responsavel convertida para ARRAY com sucesso');
    }
  } catch (convErr) {
    console.warn('Aviso: não foi possível verificar/ajustar tipo de funcionario_responsavel:', convErr.message);
  }

  // Migrar dados antigos se funcionario_responsavel (array) estiver vazio e funcionarios JSONB tiver dados
  try {
    const { rows } = await pool.query("SELECT id, funcionario_responsavel, funcionarios FROM servicos WHERE (funcionarios IS NOT NULL AND funcionarios::text <> '[]')");
    for (const row of rows) {
      if (!Array.isArray(row.funcionario_responsavel) || row.funcionario_responsavel.length === 0) {
        if (Array.isArray(row.funcionarios)) {
          const ids = row.funcionarios.map(f => (f && (f.id || f.user_id || f.userId)) ? String(f.id || f.user_id || f.userId) : null).filter(Boolean);
          if (ids.length > 0) {
            await pool.query('UPDATE servicos SET funcionario_responsavel = $1 WHERE id = $2', [ids, row.id]);
          }
        }
      }
    }
  } catch (migErr) {
    console.warn('Aviso: migração de funcionarios para funcionario_responsavel falhou ou não necessária:', migErr.message);
  }
    
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
