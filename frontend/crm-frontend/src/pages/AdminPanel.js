import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { useAuth } from '../contexts/AuthContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    nome: '',
    role: 'user',
    ativo: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      const [usersResponse, availableRolesResponse, statsResponse] = await Promise.all([
        authenticatedFetch(getApiUrl('admin/users')),
        authenticatedFetch(getApiUrl('admin/available-roles')),
        authenticatedFetch(getApiUrl('admin/stats'))
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      if (availableRolesResponse.ok) {
        const rolesData = await availableRolesResponse.json();
        const availableRoles = rolesData.roles || [];
        console.log('🔧 Frontend - Roles recebidos:', availableRoles);
        setRoles(availableRoles);
        
        // Definir o role padrão como o primeiro disponível
        if (availableRoles.length > 0) {
          console.log('🔧 Frontend - Definindo role padrão:', availableRoles[0].value);
          setNewUser(prev => ({
            ...prev,
            role: availableRoles[0].value
          }));
        }
      } else {
        console.error('🔧 Frontend - Erro ao carregar roles:', availableRolesResponse.status);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || null);
      }

    } catch (error) {
      console.error('Erro ao carregar dados administrativos:', error);
      setError('Erro ao carregar dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setError('');
      const response = await authenticatedFetch(getApiUrl(`admin/users/${selectedUser.id}/role`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Role do usuário ${selectedUser.email} alterada para ${selectedRole}`);
        setShowRoleModal(false);
        setSelectedUser(null);
        setSelectedRole('');
        loadAdminData(); // Recarregar dados
      } else {
        setError(data.message || 'Erro ao alterar role');
      }
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      setError('Erro ao alterar role do usuário');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      setError('');
      const newStatus = !user.ativo;
      
      const response = await authenticatedFetch(getApiUrl(`admin/users/${user.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ativo: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Usuário ${user.email} ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
        loadAdminData(); // Recarregar dados
      } else {
        setError(data.message || 'Erro ao alterar status do usuário');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setError('Erro ao alterar status do usuário');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      // Validações básicas
      if (!newUser.email || !newUser.nome) {
        setError('Email e nome são obrigatórios');
        return;
      }
      
      const response = await authenticatedFetch(getApiUrl('admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Usuário ${newUser.email} criado com sucesso`);
        setShowCreateUserModal(false);
        setNewUser({
          email: '',
          nome: '',
          role: 'user',
          ativo: true
        });
        loadAdminData(); // Recarregar dados
      } else {
        setError(data.message || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setError('Erro ao criar usuário');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.email}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setError('');
      const response = await authenticatedFetch(getApiUrl(`admin/users/${user.id}`), {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Usuário ${user.email} excluído com sucesso`);
        loadAdminData(); // Recarregar dados
      } else {
        setError(data.message || 'Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      setError('Erro ao excluir usuário');
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setShowRoleModal(true);
  };

  const openPermissionsModal = (role) => {
    setSelectedRole(role);
    setShowPermissionsModal(true);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'role-badge admin';
      case 'manager': return 'role-badge manager';
      case 'user': return 'role-badge user';
      default: return 'role-badge';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading">Carregando painel administrativo...</div>
      </div>
    );
  }

    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h1>
            {currentUser?.role === 'admin' ? '🛡️ Painel Administrativo' : '👥 Gerenciamento de Equipe'}
          </h1>
          <p>
            {currentUser?.role === 'admin' 
              ? 'Gestão completa de usuários, roles e permissões do sistema'
              : 'Gestão da sua equipe e usuários criados por você'
            }
          </p>
          {currentUser?.role === 'manager' && (
            <div className="role-info">
              <span className="role-badge manager">👔 Gerente</span>
              <small>Você pode criar e gerenciar apenas usuários comuns</small>
            </div>
          )}
        </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Estatísticas */}
      {stats && (
        <div className="stats-section">
          <h2>📊 Estatísticas do Sistema</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Distribuição por Role</h3>
              {stats.roleDistribution?.map(item => (
                <div key={item.role} className="stat-item">
                  <span className={getRoleBadgeClass(item.role)}>{item.role}</span>
                  <span>{item.count} usuário(s)</span>
                </div>
              ))}
            </div>
            <div className="stat-card">
              <h3>Status dos Usuários</h3>
              {stats.statusDistribution?.map(item => (
                <div key={item.ativo} className="stat-item">
                  <span className={`status-badge ${item.ativo ? 'active' : 'inactive'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <span>{item.count} usuário(s)</span>
                </div>
              ))}
            </div>
            <div className="stat-card">
              <h3>Atividade Recente</h3>
              <div className="stat-item">
                <span>Registros recentes (30 dias)</span>
                <span>{stats.recentRegistrations}</span>
              </div>
              <div className="stat-item">
                <span>Ativos recentemente (7 dias)</span>
                <span>{stats.recentlyActive}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="users-section">
        <div className="section-header">
          <h2>👥 Gestão de Usuários ({users.length})</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateUserModal(true)}
            title="Adicionar novo usuário"
          >
            ➕ Adicionar Usuário
          </button>
        </div>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Último Login</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      {user.foto_perfil && (
                        <img src={user.foto_perfil} alt={user.nome} className="user-avatar" />
                      )}
                      <span>{user.nome}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={getRoleBadgeClass(user.role)}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.ativo ? 'active' : 'inactive'}`}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>{formatDate(user.ultimo_login)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openRoleModal(user)}
                        title="Alterar Role"
                      >
                        🔑 Role
                      </button>
                      <button
                        className={`btn btn-sm ${user.ativo ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleUserStatus(user)}
                        title={user.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {user.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteUser(user)}
                        title="Excluir usuário"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção de Roles */}
      <div className="roles-section">
        <h2>🔐 Roles e Permissões</h2>
        <div className="roles-grid">
          {roles.map(role => (
            <div key={role.name} className="role-card">
              <div className="role-header">
                <span className={getRoleBadgeClass(role.name)}>{role.name}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openPermissionsModal(role)}
                >
                  Ver Permissões
                </button>
              </div>
              <div className="role-description">
                {role.name === 'admin' && 'Acesso total ao sistema'}
                {role.name === 'manager' && 'Gestão de clientes, serviços e recontatos'}
                {role.name === 'user' && 'Acesso básico para operações do dia-a-dia'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Alterar Role */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Alterar Role do Usuário</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowRoleModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Usuário: <strong>{selectedUser?.nome} ({selectedUser?.email})</strong></p>
              <p>Role atual: <span className={getRoleBadgeClass(selectedUser?.role)}>{selectedUser?.role}</span></p>
              
              <div className="form-group">
                <label>Nova Role:</label>
                <select 
                  value={selectedRole} 
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-control"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleChangeRole}>
                Alterar Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Permissões */}
      {showPermissionsModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Permissões da Role: {selectedRole.name}</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPermissionsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="permissions-list">
                {Object.entries(selectedRole.permissions || {}).map(([permission, hasPermission]) => (
                  <div key={permission} className="permission-item">
                    <span className={`permission-status ${hasPermission ? 'allowed' : 'denied'}`}>
                      {hasPermission ? '✅' : '❌'}
                    </span>
                    <span className="permission-name">{permission}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPermissionsModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Criar Usuário */}
      {showCreateUserModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Adicionar Novo Usuário</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowCreateUserModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Email *</label>
                  <input 
                    type="email"
                    value={newUser.email} 
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="form-control"
                    placeholder="usuario@exemplo.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input 
                    type="text"
                    value={newUser.nome} 
                    onChange={(e) => setNewUser({...newUser, nome: e.target.value})}
                    className="form-control"
                    placeholder="Nome do usuário"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={newUser.role} 
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="form-control"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={newUser.ativo} 
                      onChange={(e) => setNewUser({...newUser, ativo: e.target.checked})}
                    />
                    <span className="checkbox-text">Usuário ativo</span>
                  </label>
                </div>
                
                <div className="form-note">
                  <p><strong>Nota:</strong> O usuário precisará fazer login com Google OAuth na primeira vez para vincular sua conta.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
