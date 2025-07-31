const { Pool } = require('pg');
require('dotenv').config();

const { ROLES, VALID_ROLES } = require('./config/roles');

async function updateDatabaseWithRoles() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    console.log('🔄 Iniciando atualização da base de dados com sistema de roles...');

    // 1. Primeiro, vamos verificar se a coluna role já existe e tem o tamanho adequado
    const checkRoleColumn = `
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name = 'role';
    `;
    
    const roleColumnResult = await pool.query(checkRoleColumn);
    
    if (roleColumnResult.rows.length > 0) {
      console.log('✅ Coluna role já existe na tabela usuarios');
      
      // Verificar se precisa aumentar o tamanho da coluna
      const currentLength = roleColumnResult.rows[0].character_maximum_length;
      if (currentLength < 20) {
        console.log('🔄 Atualizando tamanho da coluna role...');
        await pool.query('ALTER TABLE usuarios ALTER COLUMN role TYPE VARCHAR(20);');
        console.log('✅ Tamanho da coluna role atualizado');
      }
    } else {
      console.log('🔄 Adicionando coluna role à tabela usuarios...');
      await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) DEFAULT '${ROLES.USER}';`);
      console.log('✅ Coluna role adicionada');
    }

    // 2. Criar constraint para garantir que apenas roles válidas sejam aceitas
    console.log('🔄 Criando constraint para roles válidas...');
    
    // Primeiro remove a constraint se ela já existir
    await pool.query('ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS check_valid_role;');
    
    const validRolesString = VALID_ROLES.map(role => `'${role}'`).join(', ');
    const constraintQuery = `
      ALTER TABLE usuarios 
      ADD CONSTRAINT check_valid_role 
      CHECK (role IN (${validRolesString}));
    `;
    
    await pool.query(constraintQuery);
    console.log('✅ Constraint para roles válidas criada');

    // 3. Atualizar usuários existentes que não têm role definida
    console.log('🔄 Atualizando usuários existentes sem role...');
    
    const updateUsersQuery = `
      UPDATE usuarios 
      SET role = $1 
      WHERE role IS NULL OR role = '' OR role = 'user';
    `;
    
    const updateResult = await pool.query(updateUsersQuery, [ROLES.USER]);
    console.log(`✅ ${updateResult.rowCount} usuários atualizados com role 'user'`);

    // 4. Verificar se existe algum administrador no sistema
    const adminCheckQuery = 'SELECT COUNT(*) as admin_count FROM usuarios WHERE role = $1;';
    const adminResult = await pool.query(adminCheckQuery, [ROLES.ADMIN]);
    
    if (parseInt(adminResult.rows[0].admin_count) === 0) {
      console.log('⚠️  Nenhum administrador encontrado no sistema');
      
      // Se existe pelo menos um usuário, promover o primeiro a admin
      const firstUserQuery = 'SELECT id, email FROM usuarios ORDER BY created_at ASC LIMIT 1;';
      const firstUserResult = await pool.query(firstUserQuery);
      
      if (firstUserResult.rows.length > 0) {
        const firstUser = firstUserResult.rows[0];
        await pool.query('UPDATE usuarios SET role = $1 WHERE id = $2;', [ROLES.ADMIN, firstUser.id]);
        console.log(`✅ Usuário ${firstUser.email} promovido a administrador`);
      } else {
        console.log('⚠️  Nenhum usuário encontrado no sistema');
      }
    } else {
      console.log(`✅ Sistema já possui ${adminResult.rows[0].admin_count} administrador(es)`);
    }

    // 5. Criar índice para melhor performance nas consultas por role
    console.log('🔄 Criando índice para coluna role...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);');
    console.log('✅ Índice para role criado');

    // 6. Exibir estatísticas das roles
    const roleStatsQuery = `
      SELECT role, COUNT(*) as count 
      FROM usuarios 
      GROUP BY role 
      ORDER BY count DESC;
    `;
    
    const statsResult = await pool.query(roleStatsQuery);
    
    console.log('\n📊 Estatísticas das roles:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count} usuário(s)`);
    });

    console.log('\n🎉 Atualização da base de dados concluída com sucesso!');
    console.log('\n📋 Roles disponíveis:');
    console.log(`   • ${ROLES.ADMIN}: Acesso total ao sistema`);
    console.log(`   • ${ROLES.MANAGER}: Gestão de clientes, serviços e recontatos`);
    console.log(`   • ${ROLES.USER}: Acesso básico para operações do dia-a-dia`);

  } catch (error) {
    console.error('❌ Erro ao atualizar base de dados:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  updateDatabaseWithRoles()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { updateDatabaseWithRoles };
