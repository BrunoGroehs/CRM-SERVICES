// Configuração de roles e permissões do sistema
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  USER: 'user'
};

// Definição de permissões por role
const PERMISSIONS = {
  [ROLES.ADMIN]: {
    // Administrador tem acesso total
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canViewUsers: true,
    canViewAllUsers: true, // Admin vê todos os usuários
    canManageRoles: true,
    canCreateAdmin: true,
    canCreateManager: true,
    canEditAnyUser: true,
    canDeleteAnyUser: true,
    canCreateClientes: true,
    canEditClientes: true,
    canDeleteClientes: true,
    canViewClientes: true,
    canCreateServicos: true,
    canEditServicos: true,
    canDeleteServicos: true,
    canViewServicos: true,
    canCreateRecontatos: true,
    canEditRecontatos: true,
    canDeleteRecontatos: true,
    canViewRecontatos: true,
    canViewDashboard: true,
    canViewReports: true,
    canManageSystem: true
  },
  
  [ROLES.MANAGER]: {
    // Gerente tem acesso limitado com restrições específicas
    canCreateUsers: true, // Pode criar apenas usuários comuns
    canEditUsers: true, // Apenas usuários de sua equipe
    canDeleteUsers: true, // Apenas usuários de sua equipe
    canViewUsers: true, // Apenas usuários de sua equipe
    canViewAllUsers: false, // Não vê todos os usuários
    canManageRoles: false,
    canCreateAdmin: false, // Não pode criar admin
    canCreateManager: false, // Não pode criar outros managers
    canEditAnyUser: false, // Só pode editar usuários da sua equipe
    canDeleteAnyUser: false, // Só pode deletar usuários da sua equipe
    canCreateClientes: true,
    canEditClientes: true,
    canDeleteClientes: true,
    canViewClientes: true,
    canCreateServicos: true,
    canEditServicos: true,
    canDeleteServicos: true,
    canViewServicos: true,
    canCreateRecontatos: true,
    canEditRecontatos: true,
    canDeleteRecontatos: true,
    canViewRecontatos: true,
    canViewDashboard: true,
    canViewReports: true,
    canManageSystem: false
  },
  
  [ROLES.USER]: {
    // Usuário tem acesso básico
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewUsers: false,
    canViewAllUsers: false,
    canManageRoles: false,
    canCreateAdmin: false,
    canCreateManager: false,
    canEditAnyUser: false,
    canDeleteAnyUser: false,
    canCreateClientes: true,
    canEditClientes: true,
    canDeleteClientes: false,
    canViewClientes: true,
    canCreateServicos: true,
    canEditServicos: true,
    canDeleteServicos: false,
    canViewServicos: true,
    canCreateRecontatos: true,
    canEditRecontatos: true,
    canDeleteRecontatos: false,
    canViewRecontatos: true,
    canViewDashboard: true,
    canViewReports: false,
    canManageSystem: false
  }
};

// Função para verificar se um usuário tem uma permissão específica
const hasPermission = (userRole, permission) => {
  const rolePermissions = PERMISSIONS[userRole];
  return rolePermissions ? rolePermissions[permission] || false : false;
};

// Função para obter todas as permissões de uma role
const getRolePermissions = (role) => {
  return PERMISSIONS[role] || {};
};

// Lista de roles válidas
const VALID_ROLES = Object.values(ROLES);

// Função para validar se uma role é válida
const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};

// Função para verificar se um manager pode criar usuário com determinada role
const canManagerCreateRole = (managerRole, targetRole) => {
  if (managerRole !== ROLES.MANAGER) return false;
  // Manager só pode criar usuários comuns, não admin nem outros managers
  return targetRole === ROLES.USER;
};

// Função para verificar se um usuário pode ver outro usuário
const canUserViewUser = (currentUser, targetUser) => {
  // Admin vê todos
  if (currentUser.role === ROLES.ADMIN) return true;
  
  // Manager só vê usuários que ele criou + usuários comuns (não outros managers nem admin)
  if (currentUser.role === ROLES.MANAGER) {
    // Não pode ver admin
    if (targetUser.role === ROLES.ADMIN) return false;
    // Não pode ver outros managers (exceto se for ele mesmo)
    if (targetUser.role === ROLES.MANAGER && targetUser.id !== currentUser.id) return false;
    // Pode ver usuários comuns que ele criou ou ele mesmo
    return targetUser.created_by === currentUser.id || targetUser.id === currentUser.id;
  }
  
  // Usuário comum não vê outros usuários
  return false;
};

// Função para verificar se um usuário pode editar outro usuário
const canUserEditUser = (currentUser, targetUser) => {
  // Admin pode editar todos
  if (currentUser.role === ROLES.ADMIN) return true;
  
  // Manager só pode editar usuários que ele criou (não outros managers nem admin)
  if (currentUser.role === ROLES.MANAGER) {
    if (targetUser.role === ROLES.ADMIN || targetUser.role === ROLES.MANAGER) return false;
    return targetUser.created_by === currentUser.id;
  }
  
  // Usuário comum não pode editar outros
  return false;
};

// Função para obter roles disponíveis para um usuário criar
const getAvailableRolesForUser = (userRole) => {
  switch (userRole) {
    case ROLES.ADMIN:
      return [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER];
    case ROLES.MANAGER:
      return [ROLES.USER]; // Manager só pode criar usuários comuns
    default:
      return []; // Usuário comum não pode criar outros
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  getRolePermissions,
  VALID_ROLES,
  isValidRole,
  canManagerCreateRole,
  canUserViewUser,
  canUserEditUser,
  getAvailableRolesForUser
};
