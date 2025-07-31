# 🚀 ROTEIRO DE DEPLOY - RENDER.COM
# CRM Services Full-Stack Application

## 📋 PRÉ-REQUISITOS

### ✅ Checklist Inicial
- [ ] Conta no GitHub com repositório atualizado
- [ ] Conta no Render.com (grátis)
- [ ] Banco PostgreSQL configurado (Neon/Render)
- [ ] Google OAuth Client configurado

---

## 🔍 FASE 1: AUDITORIA DO CÓDIGO

### 📦 1.1 Verificar Package.json (Backend)
- [ ] `"start": "node server.js"` ✅ 
- [ ] `"build"` script (se necessário)
- [ ] Dependências de produção corretas
- [ ] Node version no package.json ou .nvmrc

### 📦 1.2 Verificar Package.json (Frontend) 
- [ ] `"start"` script ✅
- [ ] `"build": "react-scripts build"` ✅
- [ ] `"homepage"` configurado (se necessário)

### 🌐 1.3 Verificar Variáveis de Ambiente
- [ ] Backend: DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_*
- [ ] Frontend: REACT_APP_API_URL, REACT_APP_GOOGLE_CLIENT_ID
- [ ] Separação dev/prod adequada

### 🔗 1.4 Verificar Integração Frontend-Backend
- [ ] CORS configurado para URLs de produção
- [ ] Rotas da API funcionando
- [ ] Frontend consome API corretamente
- [ ] Autenticação OAuth funcional

---

## 🏗️ FASE 2: PREPARAÇÃO PARA DEPLOY

### 📁 2.1 Organizar Estrutura de Arquivos
```
CRM-SERVICES/
├── package.json           # Backend deps & scripts
├── server.js             # Entry point
├── .env.example          # Template público
├── routes/               # API routes
├── database/             # DB setup
├── frontend/
│   └── crm-frontend/
│       ├── package.json  # Frontend deps
│       ├── src/          # React source
│       └── build/        # Build output (gerado)
└── .gitignore
```

### 🔐 2.2 Configurar Variáveis de Ambiente
- [ ] Criar `.env.production` para valores de produção
- [ ] Não comitar arquivos `.env` com secrets
- [ ] Configurar variáveis no Render Dashboard

### 🎯 2.3 Configurar Scripts de Build
Backend package.json:
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "cd frontend/crm-frontend && npm install && npm run build",
    "postinstall": "npm run build"
  }
}
```

### 🌐 2.4 Configurar Serving de Arquivos Estáticos
No server.js:
```javascript
// Em produção, servir React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/crm-frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/crm-frontend/build/index.html'));
  });
}
```

---

## 🚀 FASE 3: DEPLOY NO RENDER

### 🔧 3.1 Configurar Web Service (Backend + Frontend)
1. **Acessar:** https://dashboard.render.com/
2. **New Web Service** → Connect GitHub Repository
3. **Configurações:**
   - **Name:** `crm-services`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Root Directory:** `/` (raiz)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

### 🌍 3.2 Configurar Variáveis de Ambiente
No Render Dashboard > Environment:
```bash
# Essenciais
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...

# Autenticação
GOOGLE_CLIENT_ID=544802893371-...
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://crm-services.onrender.com/auth/google/callback

# JWT
JWT_SECRET=seu_jwt_secret
JWT_REFRESH_SECRET=seu_refresh_secret
SESSION_SECRET=seu_session_secret

# Frontend
REACT_APP_API_URL=/api
REACT_APP_GOOGLE_CLIENT_ID=544802893371-...
```

### 📊 3.3 Configurar Banco de Dados
**Opção A - Render PostgreSQL (Recomendado):**
1. New → PostgreSQL
2. Nome: `crm-database`
3. Plan: Free
4. Copiar `External Database URL`

**Opção B - Neon (Atual):**
- Manter configuração atual
- Verificar se permite conexões externas

---

## 🔧 FASE 4: CONFIGURAÇÕES ESPECÍFICAS

### 🎯 4.1 Atualizar Google OAuth
Google Cloud Console:
```
Origens JavaScript autorizadas:
- https://crm-services.onrender.com

URIs de redirecionamento:
- https://crm-services.onrender.com/auth/google/callback
```

### 🌐 4.2 Configurar CORS
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://crm-services.onrender.com'
];
```

### 📱 4.3 Ajustar URLs do Frontend
```javascript
// src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
```

---

## ✅ FASE 5: TESTES E VALIDAÇÃO

### 🧪 5.1 Testes Locais
- [ ] `npm run build` executa sem erros
- [ ] Build do React é gerado em `frontend/crm-frontend/build/`
- [ ] `npm start` serve arquivos estáticos
- [ ] API endpoints funcionam
- [ ] Autenticação OAuth funcional

### 🌐 5.2 Testes em Produção
- [ ] Deploy completo sem erros
- [ ] Site carrega: `https://crm-services.onrender.com`
- [ ] API funciona: `/api/health`
- [ ] Login Google funcional
- [ ] CRUD de clientes/serviços/recontatos
- [ ] Dashboard com métricas

### 📊 5.3 Monitoramento
- [ ] Logs no Render Dashboard
- [ ] Performance da aplicação
- [ ] Conexão com banco de dados
- [ ] Tempo de resposta da API

---

## 🔄 FASE 6: OTIMIZAÇÕES PÓS-DEPLOY

### ⚡ 6.1 Performance
- [ ] Configurar cache de arquivos estáticos
- [ ] Otimizar queries do banco
- [ ] Monitorar uso de recursos

### 🔒 6.2 Segurança
- [ ] HTTPS funcionando
- [ ] Cabeçalhos de segurança (Helmet)
- [ ] Rate limiting configurado
- [ ] Validação de inputs

### 📈 6.3 Escalabilidade
- [ ] Considerar upgrade para plano pago
- [ ] Implementar CDN se necessário
- [ ] Otimizar build do React

---

## 🚨 TROUBLESHOOTING COMUM

### ❌ Build Falha
```bash
# Verificar dependências
npm install
cd frontend/crm-frontend && npm install

# Testar build local
npm run build
```

### ❌ Frontend não Carrega
- Verificar se `build/` foi criado
- Confirmar serving de arquivos estáticos
- Checar rotas catch-all (`*`)

### ❌ API não Funciona
- Verificar variáveis de ambiente
- Confirmar conexão com banco
- Checar logs do Render

### ❌ OAuth Falha
- Atualizar URLs no Google Console
- Verificar GOOGLE_REDIRECT_URI
- Confirmar CORS para domínio

---

## 📝 COMANDOS ÚTEIS

### Desenvolvimento
```bash
npm run dev          # Backend com nodemon
npm start           # Frontend dev server
```

### Build Local
```bash
npm run build       # Build do React
npm start          # Servir produção local
```

### Deploy
```bash
git add .
git commit -m "Deploy: ready for production"
git push origin main
```

---

## 🎯 RESULTADO FINAL

✅ **URL Final:** https://crm-services.onrender.com
✅ **Backend + Frontend** integrados em um serviço
✅ **Banco PostgreSQL** configurado
✅ **Google OAuth** funcionando
✅ **Deploy automatizado** via Git

---

**🔥 PRÓXIMO PASSO:** Executar Fase 1 - Auditoria do Código!
