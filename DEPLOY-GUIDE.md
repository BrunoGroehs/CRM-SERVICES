# 🚀 Deploy Guide - CRM Services

## 📋 Pré-requisitos de Deploy

- ✅ App funcionando localmente
- ✅ Projeto hospedado no GitHub
- ✅ OAuth2 configurado (Google)
- ✅ Frontend React compilado pelo backend
- ✅ Variáveis de ambiente configuradas

## 🌐 1. Configurar URLs no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Vá em **Credenciais** → clique no seu **OAuth 2.0 Client ID**
3. Atualize os campos:

### 📥 URIs de redirecionamento autorizados:
```
https://seu-app.onrender.com/auth/google/callback
```

### 🌐 URIs JavaScript autorizados:
```
https://seu-app.onrender.com
```

## 🚀 2. Deploy no Render

### Configurações do Web Service:

- **Start Command:** `node server.js`
- **Build Command:** `npm run build:full`
- **Root Directory:** `.` (raiz do projeto)

### 🔧 Variáveis de Ambiente no Render:

```bash
NODE_ENV=production
DATABASE_URL=sua-database-url-postgresql
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
SESSION_SECRET=sua-chave-secreta-super-segura
JWT_SECRET=sua-jwt-secret-key
JWT_REFRESH_SECRET=sua-refresh-secret-key
BASE_URL=https://seu-app.onrender.com
```

## 📁 3. Estrutura do Deploy

```
/
├── server.js              # Backend principal
├── package.json           # Dependências backend
├── frontend/
│   └── crm-frontend/
│       ├── package.json   # Dependências frontend
│       └── build/         # Frontend compilado (gerado)
└── .env.example          # Exemplo de variáveis
```

## ⚡ 4. Comandos Úteis

```bash
# Build local
npm run build

# Build completo (backend + frontend)
npm run build:full

# Executar em produção
NODE_ENV=production npm start
```

## 🛑 Troubleshooting

### ❌ `redirect_uri_mismatch`
- **Causa:** URL incorreta no Google Console
- **Solução:** Corrija as URIs no Google Cloud Console

### ❌ CORS bloqueando
- **Causa:** Frontend tentando acessar backend de origem diferente
- **Solução:** O código já está configurado para ambiente de produção

### ❌ Cookies não sendo salvos
- **Causa:** Configuração de cookies inadequada
- **Solução:** O código já está configurado com `sameSite: 'none'` em produção

## 🔍 Verificação Pós-Deploy

1. Acesse `https://seu-app.onrender.com`
2. Teste login com Google
3. Verifique console do Render para logs
4. Teste endpoints da API: `/health`, `/db-test`

## 📝 Logs Importantes

O servidor logará:
- 🔧 Configuração OAuth (desenvolvimento/produção)
- 🔗 Callback URL configurada
- 🌐 CORS origins permitidas
- 📦 Localização do frontend React
