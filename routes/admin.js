const express = require('express');
const router = express.Router();
const { authenticateToken, checkActiveUser, requireAdmin, checkPermission } = require('../middleware/auth');
const { 
  ROLES, 
  VALID_ROLES, 
  getRolePermissions, 
  isValidRole,
  canManagerCreateRole,
  canUserViewUser,
  canUserEditUser,
  getAvailableRolesForUser
} = require('../config/roles');

let pool;

// Aplicar middlewares de autenticação para todas as rotas
router.use(authenticateToken);
router.use(checkActiveUser);

// Middleware para verificar se o usuário tem permissão administrativa (admin ou manager)
const requireAdminOrManager = (req, res, next) => {
  if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Permissão administrativa necessária.'
    });
  }
};

// GET /admin/users - Listar usuários (admin vê todos, manager vê apenas sua equipe)
router.get('/users', requireAdminOrManager, async (req, res) => {
  try {
    let query;
    let queryParams = [];
    
    if (req.user.role === ROLES.ADMIN) {
      // Admin vê todos os usuários
      query = `
        SELECT u.id, u.google_id, u.email, u.nome, u.foto_perfil, u.role, u.ativo, 
               u.ultimo_login, u.created_at, u.updated_at
        FROM usuarios u
        ORDER BY u.created_at DESC
      `;
    } else if (req.user.role === ROLES.MANAGER) {
      // Manager vê apenas usuários comuns (temporariamente até implementarmos created_by)
      query = `
        SELECT u.id, u.google_id, u.email, u.nome, u.foto_perfil, u.role, u.ativo, 
               u.ultimo_login, u.created_at, u.updated_at
        FROM usuarios u
        WHERE u.role = 'user'
        ORDER BY u.created_at DESC
      `;
    }
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /admin/users/:id - Buscar usuário específico (apenas admin)
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT id, google_id, email, nome, foto_perfil, role, ativo, ultimo_login, created_at, updated_at
      FROM usuarios 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /admin/users - Criar novo usuário (admin ou manager com limitações)
router.post('/users', requireAdminOrManager, async (req, res) => {
  try {
    const { email, nome, role = ROLES.USER, ativo = true } = req.body;
    
    // Validações básicas
    if (!email || !nome) {
      return res.status(400).json({
        success: false,
        message: 'Email e nome são obrigatórios'
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Verificar se o usuário atual pode criar usuários com a role solicitada
    const availableRoles = getAvailableRolesForUser(req.user.role);
    if (!availableRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Você não tem permissão para criar usuários com a role '${role}'. Roles disponíveis: ${availableRoles.join(', ')}`
      });
    }

    // Verificar se o usuário já existe
    const existingUserQuery = 'SELECT id, email FROM usuarios WHERE email = $1';
    const existingUserResult = await pool.query(existingUserQuery, [email.toLowerCase()]);
    
    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Já existe um usuário com este email'
      });
    }
    
    // Criar o usuário (temporariamente sem created_by até adicionarmos a coluna)
    const createUserQuery = `
      INSERT INTO usuarios (email, nome, role, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, nome, role, ativo, created_at
    `;
    
    const createResult = await pool.query(createUserQuery, [
      email.toLowerCase(),
      nome.trim(),
      role,
      ativo
    ]);
    
    const newUser = createResult.rows[0];
    
    res.status(201).json({
      success: true,
      message: `Usuário ${newUser.email} criado com sucesso`,
      user: newUser
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    if (error.code === '23505') { // Violação de constraint unique
      res.status(409).json({
        success: false,
        message: 'Email já está em uso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
});

// PUT /admin/users/:id/role - Alterar role do usuário (apenas admin)
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Validar se a role é válida
    if (!isValidRole(role)) {
      return res.status(400).json({
        success: false,
        message: `Role inválida. Roles válidas: ${VALID_ROLES.join(', ')}`
      });
    }
    
    // Não permitir que o usuário altere sua própria role
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não é possível alterar sua própria role'
      });
    }
    
    // Verificar se o usuário existe
    const checkUserQuery = 'SELECT id, email, role FROM usuarios WHERE id = $1';
    const userResult = await pool.query(checkUserQuery, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const targetUser = userResult.rows[0];
    
    // Verificar se há pelo menos um admin no sistema antes de remover
    if (targetUser.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
      const adminCountQuery = 'SELECT COUNT(*) as count FROM usuarios WHERE role = $1';
      const adminCountResult = await pool.query(adminCountQuery, [ROLES.ADMIN]);
      
      if (parseInt(adminCountResult.rows[0].count) <= 1) {
        return res.status(403).json({
          success: false,
          message: 'Não é possível remover o último administrador do sistema'
        });
      }
    }
    
    // Atualizar a role
    const updateQuery = `
      UPDATE usuarios 
      SET role = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, email, nome, role
    `;
    
    const updateResult = await pool.query(updateQuery, [role, id]);
    
    res.json({
      success: true,
      message: `Role do usuário ${targetUser.email} alterada para ${role}`,
      user: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao alterar role do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /admin/users/:id/status - Ativar/desativar usuário (apenas admin)
router.put('/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;
    
    // Não permitir que o usuário desative a si mesmo
    if (parseInt(id) === req.user.id && !ativo) {
      return res.status(403).json({
        success: false,
        message: 'Não é possível desativar sua própria conta'
      });
    }
    
    // Verificar se o usuário existe
    const checkUserQuery = 'SELECT id, email, role FROM usuarios WHERE id = $1';
    const userResult = await pool.query(checkUserQuery, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const targetUser = userResult.rows[0];
    
    // Verificar se há pelo menos um admin ativo antes de desativar
    if (targetUser.role === ROLES.ADMIN && !ativo) {
      const activeAdminQuery = 'SELECT COUNT(*) as count FROM usuarios WHERE role = $1 AND ativo = true';
      const activeAdminResult = await pool.query(activeAdminQuery, [ROLES.ADMIN]);
      
      if (parseInt(activeAdminResult.rows[0].count) <= 1) {
        return res.status(403).json({
          success: false,
          message: 'Não é possível desativar o último administrador ativo'
        });
      }
    }
    
    // Atualizar o status
    const updateQuery = `
      UPDATE usuarios 
      SET ativo = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, email, nome, role, ativo
    `;
    
    const updateResult = await pool.query(updateQuery, [ativo, id]);
    
    res.json({
      success: true,
      message: `Usuário ${targetUser.email} ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      user: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /admin/users/:id - Excluir usuário (admin ou manager com limitações)
router.delete('/users/:id', requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Não permitir que o usuário exclua a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não é possível excluir sua própria conta'
      });
    }
    
    // Verificar se o usuário existe
    const checkUserQuery = 'SELECT id, email, role FROM usuarios WHERE id = $1';
    const userResult = await pool.query(checkUserQuery, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const targetUser = userResult.rows[0];
    
    // Verificar permissões baseadas no role do usuário atual
    if (req.user.role === ROLES.MANAGER) {
      // Manager só pode deletar usuários comuns (temporariamente até implementarmos created_by)
      if (targetUser.role !== ROLES.USER) {
        return res.status(403).json({
          success: false,
          message: 'Você só pode excluir usuários comuns'
        });
      }
    }
    
    // Verificar se há pelo menos um admin antes de excluir (apenas para admins)
    if (targetUser.role === ROLES.ADMIN && req.user.role === ROLES.ADMIN) {
      const adminCountQuery = 'SELECT COUNT(*) as count FROM usuarios WHERE role = $1';
      const adminCountResult = await pool.query(adminCountQuery, [ROLES.ADMIN]);
      
      if (parseInt(adminCountResult.rows[0].count) <= 1) {
        return res.status(403).json({
          success: false,
          message: 'Não é possível excluir o último administrador do sistema'
        });
      }
    }
    
    // Excluir o usuário
    const deleteQuery = 'DELETE FROM usuarios WHERE id = $1 RETURNING email';
    const deleteResult = await pool.query(deleteQuery, [id]);
    
    res.json({
      success: true,
      message: `Usuário ${targetUser.email} excluído com sucesso`
    });
    
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /admin/roles - Listar roles disponíveis e suas permissões
router.get('/roles', requireAdmin, async (req, res) => {
  try {
    const rolesInfo = VALID_ROLES.map(role => ({
      name: role,
      permissions: getRolePermissions(role)
    }));
    
    res.json({
      success: true,
      roles: rolesInfo
    });
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /admin/stats - Estatísticas dos usuários (apenas admin)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const queries = [
      // Total de usuários por role
      `SELECT role, COUNT(*) as count FROM usuarios GROUP BY role ORDER BY count DESC`,
      // Total de usuários ativos/inativos
      `SELECT ativo, COUNT(*) as count FROM usuarios GROUP BY ativo`,
      // Usuários criados nos últimos 30 dias
      `SELECT COUNT(*) as count FROM usuarios WHERE created_at >= NOW() - INTERVAL '30 days'`,
      // Último login nos últimos 7 dias
      `SELECT COUNT(*) as count FROM usuarios WHERE ultimo_login >= NOW() - INTERVAL '7 days'`
    ];
    
    const [roleStats, statusStats, recentUsers, activeUsers] = await Promise.all(
      queries.map(query => pool.query(query))
    );
    
    res.json({
      success: true,
      stats: {
        roleDistribution: roleStats.rows,
        statusDistribution: statusStats.rows,
        recentRegistrations: parseInt(recentUsers.rows[0].count),
        recentlyActive: parseInt(activeUsers.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /admin/available-roles - Obter roles disponíveis para criação
router.get('/available-roles', requireAdminOrManager, async (req, res) => {
  try {
    console.log('📝 Buscando roles disponíveis para usuário:', req.user.role);
    const availableRoles = getAvailableRolesForUser(req.user.role);
    console.log('📝 Roles disponíveis:', availableRoles);
    
    const rolesWithLabels = availableRoles.map(role => ({
      value: role,
      label: role === ROLES.ADMIN ? 'Administrador' : 
             role === ROLES.MANAGER ? 'Gerente' : 'Usuário'
    }));
    
    console.log('📝 Roles com labels:', rolesWithLabels);
    
    res.json({
      success: true,
      roles: rolesWithLabels
    });
  } catch (error) {
    console.error('Erro ao buscar roles disponíveis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Função para inicializar o pool
const initializePool = (poolInstance) => {
  pool = poolInstance;
};

module.exports = { router, initializePool };
