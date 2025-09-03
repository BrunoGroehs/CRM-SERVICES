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

// Validação específica para updates - permite atualizações parciais
const validateServicoUpdateFields = (servico) => {
  const errors = [];
  
  // Só valida os campos que foram fornecidos
  if (servico.cliente_id !== undefined && (isNaN(servico.cliente_id) || !servico.cliente_id)) {
    errors.push('cliente_id deve ser um número válido');
  }
  
  if (servico.data !== undefined && (!servico.data || servico.data.trim() === '')) {
    errors.push('Data do serviço não pode estar vazia');
  }
  
  if (servico.hora !== undefined && (!servico.hora || servico.hora.trim() === '')) {
    errors.push('Hora do serviço não pode estar vazia');
  }
  
  // Validação de formato de data (YYYY-MM-DD)
  if (servico.data && servico.data.trim() !== '') {
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
  if (servico.valor !== undefined && servico.valor !== '' && servico.valor !== null && 
      (isNaN(servico.valor) || parseFloat(servico.valor) < 0)) {
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

// Helper: sanitizar array de IDs de usuários
const sanitizeUsuariosArray = (input) => {
  if (Array.isArray(input)) {
    return [...new Set(input.filter(v => v !== null && v !== undefined && v !== '').map(v => parseInt(v, 10)).filter(v => !isNaN(v)))] ;
  }
  if (typeof input === 'string') {
    const parts = input.split(/[;,\s]+/).map(p => p.trim()).filter(Boolean);
    return [...new Set(parts.map(p => parseInt(p, 10)).filter(v => !isNaN(v)))];
  }
  return [];
};

// GET /servicos - Retorna todos os serviços (agora agregando usuários responsáveis via join table)
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
        COALESCE(array_agg(su.usuario_id::text) FILTER (WHERE su.usuario_id IS NOT NULL), '{}') AS funcionario_responsavel
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
      GROUP BY s.id, c.nome, c.telefone
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

// GET /servicos/:id - Retorna um serviço específico (com array de usuários)
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
        COALESCE(array_agg(su.usuario_id::text) FILTER (WHERE su.usuario_id IS NOT NULL), '{}') AS funcionario_responsavel
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, c.nome, c.telefone, c.email
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

// GET /servicos/cliente/:clienteId - Retorna histórico com usuários responsáveis
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    if (!clienteId || isNaN(clienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente deve ser um número válido'
      });
    }
    
    // Verificar se cliente existe
    const clienteExists = await checkClienteExists(clienteId);
    if (!clienteExists) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
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
        COALESCE(array_agg(su.usuario_id::text) FILTER (WHERE su.usuario_id IS NOT NULL), '{}') AS funcionario_responsavel
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
      WHERE s.cliente_id = $1
      GROUP BY s.id, c.nome, c.telefone, c.email
      ORDER BY s.data DESC, s.hora DESC
    `;
    const result = await pool.query(query, [clienteId]);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: `Histórico de serviços do cliente ${clienteId} recuperado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar histórico do cliente',
      error: error.message
    });
  }
});

// POST /servicos - Cria um novo serviço (persistindo relacionamento N:N)
router.post('/', async (req, res) => {
  try {
  let { cliente_id, data, hora, valor, notas, status = 'agendado', funcionario_responsavel } = req.body;
  const responsaveisIds = sanitizeUsuariosArray(funcionario_responsavel);
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
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertServico = await client.query(
        `INSERT INTO servicos (cliente_id, data, hora, valor, notas, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          cliente_id,
          data,
          hora,
          valor ? parseFloat(valor) : null,
          notas ? notas.trim() : null,
          status
        ]
      );
      const servicoId = insertServico.rows[0].id;
      if (responsaveisIds.length) {
        for (const uid of responsaveisIds) {
          await client.query(
            'INSERT INTO servicos_usuarios (servico_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [servicoId, uid]
          );
        }
      }
      await client.query('COMMIT');
      // Buscar agregado
      const servicoCompleto = await pool.query(`
        SELECT s.id, s.cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
               s.data, s.hora, s.valor, s.notas, s.status,
               COALESCE(array_agg(su.usuario_id::text) FILTER (WHERE su.usuario_id IS NOT NULL), '{}') AS funcionario_responsavel
        FROM servicos s
        LEFT JOIN clientes c ON s.cliente_id = c.id
        LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
        WHERE s.id = $1
        GROUP BY s.id, c.nome, c.telefone
      `, [servicoId]);
      res.status(201).json({
        success: true,
        data: servicoCompleto.rows[0],
        message: 'Serviço criado com sucesso'
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar serviço:', { message: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao criar serviço',
      error: error.message
    });
  }
});

// PUT /servicos/:id - Atualiza um serviço existente (e seus responsáveis, se fornecidos)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
  let { cliente_id, data, hora, valor, notas, status, funcionario_responsavel } = req.body;
  const responsaveisIds = funcionario_responsavel !== undefined ? sanitizeUsuariosArray(funcionario_responsavel) : undefined;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do serviço deve ser um número válido'
      });
    }

    // Verificar se o serviço existe e buscar dados atuais
  const checkQuery = 'SELECT * FROM servicos WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado'
      });
    }

    const currentService = checkResult.rows[0];

    // Para atualizações parciais (como só status), usar dados existentes
    const updateData = {
      cliente_id: cliente_id !== undefined ? cliente_id : currentService.cliente_id,
      data: data !== undefined ? data : currentService.data,
      hora: hora !== undefined ? hora : currentService.hora,
      valor: valor !== undefined ? valor : currentService.valor,
      notas: notas !== undefined ? notas : currentService.notas,
      status: status !== undefined ? status : currentService.status
    };

    // Validar os dados de update (permite atualizações parciais)
    const errors = validateServicoUpdateFields(req.body);
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    // Verificar se cliente existe (só se cliente_id foi fornecido)
    if (cliente_id !== undefined) {
      const clienteExists = await checkClienteExists(cliente_id);
      if (!clienteExists) {
        return res.status(400).json({
          success: false,
          message: 'Cliente não encontrado. Verifique se o cliente_id está correto.'
        });
      }
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        UPDATE servicos SET
          cliente_id = $1,
          data = $2,
          hora = $3,
          valor = $4,
          notas = $5,
          status = $6
        WHERE id = $7
      `, [
        updateData.cliente_id,
        updateData.data,
        updateData.hora,
        updateData.valor ? parseFloat(updateData.valor) : null,
        updateData.notas ? updateData.notas.trim() : null,
        updateData.status || 'agendado',
        id
      ]);
      if (responsaveisIds !== undefined) {
        await client.query('DELETE FROM servicos_usuarios WHERE servico_id = $1', [id]);
        for (const uid of responsaveisIds) {
          await client.query('INSERT INTO servicos_usuarios (servico_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, uid]);
        }
      }
      await client.query('COMMIT');
      const servicoCompleto = await pool.query(`
        SELECT s.id, s.cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
               s.data, s.hora, s.valor, s.notas, s.status,
               COALESCE(array_agg(su.usuario_id::text) FILTER (WHERE su.usuario_id IS NOT NULL), '{}') AS funcionario_responsavel
        FROM servicos s
        LEFT JOIN clientes c ON s.cliente_id = c.id
        LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
        WHERE s.id = $1
        GROUP BY s.id, c.nome, c.telefone
      `, [id]);
      res.json({
        success: true,
        data: servicoCompleto.rows[0],
        message: 'Serviço atualizado com sucesso'
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao atualizar serviço:', { message: error.message, stack: error.stack });
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
