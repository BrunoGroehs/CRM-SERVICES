const express = require('express');
const router = express.Router();

// Middleware para logs de requisições
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.originalUrl}`);
  next();
});

// GET /recontatos - Lista todos os recontatos
router.get('/', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    const query = `
      SELECT 
        r.id,
        r.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        r.data_agendada,
        r.hora_agendada,
        r.tipo_recontato,
        r.motivo,
        r.status,
        r.observacoes,
        r.funcionario_responsavel,
        r.data_realizado,
        r.resultado,
        r.created_at,
        r.updated_at
      FROM recontatos r
      INNER JOIN clientes c ON r.cliente_id = c.id
      ORDER BY r.data_agendada DESC, r.created_at DESC;
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: 'Recontatos recuperados com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao buscar recontatos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar recontatos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

// GET /recontatos/:id - Busca um recontato específico
router.get('/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    
    const query = `
      SELECT 
        r.id,
        r.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        r.data_agendada,
        r.hora_agendada,
        r.tipo_recontato,
        r.motivo,
        r.status,
        r.observacoes,
        r.funcionario_responsavel,
        r.data_realizado,
        r.resultado,
        r.created_at,
        r.updated_at
      FROM recontatos r
      INNER JOIN clientes c ON r.cliente_id = c.id
      WHERE r.id = $1;
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recontato não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Recontato encontrado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao buscar recontato:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar recontato',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

// POST /recontatos - Cria um novo recontato
router.post('/', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const {
      cliente_id,
      data_agendada,
      hora_agendada,
      tipo_recontato = 'follow-up',
      motivo,
      status = 'agendado',
      observacoes,
      funcionario_responsavel
    } = req.body;
    
    // Validação de campos obrigatórios
    if (!cliente_id || !data_agendada) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: cliente_id, data_agendada'
      });
    }
    
    // Verificar se o cliente existe
    const clienteExists = await pool.query(
      'SELECT id FROM clientes WHERE id = $1',
      [cliente_id]
    );
    
    if (clienteExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    // Validação de data
    const dataAgendada = new Date(data_agendada);
    if (isNaN(dataAgendada.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Data agendada deve estar no formato válido (YYYY-MM-DD)'
      });
    }
    
    // Validação de hora (se fornecida)
    if (hora_agendada) {
      const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!horaRegex.test(hora_agendada)) {
        return res.status(400).json({
          success: false,
          message: 'Hora agendada deve estar no formato HH:MM'
        });
      }
    }
    
    // Validação de status
    const statusValidos = ['agendado', 'realizado', 'cancelado', 'reagendado'];
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status deve ser um dos seguintes: ${statusValidos.join(', ')}`
      });
    }
    
    const insertQuery = `
      INSERT INTO recontatos (
        cliente_id,
        data_agendada,
        hora_agendada,
        tipo_recontato,
        motivo,
        status,
        observacoes,
        funcionario_responsavel
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;
    
    const values = [
      cliente_id,
      data_agendada,
      hora_agendada,
      tipo_recontato,
      motivo,
      status,
      observacoes,
      funcionario_responsavel
    ];
    
    const result = await pool.query(insertQuery, values);
    const novoRecontatoId = result.rows[0].id;
    
    // Buscar o recontato criado com dados do cliente
    const selectQuery = `
      SELECT 
        r.id,
        r.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        r.data_agendada,
        r.hora_agendada,
        r.tipo_recontato,
        r.motivo,
        r.status,
        r.observacoes,
        r.funcionario_responsavel,
        r.data_realizado,
        r.resultado,
        r.created_at,
        r.updated_at
      FROM recontatos r
      INNER JOIN clientes c ON r.cliente_id = c.id
      WHERE r.id = $1;
    `;
    
    const recontato = await pool.query(selectQuery, [novoRecontatoId]);
    
    res.status(201).json({
      success: true,
      data: recontato.rows[0],
      message: 'Recontato criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar recontato:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao criar recontato',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

// PUT /recontatos/:id - Atualiza um recontato
router.put('/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const {
      cliente_id,
      data_agendada,
      hora_agendada,
      tipo_recontato,
      motivo,
      status,
      observacoes,
      funcionario_responsavel,
      data_realizado,
      resultado
    } = req.body;
    
    // Verificar se o recontato existe
    const recontatoExists = await pool.query(
      'SELECT id FROM recontatos WHERE id = $1',
      [id]
    );
    
    if (recontatoExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recontato não encontrado'
      });
    }
    
    // Se cliente_id foi fornecido, verificar se existe
    if (cliente_id) {
      const clienteExists = await pool.query(
        'SELECT id FROM clientes WHERE id = $1',
        [cliente_id]
      );
      
      if (clienteExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }
    }
    
    // Validação de data (se fornecida)
    if (data_agendada) {
      const dataAgendada = new Date(data_agendada);
      if (isNaN(dataAgendada.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Data agendada deve estar no formato válido (YYYY-MM-DD)'
        });
      }
    }
    
    // Validação de hora (se fornecida)
    if (hora_agendada) {
      const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!horaRegex.test(hora_agendada)) {
        return res.status(400).json({
          success: false,
          message: 'Hora agendada deve estar no formato HH:MM'
        });
      }
    }
    
    // Validação de status (se fornecido)
    if (status) {
      const statusValidos = ['agendado', 'realizado', 'cancelado', 'reagendado'];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status deve ser um dos seguintes: ${statusValidos.join(', ')}`
        });
      }
    }
    
    // Construir query de atualização dinamicamente
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (cliente_id !== undefined) {
      updates.push(`cliente_id = $${paramCount++}`);
      values.push(cliente_id);
    }
    if (data_agendada !== undefined) {
      updates.push(`data_agendada = $${paramCount++}`);
      values.push(data_agendada);
    }
    if (hora_agendada !== undefined) {
      updates.push(`hora_agendada = $${paramCount++}`);
      values.push(hora_agendada);
    }
    if (tipo_recontato !== undefined) {
      updates.push(`tipo_recontato = $${paramCount++}`);
      values.push(tipo_recontato);
    }
    if (motivo !== undefined) {
      updates.push(`motivo = $${paramCount++}`);
      values.push(motivo);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (observacoes !== undefined) {
      updates.push(`observacoes = $${paramCount++}`);
      values.push(observacoes);
    }
    if (funcionario_responsavel !== undefined) {
      updates.push(`funcionario_responsavel = $${paramCount++}`);
      values.push(funcionario_responsavel);
    }
    if (data_realizado !== undefined) {
      updates.push(`data_realizado = $${paramCount++}`);
      values.push(data_realizado);
    }
    if (resultado !== undefined) {
      updates.push(`resultado = $${paramCount++}`);
      values.push(resultado);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar foi fornecido'
      });
    }
    
    // Adicionar updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const updateQuery = `
      UPDATE recontatos 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id;
    `;
    
    await pool.query(updateQuery, values);
    
    // Buscar o recontato atualizado com dados do cliente
    const selectQuery = `
      SELECT 
        r.id,
        r.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        r.data_agendada,
        r.hora_agendada,
        r.tipo_recontato,
        r.motivo,
        r.status,
        r.observacoes,
        r.funcionario_responsavel,
        r.data_realizado,
        r.resultado,
        r.created_at,
        r.updated_at
      FROM recontatos r
      INNER JOIN clientes c ON r.cliente_id = c.id
      WHERE r.id = $1;
    `;
    
    const result = await pool.query(selectQuery, [id]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Recontato atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar recontato:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao atualizar recontato',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

// DELETE /recontatos/:id - Remove um recontato
router.delete('/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    
    // Verificar se o recontato existe
    const recontatoExists = await pool.query(
      'SELECT id FROM recontatos WHERE id = $1',
      [id]
    );
    
    if (recontatoExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recontato não encontrado'
      });
    }
    
    await pool.query('DELETE FROM recontatos WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Recontato removido com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao remover recontato:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao remover recontato',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

module.exports = router;
