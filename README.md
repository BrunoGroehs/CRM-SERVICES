# CRM-SERVICES
Organização de agendamentos para prestação de serviços

## Descrição
Sistema de CRM para gerenciamento de serviços e agendamentos, desenvolvido com Node.js, Express e PostgreSQL.

## Tecnologias Utilizadas
- **Node.js** - Runtime JavaScript
- **Express** - Framework web para Node.js
- **PostgreSQL** - Banco de dados relacional (Neon)
- **pg** - Driver PostgreSQL para Node.js
- **dotenv** - Gerenciamento de variáveis de ambiente

## Configuração e Instalação

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação
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
   - Copie o arquivo `.env.example` para `.env`
   - Configure a URL do banco de dados PostgreSQL

### Executando o Projeto

**Modo de desenvolvimento (com auto-reload):**
```bash
npm run dev
```

**Modo de produção:**
```bash
npm start
```

O servidor estará disponível em: `http://localhost:3000`

## Endpoints Disponíveis

### Endpoints de Sistema
- `GET /` - Endpoint principal que retorna status do servidor e lista de endpoints
- `GET /db-test` - Testa a conexão com o banco de dados
- `GET /health` - Informações de saúde do servidor

### Endpoints de Clientes
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

**Campos obrigatórios:** `nome`, `telefone`, `email`
**Campos opcionais:** `endereco`, `cidade`, `cep`

## Estrutura do Projeto
```
CRM-SERVICES/
├── server.js          # Arquivo principal do servidor
├── routes/
│   └── clientes.js    # Rotas da API de clientes
├── database/
│   └── init.js        # Inicialização e estrutura do banco
├── tests/
│   └── api-tests.md   # Exemplos de testes da API
├── package.json       # Dependências e scripts
├── .env               # Variáveis de ambiente (não commitado)
├── .gitignore         # Arquivos ignorados pelo git
└── README.md          # Documentação do projeto
```

## Banco de Dados

### Tabela Clientes
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

### Funcionalidades Implementadas
- ✅ Validação de campos obrigatórios
- ✅ Validação de formato de email
- ✅ Controle de emails únicos
- ✅ Timestamps automáticos (created_at, updated_at)
- ✅ Logs de requisições
- ✅ Tratamento de erros robusto
- ✅ Respostas padronizadas da API
