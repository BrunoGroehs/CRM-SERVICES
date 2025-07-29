# 🏢 CRM-SERVICES
Sistema completo de CRM para organização de agendamentos e prestação de serviços

## 📋 Descrição
Sistema de CRM robusto para gerenciamento completo de **clientes**, **serviços** e **recontatos**, desenvolvido com Node.js, Express e PostgreSQL. Inclui funcionalidades avançadas de CRUD, validações, relacionamentos e interfaces de teste.

## 🚀 Status do Projeto
✅ **COMPLETO E FUNCIONAL**
- ✅ Etapa 1: Configuração inicial do servidor
- ✅ Etapa 2: Endpoints de clientes 
- ✅ Etapa 3: Endpoints de serviços
- ✅ **Etapa 4: Endpoints de recontatos** - **RECÉM IMPLEMENTADO!** 🎉

## 🛠️ Tecnologias Utilizadas
- **Node.js** - Runtime JavaScript
- **Express** - Framework web para Node.js
- **PostgreSQL (Neon)** - Banco de dados na nuvem
- **pg** - Driver PostgreSQL para Node.js
- **dotenv** - Gerenciamento de variáveis de ambiente
- **nodemon** - Auto-reload em desenvolvimento

## ⚙️ Configuração e Instalação

### 📋 Pré-requisitos
- Node.js (versão 14 ou superior)
- npm ou yarn

### 🔧 Instalação
1. Clone o repositório:
```bash
git clone https://github.com/BrunoGroehs/CRM-SERVICES.git
cd CRM-SERVICES
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie o arquivo `.env` na raiz do projeto
   - Configure a URL do banco PostgreSQL (Neon):
   ```env
   DATABASE_URL=postgresql://usuario:senha@host:porta/database?sslmode=require
   PORT=3000
   ```

### 🚀 Executando o Projeto

**Modo de desenvolvimento (com auto-reload):**
```bash
npm run dev
```

**Modo de produção:**
```bash
npm start
```

🌐 **Servidor disponível em**: `http://localhost:3000`

## 📊 Endpoints da API

### Endpoints de Sistema
- `GET /` - Endpoint principal que retorna status do servidor e lista de endpoints
- `GET /db-test` - Testa a conexão com o banco de dados
- `GET /health` - Informações de saúde do servidor

### 👥 Endpoints de Clientes
- `GET /clientes` - Lista todos os clientes
- `GET /clientes/:id` - Busca um cliente específico por ID
- `POST /clientes` - Cria um novo cliente
- `PUT /clientes/:id` - Atualiza um cliente existente
- `DELETE /clientes/:id` - Remove um cliente

#### Exemplo de Payload para Cliente
```json
{
  "nome": "João Silva",
  "telefone": "11999887766",
  "email": "joao.silva@email.com",
  "endereco": "Rua das Flores, 123",
  "cidade": "São Paulo",
  "cep": "01234-567"
}
```

### 🛠️ Endpoints de Serviços
- `GET /servicos` - Lista todos os serviços
- `GET /servicos/:id` - Busca um serviço específico por ID
- `POST /servicos` - Cria um novo serviço
- `PUT /servicos/:id` - Atualiza um serviço existente
- `DELETE /servicos/:id` - Remove um serviço

#### Exemplo de Payload para Serviço
```json
{
  "nome": "Consultoria em TI",
  "descricao": "Consultoria especializada em tecnologia",
  "preco": 150.00,
  "categoria": "consultoria",
  "ativo": true
}
```

### 🔄 Endpoints de Recontatos ⭐ **NOVO!**
- `GET /recontatos` - Lista todos os recontatos com dados do cliente
- `GET /recontatos?cliente_id=1` - Filtra recontatos por cliente
- `POST /recontatos` - Cria um novo recontato
- `PUT /recontatos/:id` - Atualiza um recontato existente
- `DELETE /recontatos/:id` - Remove um recontato

#### Exemplo de Payload para Recontato
```json
{
  "cliente_id": 1,
  "data_agendada": "2025-02-15",
  "hora_agendada": "14:30",
  "tipo_recontato": "ligacao",
  "motivo": "Follow-up de proposta comercial",
  "status": "agendado",
  "funcionario_responsavel": "João Silva",
  "observacoes": "Cliente demonstrou interesse no serviço premium"
}
```

**Campos obrigatórios**: `cliente_id`, `data_agendada`, `hora_agendada`, `tipo_recontato`, `motivo`, `status`, `funcionario_responsavel`

**Tipos de recontato**: `ligacao`, `email`, `whatsapp`, `visita`, `reuniao`  
**Status permitidos**: `agendado`, `realizado`, `cancelado`, `reagendado`

## 🧪 Interfaces de Teste

