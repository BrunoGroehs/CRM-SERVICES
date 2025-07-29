# Testes da API de Clientes

## Configuração
- Base URL: http://localhost:3000
- Content-Type: application/json

## 1. Testar servidor
```bash
curl http://localhost:3000/
```

## 2. Listar todos os clientes (GET /clientes)
```bash
curl http://localhost:3000/clientes
```

## 3. Criar um novo cliente (POST /clientes)
```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "telefone": "11999887766",
    "email": "joao.silva@email.com",
    "endereco": "Rua das Flores, 123",
    "cidade": "São Paulo",
    "cep": "01234-567"
  }'
```

## 4. Criar outro cliente para testes
```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "telefone": "11888776655",
    "email": "maria.santos@email.com",
    "endereco": "Av. Principal, 456",
    "cidade": "Rio de Janeiro",
    "cep": "20000-000"
  }'
```

## 5. Buscar cliente por ID (GET /clientes/:id)
```bash
curl http://localhost:3000/clientes/1
```

## 6. Atualizar cliente (PUT /clientes/:id)
```bash
curl -X PUT http://localhost:3000/clientes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva Santos",
    "telefone": "11999887766",
    "email": "joao.silva@email.com",
    "endereco": "Rua das Flores, 123 - Apto 45",
    "cidade": "São Paulo",
    "cep": "01234-567"
  }'
```

## 7. Deletar cliente (DELETE /clientes/:id)
```bash
curl -X DELETE http://localhost:3000/clientes/1
```

## Testes de Validação

### Teste com dados inválidos (nome vazio)
```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "",
    "telefone": "11999887766",
    "email": "teste@email.com"
  }'
```

### Teste com email inválido
```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "telefone": "11999887766",
    "email": "email-invalido"
  }'
```

### Teste com campos obrigatórios faltando
```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste"
  }'
```
