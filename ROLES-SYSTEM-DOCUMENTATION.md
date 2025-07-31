# 🛡️ Sistema de Roles - CRM Services

## Visão Geral

O CRM Services agora possui um sistema completo de controle de acesso baseado em roles (papéis), que permite gerenciar permissões de usuários de forma granular e segura.

## 🎯 Roles Disponíveis

### 1. **ADMIN** (Administrador)
- **Descrição**: Acesso total ao sistema
- **Permissões**:
  - ✅ Criar, editar e excluir usuários
  - ✅ Gerenciar roles de outros usuários
  - ✅ Acessar painel administrativo
  - ✅ Todas as operações de CRUD em clientes, serviços e recontatos
  - ✅ Visualizar relatórios e estatísticas
  - ✅ Configurações do sistema

### 2. **MANAGER** (Gerente)
- **Descrição**: Gestão operacional completa
- **Permissões**:
  - ✅ Visualizar lista de usuários (sem editar)
  - ✅ Todas as operações de CRUD em clientes, serviços e recontatos
  - ✅ Visualizar dashboard e métricas
  - ✅ Gerar relatórios
  - ❌ Não pode gerenciar usuários ou roles
  - ❌ Não pode acessar configurações do sistema

### 3. **USER** (Usuário)
- **Descrição**: Acesso básico para operações do dia-a-dia
- **Permissões**:
  - ✅ Criar e editar clientes, serviços e recontatos
  - ✅ Visualizar dashboard básico
  - ❌ Não pode excluir registros
  - ❌ Não pode visualizar usuários
  - ❌ Não pode gerar relatórios
  - ❌ Não pode acessar configurações

## 🔧 Implementação Técnica

### Backend (Node.js/Express)

#### Arquivo de Configuração: `config/roles.js`
```javascript
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  USER: 'user'
};

const PERMISSIONS = {
  [ROLES.ADMIN]: {
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    // ... todas as permissões
  },
  // ... outras roles
};
```

#### Middlewares de Autenticação: `middleware/auth.js`
- `authenticateToken`: Verifica JWT token
- `checkActiveUser`: Verifica se usuário está ativo
- `checkRole(allowedRoles)`: Verifica roles específicas
- `checkPermission(permission)`: Verifica permissões granulares
- `requireAdmin`: Apenas administradores
- `requireManagerOrAdmin`: Gerentes ou administradores
- `requireAnyRole`: Qualquer usuário autenticado

#### Rotas Administrativas: `routes/admin.js`
- `GET /admin/users`: Listar usuários
- `PUT /admin/users/:id/role`: Alterar role
- `PUT /admin/users/:id/status`: Ativar/desativar usuário
- `GET /admin/roles`: Listar roles e permissões
- `GET /admin/stats`: Estatísticas do sistema

### Frontend (React)

#### Componente de Navegação
```javascript
// Mostra link de admin apenas para administradores
{user?.role === 'admin' && (
  <li className="nav-item">
    <Link to="/admin" className={isActive('/admin')}>
      🛡️ Admin
    </Link>
  </li>
)}
```

#### Proteção de Rotas
```javascript
<Route path="/admin" element={
  <RoleProtectedRoute allowedRoles={['admin']}>
    <AdminPanel />
  </RoleProtectedRoute>
} />
```

## 🚀 Como Usar

### 1. **Primeiro Acesso**
- Faça login com Google OAuth
- O primeiro usuário será automaticamente promovido a **ADMIN**
- Usuários subsequentes recebem role **USER** por padrão

### 2. **Gerenciamento de Usuários (Admin)**
- Acesse `/admin` no navegador
- Visualize lista de usuários e estatísticas
- Altere roles de usuários conforme necessário
- Ative/desative usuários

### 3. **Verificação de Permissões**
```javascript
// No backend
const { hasPermission } = require('./config/roles');

if (hasPermission(user.role, 'canDeleteUsers')) {
  // Permitir operação
}

// No frontend  
{user?.role === 'admin' && (
  <button>Operação apenas para admin</button>
)}
```

## 🔒 Segurança

### Validações de Banco de Dados
```sql
-- Constraint para garantir roles válidas
ALTER TABLE usuarios 
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('admin', 'manager', 'user'));
```

### Proteções Implementadas
- ✅ Não é possível alterar a própria role
- ✅ Não é possível remover o último administrador
- ✅ Não é possível desativar a própria conta
- ✅ Validação de roles válidas no banco
- ✅ Middlewares de verificação em todas as rotas protegidas

## 📊 Estatísticas e Monitoramento

O painel administrativo fornece:
- Distribuição de usuários por role
- Status ativo/inativo dos usuários  
- Registros recentes (últimos 30 dias)
- Usuários ativos recentemente (últimos 7 dias)

## 🛠️ Scripts de Manutenção

### Aplicar Sistema de Roles
```bash
node update-roles-database.js
```

### Verificar Estrutura do Banco
```bash
curl http://localhost:3001/db-structure
```

## 📝 Logs e Auditoria

O sistema registra:
- Alterações de roles
- Ativação/desativação de usuários
- Tentativas de acesso não autorizadas
- Operações administrativas

## 🔄 Migração e Atualizações

Para aplicar o sistema de roles em uma instalação existente:

1. Execute o script de migração
2. Reinicie o servidor
3. Faça login como administrador
4. Configure as roles dos usuários existentes

## 🚨 Troubleshooting

### Problemas Comuns:

1. **"Permissão insuficiente"**
   - Verifique se o usuário tem a role correta
   - Confirme se o endpoint requer autenticação

2. **"Token inválido"**
   - Faça logout e login novamente
   - Verifique se o JWT_SECRET está configurado

3. **Role não aparece na interface**
   - Verifique se o usuário foi promovido no banco
   - Confirme se o token foi atualizado após mudança de role

---

## 🎉 Conclusão

O sistema de roles do CRM Services oferece:
- **Segurança**: Controle granular de acesso
- **Flexibilidade**: Fácil adição de novas roles/permissões  
- **Usabilidade**: Interface intuitiva para gestão
- **Escalabilidade**: Suporte a crescimento da equipe

Para dúvidas ou suporte, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.