### 🌐 Páginas de Teste Disponíveis
- **Teste Básico**: http://localhost:3000/teste-recontatos.html
- **Teste Completo**: http://localhost:3000/teste-completo-recontatos.html

Essas interfaces permitem testar todos os endpoints CRUD de recontatos de forma visual e interativa.

## 📁 Estrutura do Projeto
```
CRM-SERVICES/
├── server.js               # Servidor principal Express
├── routes/
│   ├── clientes.js         # Endpoints de clientes
│   ├── servicos.js         # Endpoints de serviços  
│   └── recontatos.js       # Endpoints de recontatos (NOVO!)
├── database/
│   ├── init.js             # Inicialização do banco
│   ├── clientes.js         # Estrutura tabela clientes
│   ├── servicos.js         # Estrutura tabela serviços
│   └── recontatos.js       # Estrutura tabela recontatos (NOVO!)
├── public/                 # Arquivos estáticos (NOVO!)
│   ├── teste-recontatos.html
│   └── teste-completo-recontatos.html
├── migrate-recontatos.js   # Script de migração (EXECUTADO)
├── ETAPA4-CONCLUIDA.md    # Relatório detalhado Etapa 4
├── package.json           # Dependências do projeto
├── .env                   # Variáveis de ambiente
└── README.md              # Esta documentação
```

## 🗄️ Estrutura do Banco de Dados

### Tabela `clientes`
```sql
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  endereco TEXT,
  cidade VARCHAR(100),
  cep VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `servicos`
```sql
CREATE TABLE servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2),
  categoria VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `recontatos` ⭐ **NOVA!**
```sql
CREATE TABLE recontatos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  data_agendada DATE NOT NULL,
  hora_agendada TIME NOT NULL,
  tipo_recontato VARCHAR(50) NOT NULL,
  motivo TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  observacoes TEXT,
  funcionario_responsavel VARCHAR(255) NOT NULL,
  data_realizado DATE,
  resultado TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔗 Relacionamentos
- `recontatos.cliente_id` → `clientes.id` (Foreign Key)
- Índices otimizados para consultas rápidas
- Triggers automáticos para `updated_at`

## 📝 Exemplos de Uso da API

### 🔍 Buscar todos os recontatos com dados do cliente
```bash
GET /recontatos
```

### 📊 Criar um recontato completo
```javascript
const novoRecontato = {
  cliente_id: 1,
  data_agendada: "2025-02-15",
  hora_agendada: "14:30",
  tipo_recontato: "ligacao",
  motivo: "Acompanhamento pós-venda",
  status: "agendado",
  funcionario_responsavel: "Maria Santos",
  observacoes: "Cliente solicitou informações sobre upgrade"
};

fetch('/recontatos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(novoRecontato)
});
```

### ✅ Atualizar status após recontato realizado
```javascript
const atualizacao = {
  status: "realizado",
  data_realizado: "2025-02-15",
  resultado: "Cliente confirmou renovação do contrato",
  observacoes: "Ligação muito positiva. Cliente satisfeito com os serviços."
};

fetch('/recontatos/5', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(atualizacao)
});
```

## 🚀 Deploy e Produção

### 📋 Variáveis de Ambiente Necessárias
```env
DATABASE_URL=postgresql://usuario:senha@host:porta/database?sslmode=require
PORT=3000
NODE_ENV=production
```

### 🔧 Scripts Disponíveis
```bash
npm start       # Produção
npm run dev     # Desenvolvimento com nodemon
npm test        # Executa testes (quando implementados)
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📋 Próximas Funcionalidades

- [ ] Autenticação e autorização
- [ ] Dashboard administrativo
- [ ] Relatórios e analytics
- [ ] Notificações por email/SMS
- [ ] API de integração com calendários
- [ ] Backup automático dos dados

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte:
- 📧 Email: bruno.groehs@email.com
- 💬 Issues: Abra uma issue no GitHub
- 📱 WhatsApp: Entre em contato via issues

---

## 🏆 Status do Projeto

**✅ PROJETO COMPLETO E FUNCIONAL**

- ✅ **Etapa 1**: Configuração inicial ✓
- ✅ **Etapa 2**: CRUD de Clientes ✓  
- ✅ **Etapa 3**: CRUD de Serviços ✓
- ✅ **Etapa 4**: CRUD de Recontatos ✓

### 🎉 **Sistema CRM totalmente operacional!**

**Última atualização**: 29 de Janeiro de 2025  
**Versão**: 1.4.0 - Recontatos Implementation
);
```

### Funcionalidades Implementadas
- ✅ Validação de campos obrigatórios
- ✅ Validação de formato de email
- ✅ Controle de emails únicos
- ✅ Timestamps automáticos (created_at, updated_at)
- ✅ Logs de requisições
- ✅ Tratamento de erros robusto
- ✅ Respostas padronizadas da API
