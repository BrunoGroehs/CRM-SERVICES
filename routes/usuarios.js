const express = require('express');
const { authenticateToken, checkActiveUser, checkRole } = require('../middleware/auth');
const { validateNumericId, sanitizeInput } = require('../middleware/validation');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Inicializar pool
let pool;
const initializePool = (poolInstance) => {
  pool = poolInstance;
};

// Aplicar middlewares de segurança
router.use(sanitizeInput);
router.use(authenticateToken);
router.use(checkActiveUser);

// Listar todos os usuários (apenas admin)
router.get('/', checkRole(['admin']), strictLimiter, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        id, 
        email, 
        nome, 
        foto_perfil, 
        role, 
        ativo, 
        ultimo_login, 
        created_at 
      FROM usuarios 
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query);
    client.release();
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: 'Usuários recuperados com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// Buscar usuário por ID
router.get('/:id', validateNumericId(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Usuários só podem ver seus próprios dados, exceto admins
    if (req.user.role !== 'admin' && parseInt(id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const client = await pool.connect();
    
    const query = `
      SELECT 
        id, 
        email, 
        nome, 
        foto_perfil, 
        role, 
        ativo, 
        ultimo_login, 
        created_at 
      FROM usuarios 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário encontrado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// Atualizar usuário
router.put('/:id', validateNumericId(), strictLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, role, ativo } = req.body;
    
    // Usuários só podem editar seus próprios dados básicos
    if (req.user.role !== 'admin' && parseInt(id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    // Apenas admins podem alterar role e status ativo
    if (req.user.role !== 'admin' && (role !== undefined || ativo !== undefined)) {
      return res.status(403).json({
        success: false,
        message: 'Permissão insuficiente para alterar role ou status'
      });
    }
    
    const client = await pool.connect();
    
    // Verificar se usuário existe
    const userCheck = await client.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Construir query de atualização dinamicamente
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (nome) {
      updateFields.push(`nome = $${paramCount}`);
      values.push(nome);
      paramCount++;
    }
    
    if (req.user.role === 'admin') {
      if (role !== undefined) {
        updateFields.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }
      
      if (ativo !== undefined) {
        updateFields.push(`ativo = $${paramCount}`);
        values.push(ativo);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido para atualização'
      });
    }
    
    // Adicionar ID no final
    values.push(id);
    
    const updateQuery = `
      UPDATE usuarios 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, nome, foto_perfil, role, ativo, ultimo_login, created_at
    `;
    
    const result = await client.query(updateQuery, values);
    client.release();
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// Desativar usuário (soft delete)
router.delete('/:id', validateNumericId(), checkRole(['admin']), strictLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Não permitir que admin desative a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível desativar sua própria conta'
      });
    }
    
    const client = await pool.connect();
    
    const result = await client.query(
      `UPDATE usuarios 
       SET ativo = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, email, nome`,
      [id]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário desativado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao desativar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// Reativar usuário
router.post('/:id/activate', validateNumericId(), checkRole(['admin']), strictLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(
      `UPDATE usuarios 
       SET ativo = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, email, nome`,
      [id]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário reativado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao reativar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

module.exports = {
  router,
  initializePool
};
