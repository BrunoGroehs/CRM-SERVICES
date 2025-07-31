// Middleware temporário para aplicar sistema de roles
const { ROLES, VALID_ROLES } = require('./config/roles');

async function applyRolesSystemToRunningServer(pool) {
  try {
    console.log('🔄 Aplicando sistema de roles no servidor em execução...');

    // 1. Verificar se a coluna role já tem o tamanho adequado
    const checkRoleColumn = `
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name = 'role';
    `;
    
    const roleColumnResult = await pool.query(checkRoleColumn);
    
    if (roleColumnResult.rows.length > 0) {
      console.log('✅ Coluna role já existe');
      
      // Verificar se precisa aumentar o tamanho
      const currentLength = roleColumnResult.rows[0].character_maximum_length;
      if (currentLength < 20) {
        console.log('🔄 Atualizando tamanho da coluna role...');
        await pool.query('ALTER TABLE usuarios ALTER COLUMN role TYPE VARCHAR(20);');
        console.log('✅ Tamanho da coluna atualizado');
      }
    } else {
      console.log('🔄 Adicionando coluna role...');
      await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) DEFAULT '${ROLES.USER}';`);
      console.log('✅ Coluna role adicionada');
    }

    // 2. Criar constraint para roles válidas
    console.log('🔄 Criando constraint para roles válidas...');
    await pool.query('ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS check_valid_role;');
    
    const validRolesString = VALID_ROLES.map(role => `'${role}'`).join(', ');
    const constraintQuery = `
      ALTER TABLE usuarios 
      ADD CONSTRAINT check_valid_role 
      CHECK (role IN (${validRolesString}));
    `;
    
    await pool.query(constraintQuery);
    console.log('✅ Constraint criada');

    // 3. Atualizar usuários existentes
    console.log('🔄 Atualizando usuários existentes...');
    const updateUsersQuery = `
      UPDATE usuarios 
      SET role = $1 
      WHERE role IS NULL OR role = '' OR role = 'user';
    `;
    
    const updateResult = await pool.query(updateUsersQuery, [ROLES.USER]);
    console.log(`✅ ${updateResult.rowCount} usuários atualizados`);

    // 4. Verificar se existe admin e promover o primeiro usuário se necessário
    const adminCheckQuery = 'SELECT COUNT(*) as admin_count FROM usuarios WHERE role = $1;';
    const adminResult = await pool.query(adminCheckQuery, [ROLES.ADMIN]);
    
    if (parseInt(adminResult.rows[0].admin_count) === 0) {
      console.log('⚠️  Nenhum administrador encontrado');
      
      const firstUserQuery = 'SELECT id, email FROM usuarios ORDER BY created_at ASC LIMIT 1;';
      const firstUserResult = await pool.query(firstUserQuery);
      
      if (firstUserResult.rows.length > 0) {
        const firstUser = firstUserResult.rows[0];
        await pool.query('UPDATE usuarios SET role = $1 WHERE id = $2;', [ROLES.ADMIN, firstUser.id]);
        console.log(`✅ Usuário ${firstUser.email} promovido a administrador`);
      }
    }

    // 5. Criar índice
    await pool.query('CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);');
    console.log('✅ Índice criado');

    // 6. Estatísticas
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

    console.log('\n🎉 Sistema de roles aplicado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao aplicar sistema de roles:', error);
    return false;
  }
}

module.exports = { applyRolesSystemToRunningServer };
