const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAndFixUsuariosTable() {
  try {
    console.log('🔍 Verificando estrutura da tabela usuarios...');
    
    // Verificar se a tabela existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'usuarios'
      );
    `);
    
    console.log('📋 Tabela usuarios existe:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Verificar estrutura da tabela
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'usuarios'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Estrutura atual da tabela usuarios:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
      
      // Verificar se google_id existe
      const hasGoogleId = columns.rows.some(col => col.column_name === 'google_id');
      
      if (!hasGoogleId) {
        console.log('❌ Coluna google_id não encontrada. Adicionando...');
        
        // Adicionar colunas que faltam
        const alterQueries = [
          'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;',
          'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil TEXT;',
          'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'user\';',
          'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;',
          'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP;'
        ];
        
        for (const query of alterQueries) {
          try {
            await pool.query(query);
            console.log('✅ Executado:', query);
          } catch (err) {
            console.log('⚠️ Aviso:', err.message);
          }
        }
        
        // Criar índices
        const indexQueries = [
          'CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);',
          'CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);',
          'CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);'
        ];
        
        for (const query of indexQueries) {
          try {
            await pool.query(query);
            console.log('✅ Índice criado:', query);
          } catch (err) {
            console.log('⚠️ Aviso índice:', err.message);
          }
        }
        
      } else {
        console.log('✅ Coluna google_id já existe!');
      }
      
    } else {
      console.log('❌ Tabela usuarios não existe. Criando...');
      
      // Criar tabela completa
      const createTableQuery = `
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          google_id VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          nome VARCHAR(255) NOT NULL,
          foto_perfil TEXT,
          role VARCHAR(20) DEFAULT 'user',
          ativo BOOLEAN DEFAULT true,
          ultimo_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await pool.query(createTableQuery);
      console.log('✅ Tabela usuarios criada com sucesso!');
    }
    
    // Verificar estrutura final
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura final da tabela usuarios:');
    finalColumns.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkAndFixUsuariosTable();
