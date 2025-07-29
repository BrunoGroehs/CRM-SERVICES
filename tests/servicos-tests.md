# Testes da API de Serviços

## Configuração
- Base URL: http://localhost:3000
- Content-Type: application/json

## Estrutura da Tabela Servicos (existente)
A tabela já existe com os seguintes campos:
- `id` (auto-incremento)
- `cliente_id` (obrigatório - FK para clientes)
- `data` (obrigatório - formato YYYY-MM-DD)
- `hora` (obrigatório - formato livre)
- `valor` (opcional - decimal)
- `notas` (opcional - texto)
- `status` (opcional - agendado, em_andamento, concluido, cancelado)
- `funcionario_responsavel` (opcional)

## 1. Listar todos os serviços (GET /servicos)
```bash
curl http://localhost:3000/servicos
```

## 2. Buscar serviço por ID (GET /servicos/:id)
```bash
curl http://localhost:3000/servicos/1
```

## 3. Criar um novo serviço (POST /servicos)

### Exemplo básico (campos obrigatórios)
```bash
curl -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "data": "2025-08-15",
    "hora": "09:00"
  }'
```

### Exemplo completo (todos os campos)
```bash
curl -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 2,
    "data": "2025-08-20",
    "hora": "14:00 - 16:00",
    "valor": 150.00,
    "notas": "Limpeza completa e troca de filtros de ar condicionado",
    "status": "agendado",
    "funcionario_responsavel": "João Silva"
  }'
```

## 4. Atualizar serviço (PUT /servicos/:id)
```bash
curl -X PUT http://localhost:3000/servicos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "data": "2025-08-15",
    "hora": "09:00 - 12:00",
    "valor": 120.00,
    "notas": "Atualizado - incluir limpeza das janelas",
    "status": "em_andamento",
    "funcionario_responsavel": "Maria Santos"
  }'
```

## 5. Deletar serviço (DELETE /servicos/:id)
```bash
curl -X DELETE http://localhost:3000/servicos/1
```

## Testes de Validação

### Teste com cliente_id inexistente
```bash
curl -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 9999,
    "data": "2025-08-15",
    "hora": "09:00"
  }'
```

### Teste com dados obrigatórios faltando
```bash
curl -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "data": "2025-08-15"
  }'
```

### Teste com formato de data inválido
```bash
curl -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "data": "15/08/2025",
    "hora": "09:00"
  }'
```

### Teste com status inválido
```bash
curl -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "data": "2025-08-15",
    "hora": "09:00",
    "status": "status_invalido"
  }'
```

## Status válidos para serviços:
- `agendado` (padrão)
- `em_andamento`
- `concluido`
- `cancelado`

## Campos obrigatórios:
- `cliente_id` (deve existir na tabela clientes)
- `data` (formato: YYYY-MM-DD)
- `hora` (formato livre - ex: "09:00", "14:00-16:00")

## Campos opcionais:
- `valor` (decimal)
- `notas` (texto)
- `status` (padrão: 'agendado')
- `funcionario_responsavel` (texto)
