// Middleware de validação e sanitização
const validator = require('validator');

// Sanitizar dados de entrada
const sanitizeInput = (req, res, next) => {
  try {
    // Função para sanitizar strings
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return validator.escape(str.trim());
    };

    // Função recursiva para sanitizar objetos
    const sanitizeObject = (obj) => {
      if (obj === null || obj === undefined) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      
      return obj;
    };

    // Sanitizar body, query e params
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Erro na sanitização:', error);
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos'
    });
  }
};

// Validar formato de email
const validateEmail = (req, res, next) => {
  try {
    if (req.body.email && !validator.isEmail(req.body.email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }
    next();
  } catch (error) {
    console.error('Erro na validação de email:', error);
    return res.status(400).json({
      success: false,
      message: 'Erro na validação de dados'
    });
  }
};

// Validar ID numérico
const validateNumericId = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const id = req.params[paramName];
      if (id && !validator.isInt(id, { min: 1 })) {
        return res.status(400).json({
          success: false,
          message: `${paramName} deve ser um número válido`
        });
      }
      next();
    } catch (error) {
      console.error('Erro na validação de ID:', error);
      return res.status(400).json({
        success: false,
        message: 'Erro na validação de dados'
      });
    }
  };
};

// Validar campos obrigatórios
const validateRequired = (fields) => {
  return (req, res, next) => {
    try {
      const missingFields = [];
      
      for (const field of fields) {
        if (!req.body[field] || req.body[field].toString().trim() === '') {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Campos obrigatórios: ${missingFields.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Erro na validação de campos obrigatórios:', error);
      return res.status(400).json({
        success: false,
        message: 'Erro na validação de dados'
      });
    }
  };
};

module.exports = {
  sanitizeInput,
  validateEmail,
  validateNumericId,
  validateRequired
};
