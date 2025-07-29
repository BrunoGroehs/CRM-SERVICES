const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Usando o pool de conexão global (será passado como parâmetro)
let pool;

// Função para inicializar o pool
const initializePool = (dbPool) => {
  pool = dbPool;
};

// Validação dos campos obrigatórios para serviços
const validateServicoFields = (servico) => {
  const errors = [];
  
  if (!servico.cliente_id || isNaN(servico.cliente_id)) {
    errors.push('cliente_id é obrigatório e deve ser um número válido');
  }
  
  if (!servico.data || servico.data.trim() === '') {
    errors.push('Data do serviço é obrigatória');
  }
  
  if (!servico.hora || servico.hora.trim() === '') {
    errors.push('Hora do serviço é obrigatória');
  }
  
  // Validação de formato de data (YYYY-MM-DD)
  if (servico.data) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(servico.data)) {
      errors.push('Data deve estar no formato YYYY-MM-DD');
    }
  }
  
  // Validação de status válido
  const statusValidos = ['agendado', 'em_andamento', 'concluido', 'cancelado'];
  if (servico.status && !statusValidos.includes(servico.status)) {
    errors.push('Status deve ser: agendado, em_andamento, concluido ou cancelado');
  }
  
  // Validação de valor (se fornecido)
  if (servico.valor && (isNaN(servico.valor) || parseFloat(servico.valor) < 0)) {
    errors.push('Valor deve ser um número positivo');
  }
  
  return errors;
};

// Função para verificar se cliente existe
const checkClienteExists = async (clienteId) => {
  try {
    const query = 'SELECT id FROM clientes WHERE id = $1';
    const result = await pool.query(query, [clienteId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Erro ao verificar cliente:', error);
    return false;
  }
};

// GET /servicos - Retorna todos os serviços
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        s.data,
        s.hora,
        s.valor,
        s.notas,
        s.status,
        s.funcionario_responsavel
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      ORDER BY s.data DESC, s.hora DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: 'Serviços recuperados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar serviços',
      error: error.message
    });
  }
});

// GET /servicos/:id - Retorna um serviço específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do serviço deve ser um número válido'
      });
    }
    
    const query = `
      SELECT 
        s.id,
        s.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        s.data,
        s.hora,
        s.valor,
        s.notas,
        s.status,
        s.funcionario_responsavel
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      WHERE s.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Serviço encontrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar serviço',
      error: error.message
    });
  }
});

// POST /servicos - Cria um novo serviço
router.post('/', async (req, res) => {
  try {
    const { 
      cliente_id, 
      data, 
      hora, 
      valor, 
      notas, 
      status = 'agendado', 
      funcionario_responsavel 
    } = req.body;
    
    // Validar campos obrigatórios
    const errors = validateServicoFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    // Verificar se cliente existe
    const clienteExists = await checkClienteExists(cliente_id);
    if (!clienteExists) {
      return res.status(400).json({
        success: false,
        message: 'Cliente não encontrado. Verifique se o cliente_id está correto.'
      });
    }
    
    const query = `
      INSERT INTO servicos (
        cliente_id, 
        data, 
        hora, 
        valor, 
        notas, 
        status, 
        funcionario_responsavel
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      cliente_id,
      data,
      hora,
      valor ? parseFloat(valor) : null,
      notas ? notas.trim() : null,
      status,
      funcionario_responsavel ? funcionario_responsavel.trim() : null
    ];
    
    const result = await pool.query(query, values);
    
    // Buscar o serviço criado com dados do cliente
    const servicoCompleto = await pool.query(`
      SELECT 
        s.*,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      WHERE s.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json({
      success: true,
      data: servicoCompleto.rows[0],
      message: 'Serviço criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao criar serviço',
      error: error.message
    });
  }
});

// PUT /servicos/:id - Atualiza um serviço existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      cliente_id, 
      data, 
      hora, 
      valor, 
      notas, 
      status, 
      funcionario_responsavel 
    } = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do serviço deve ser um número válido'
      });
    }
    
    // Validar campos obrigatórios
    const errors = validateServicoFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    // Verificar se o serviço existe
    const checkQuery = 'SELECT id FROM servicos WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado'
      });
    }
    
    // Verificar se cliente existe
    const clienteExists = await checkClienteExists(cliente_id);
    if (!clienteExists) {
      return res.status(400).json({
        success: false,
        message: 'Cliente não encontrado. Verifique se o cliente_id está correto.'
      });
    }
    
    const query = `
      UPDATE servicos 
      SET 
        cliente_id = $1,
        data = $2,
        hora = $3,
        valor = $4,
        notas = $5,
        status = $6,
        funcionario_responsavel = $7
      WHERE id = $8
      RETURNING *
    `;
    
    const values = [
      cliente_id,
      data,
      hora,
      valor ? parseFloat(valor) : null,
      notas ? notas.trim() : null,
      status || 'agendado',
      funcionario_responsavel ? funcionario_responsavel.trim() : null,
      id
    ];
    
    const result = await pool.query(query, values);
    
    // Buscar o serviço atualizado com dados do cliente
    const servicoCompleto = await pool.query(`
      SELECT 
        s.*,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      WHERE s.id = $1
    `, [id]);
    
    res.json({
      success: true,
      data: servicoCompleto.rows[0],
      message: 'Serviço atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao atualizar serviço',
      error: error.message
    });
  }
});

// DELETE /servicos/:id - Deleta um serviço
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do serviço deve ser um número válido'
      });
    }
    
    // Verificar se o serviço existe e buscar informações
    const checkQuery = `
      SELECT s.id, s.data, s.hora, c.nome as cliente_nome 
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      WHERE s.id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado'
      });
    }
    
    const deleteQuery = 'DELETE FROM servicos WHERE id = $1';
    await pool.query(deleteQuery, [id]);
    
    const servicoInfo = checkResult.rows[0];
    res.json({
      success: true,
      message: `Serviço do dia ${servicoInfo.data} às ${servicoInfo.hora} do cliente "${servicoInfo.cliente_nome}" deletado com sucesso`,
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('Erro ao deletar serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao deletar serviço',
      error: error.message
    });
  }
});

module.exports = { router, initializePool };
