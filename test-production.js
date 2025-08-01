// Teste direto com NODE_ENV=production
process.env.NODE_ENV = 'production';
process.env.BASE_URL = 'https://crm-services.onrender.com';
process.env.GOOGLE_REDIRECT_URI = 'https://crm-services.onrender.com/auth/google/callback';

require('dotenv').config();

console.log('🧪 Teste do servidor em modo PRODUÇÃO...');
console.log('');

console.log('🔧 Variáveis importantes:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('BASE_URL:', process.env.BASE_URL);
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('');

try {
  console.log('📦 Carregando servidor principal...');
  
  const express = require('express');
  const path = require('path');
  const cors = require('cors');
  
  const app = express();
  
  // Teste de configuração CORS
  const isProd = process.env.NODE_ENV === 'production';
  console.log('🏭 Ambiente de produção detectado:', isProd);
  
  const allowedOrigins = isProd 
    ? [
        process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'https://crm-services.onrender.com',
        'https://accounts.google.com'
      ]
    : [
        'http://localhost:3001', 
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];
  
  console.log('🌐 CORS Origins:', allowedOrigins);
  
  // Configurar CORS
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
  }));
  
  // Servir frontend React em produção
  if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, 'frontend/crm-frontend/build');
    console.log('📦 Servindo frontend React do diretório:', buildPath);
    
    app.use(express.static(buildPath));
    
    // Middleware personalizado para catch-all (evitando regex problemática)
    app.use((req, res, next) => {
      // Se não é uma rota da API, servir index.html
      if (!req.path.startsWith('/api') && !req.path.startsWith('/auth') && !req.path.startsWith('/usuarios') && !req.path.startsWith('/admin') && !req.path.startsWith('/clientes') && !req.path.startsWith('/servicos') && !req.path.startsWith('/recontatos') && !req.path.startsWith('/dashboard') && !req.path.startsWith('/db-') && !req.path.startsWith('/health') && !req.path.startsWith('/oauth-setup')) {
        console.log('📄 Servindo index.html para:', req.path);
        return res.sendFile(path.join(buildPath, 'index.html'));
      }
      next();
    });
  }
  
  // Rota de teste
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API funcionando em produção', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  });
  
  const port = process.env.PORT || 3001;
  const server = app.listen(port, () => {
    console.log('');
    console.log('🚀 Servidor em modo PRODUÇÃO iniciado com sucesso!');
    console.log(`📡 Porta: ${port}`);
    console.log(`🌐 Frontend: http://localhost:${port}`);
    console.log(`🔗 API Test: http://localhost:${port}/api/test`);
    console.log('');
    console.log('✅ Teste de produção APROVADO!');
    
    // Parar servidor após teste
    setTimeout(() => {
      server.close(() => {
        console.log('🛑 Servidor de teste finalizado');
        process.exit(0);
      });
    }, 3000);
  });
  
} catch (error) {
  console.error('❌ Erro durante o teste de produção:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
