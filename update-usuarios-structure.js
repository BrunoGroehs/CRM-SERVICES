// Script para atualizar a estrutura da tabela usuarios permitindo google_id NULL
const { Pool } = require('pg');
require('dotenv').config();

async function updateUsuariosTableStructure() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    console.log('🔄 Atualizando estrutura da tabela usuarios...');

    // Verificar se a coluna google_id permite NULL
    const checkConstraintQuery = `
      SELECT 
        column_name, 
        is_nullable, 
        data_type,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name = 'google_id';
    `;
    
    const constraintResult = await pool.query(checkConstraintQuery);
    
    if (constraintResult.rows.length > 0) {
      const column = constraintResult.rows[0];
      console.log(`📋 Coluna google_id atual: ${column.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      
      if (column.is_nullable === 'NO') {
        console.log('🔄 Alterando coluna google_id para permitir NULL...');
        
        // Alterar a coluna para permitir NULL
        await pool.query('ALTER TABLE usuarios ALTER COLUMN google_id DROP NOT NULL;');
        console.log('✅ Coluna google_id agora permite NULL');
      } else {
        console.log('✅ Coluna google_id já permite NULL');
      }
    } else {
      console.log('❌ Coluna google_id não encontrada');
      return;
    }

    // Verificar usuários existentes
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(google_id) as with_google_id,
        COUNT(*) - COUNT(google_id) as without_google_id
      FROM usuarios;
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('\n📊 Estatísticas dos usuários:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Com Google ID: ${stats.with_google_id}`);
    console.log(`   Sem Google ID: ${stats.without_google_id}`);
    
    if (parseInt(stats.without_google_id) > 0) {
      console.log('\n💡 Usuários sem Google ID poderão fazer login via OAuth para vincular suas contas');
    }

    console.log('\n🎉 Estrutura da tabela atualizada com sucesso!');
    console.log('\n📝 Funcionalidades habilitadas:');
    console.log('   • Criação manual de usuários pelo admin');
    console.log('   • Vinculação automática via Google OAuth no primeiro login');
    console.log('   • Manutenção de roles e permissões definidas pelo admin');

  } catch (error) {
    console.error('❌ Erro ao atualizar estrutura da tabela:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  updateUsuariosTableStructure()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { updateUsuariosTableStructure };
