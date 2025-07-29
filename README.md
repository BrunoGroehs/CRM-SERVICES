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

- `GET /` - Endpoint principal que retorna status do servidor
- `GET /db-test` - Testa a conexão com o banco de dados
- `GET /health` - Informações de saúde do servidor

## Estrutura do Projeto
```
CRM-SERVICES/
├── server.js          # Arquivo principal do servidor
├── package.json       # Dependências e scripts
├── .env               # Variáveis de ambiente (não commitado)
├── .gitignore         # Arquivos ignorados pelo git
└── README.md          # Documentação do projeto
```
