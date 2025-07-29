const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Usando o pool de conexão global (será passado como parâmetro)
let pool;

// Função para inicializar o pool
const initializePool = (dbPool) => {
  pool = dbPool;
};

// Validação dos campos obrigatórios
const validateClienteFields = (cliente) => {
  const errors = [];
  
  if (!cliente.nome || cliente.nome.trim() === '') {
    errors.push('Nome é obrigatório');
  }
  
  if (!cliente.telefone || cliente.telefone.trim() === '') {
    errors.push('Telefone é obrigatório');
  }
  
  if (!cliente.email || cliente.email.trim() === '') {
    errors.push('Email é obrigatório');
  }
  
  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (cliente.email && !emailRegex.test(cliente.email)) {
    errors.push('Email deve ter um formato válido');
  }
  
  return errors;
};

// GET /clientes - Retorna todos os clientes
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        nome, 
        telefone, 
        email, 
        endereco, 
        cidade, 
        cep, 
        created_at,
        updated_at
      FROM clientes 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: 'Clientes recuperados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar clientes',
      error: error.message
    });
  }
});

// GET /clientes/:id - Retorna um cliente específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente deve ser um número válido'
      });
    }
    
    const query = `
      SELECT 
        id, 
        nome, 
        telefone, 
        email, 
        endereco, 
        cidade, 
        cep, 
        created_at,
        updated_at
      FROM clientes 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cliente encontrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar cliente',
      error: error.message
    });
  }
});

// POST /clientes - Cria um novo cliente
router.post('/', async (req, res) => {
  try {
    const { nome, telefone, email, endereco, cidade, cep } = req.body;
    
    // Validar campos obrigatórios
    const errors = validateClienteFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    const query = `
      INSERT INTO clientes (nome, telefone, email, endereco, cidade, cep)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, telefone, email, endereco, cidade, cep, created_at, updated_at
    `;
    
    const values = [
      nome.trim(),
      telefone.trim(),
      email.trim().toLowerCase(),
      endereco ? endereco.trim() : null,
      cidade ? cidade.trim() : null,
      cep ? cep.trim() : null
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Cliente criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    
    // Tratamento de erro de email duplicado
    if (error.code === '23505' && error.constraint === 'clientes_email_key') {
      return res.status(409).json({
        success: false,
        message: 'Email já está sendo usado por outro cliente'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao criar cliente',
      error: error.message
    });
  }
});

// PUT /clientes/:id - Atualiza um cliente existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, endereco, cidade, cep } = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente deve ser um número válido'
      });
    }
    
    // Validar campos obrigatórios
    const errors = validateClienteFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    // Verificar se o cliente existe
    const checkQuery = 'SELECT id FROM clientes WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    const query = `
      UPDATE clientes 
      SET 
        nome = $1, 
        telefone = $2, 
        email = $3, 
        endereco = $4, 
        cidade = $5, 
        cep = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, nome, telefone, email, endereco, cidade, cep, created_at, updated_at
    `;
    
    const values = [
      nome.trim(),
      telefone.trim(),
      email.trim().toLowerCase(),
      endereco ? endereco.trim() : null,
      cidade ? cidade.trim() : null,
      cep ? cep.trim() : null,
      id
    ];
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cliente atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    
    // Tratamento de erro de email duplicado
    if (error.code === '23505' && error.constraint === 'clientes_email_key') {
      return res.status(409).json({
        success: false,
        message: 'Email já está sendo usado por outro cliente'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao atualizar cliente',
      error: error.message
    });
  }
});

// DELETE /clientes/:id - Deleta um cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente deve ser um número válido'
      });
    }
    
    // Verificar se o cliente existe
    const checkQuery = 'SELECT id, nome FROM clientes WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    const deleteQuery = 'DELETE FROM clientes WHERE id = $1';
    await pool.query(deleteQuery, [id]);
    
    res.json({
      success: true,
      message: `Cliente "${checkResult.rows[0].nome}" deletado com sucesso`,
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao deletar cliente',
      error: error.message
    });
  }
});

module.exports = { router, initializePool };
