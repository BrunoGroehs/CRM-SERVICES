// Tabela de relacionamento N:N entre servicos e usuarios
// Cria a tabela e migra dados existentes do campo antigo servicos.funcionario_responsavel (array) se presente
async function createServicosUsuariosTable(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS servicos_usuarios (
        id SERIAL PRIMARY KEY,
        servico_id INTEGER NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    percentual NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(servico_id, usuario_id)
      );
    `);

  // Garantir coluna percentual existe em bases já criadas
  await pool.query('ALTER TABLE servicos_usuarios ADD COLUMN IF NOT EXISTS percentual NUMERIC;');

    // Índices para performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_servicos_usuarios_servico_id ON servicos_usuarios(servico_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_servicos_usuarios_usuario_id ON servicos_usuarios(usuario_id);');

  console.log('✅ Tabela "servicos_usuarios" verificada/criada');
  } catch (error) {
    console.error('❌ Erro ao criar/migrar tabela servicos_usuarios:', error.message);
    throw error;
  }
}

module.exports = { createServicosUsuariosTable };
