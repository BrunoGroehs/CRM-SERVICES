# 🚀 Scripts de Inicialização - CRM Services

## 📁 Scripts Disponíveis

### 1. `start-simple.bat` ⚡
**Uso mais comum - Inicialização rápida**
- Mata processos Node.js existentes
- Inicia backend (npm run dev)
- Inicia frontend (npx react-scripts start)  
- Abre navegador automaticamente

```bash
.\start-simple.bat
```

### 2. `start-crm.bat` 🛠️
**Inicialização com verificações**
- Verifica estrutura do projeto
- Validações de diretórios
- Feedback detalhado do processo
- Comandos úteis ao final

```bash
.\start-crm.bat
```

### 3. `start-crm.ps1` 💪
**PowerShell com recursos avançados**
- Verificação de portas em uso
- Validação completa do ambiente
- Retry logic para inicialização
- Abertura automática do navegador

```powershell
.\start-crm.ps1
```

### 4. `setup-and-start.bat` 🔧
**Primeira execução ou ambiente novo**
- Instala dependências automaticamente
- Verifica node_modules
- Configura ambiente completo
- Ideal para novos desenvolvedores

```bash
.\setup-and-start.bat
```

### 5. `stop-crm.bat` 🛑
**Para todos os serviços**
- Mata todos os processos Node.js
- Limpa ambiente para nova execução

```bash
.\stop-crm.bat
```

## 🎯 Qual Script Usar?

| Situação | Script Recomendado |
|----------|-------------------|
| **Uso diário** | `start-simple.bat` |
| **Primeira vez** | `setup-and-start.bat` |
| **Problemas técnicos** | `start-crm.bat` |
| **Desenvolvimento avançado** | `start-crm.ps1` |
| **Parar tudo** | `stop-crm.bat` |

## 🌐 URLs dos Serviços

Após execução dos scripts:

- **Backend API**: http://localhost:3000 (Node.js + Express)
- **Frontend React**: http://localhost:3001 (React Development Server)
- **Documentação**: http://localhost:3000/health

⚠️ **Importante**: As portas são fixas e configuradas automaticamente:
- Backend sempre usa porta **3000**
- Frontend sempre usa porta **3001** (configurado via `.env`)

## 📝 Comandos Manuais

Se preferir executar manualmente:

```bash
# Backend
cd c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES
npm run dev

# Frontend (nova aba/terminal)
cd c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES\frontend\crm-frontend
npx react-scripts start
```

## 🔧 Solução de Problemas

### Porta ocupada
```bash
# Verificar processos
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar processo específico
taskkill /PID [numero_do_pid] /F
```

### Erro de dependências
```bash
# Reinstalar backend
cd CRM-SERVICES
rm -rf node_modules
npm install

# Reinstalar frontend  
cd frontend\crm-frontend
rm -rf node_modules
npm install
```

### Limpar cache
```bash
npm start -- --reset-cache
```

## 💡 Dicas

1. **Performance**: Use `start-simple.bat` para uso diário
2. **Debug**: Use `start-crm.bat` quando houver problemas
3. **Setup**: Use `setup-and-start.bat` em ambiente novo
4. **Sempre**: Execute `stop-crm.bat` antes de fechar o computador

## 🎉 Scripts Prontos!

Todos os scripts estão configurados e testados. Escolha o que melhor se adapta ao seu workflow!
