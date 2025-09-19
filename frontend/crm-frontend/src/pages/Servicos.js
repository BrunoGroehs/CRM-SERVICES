import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import MultiFuncionariosSelect from '../components/MultiFuncionariosSelect';
import './Servicos.css';
import { getApiUrl } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

const Servicos = () => {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // novos usuários do sistema
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  
  // Estados para paginação e busca
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;
  
  const authenticatedFetch = useAuthenticatedFetch();
  const [formData, setFormData] = useState({
    cliente_id: '',
    data: '',
    hora: '',
    valor: '',
    notas: '',
  status: 'agendado',
  funcionario_responsavel: [], // array de IDs (strings)
  funcionarios: [] // DEPRECATED
  });
  const [formErrors, setFormErrors] = useState({});
  const [servicosDoCliente, setServicosDoCliente] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { add: pushToast } = useToast();

  useEffect(() => {
    fetchServicos();
    fetchClientes();
    fetchUsuarios();
  }, []);

  const fetchServicos = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(getApiUrl('servicos'));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setServicos(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await authenticatedFetch(getApiUrl('clientes'));
      if (response.ok) {
        const data = await response.json();
        // Ordenar clientes alfabeticamente por nome
        const clientesOrdenados = (data.data || []).sort((a, b) => 
          a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        );
        setClientes(clientesOrdenados);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const fetchUsuarios = async () => {
    try {
      // Tenta endpoint público mínimo primeiro (para todos usuários autenticados)
      let response = await authenticatedFetch(getApiUrl('usuarios/min'));
      if (response.ok) {
        const data = await response.json();
        const arr = data.data || data.users || data; // aceita diferentes formatos
        const mapped = Array.isArray(arr) ? arr.map(u => ({ id: u.id, nome: u.nome })) : [];
        setUsuarios(mapped);
        return;
      }

      // Fallback: se falhar, tenta endpoint admin (para admins/managers)
      response = await authenticatedFetch(getApiUrl('admin/users'));
      if (response.ok) {
        const data = await response.json();
        const arr = data.users || data.data || data;
        const mapped = Array.isArray(arr) ? arr.map(u => ({ id: u.id, nome: u.nome })) : [];
        setUsuarios(mapped);
      } else {
        setUsuarios([]);
      }
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
      setUsuarios([]);
    }
  };

  const fetchServicosDoCliente = async (clienteId) => {
    if (!clienteId) {
      setServicosDoCliente([]);
      return;
    }
    
    try {
      const response = await authenticatedFetch(getApiUrl(`servicos/cliente/${clienteId}`));
      if (response.ok) {
        const data = await response.json();
        setServicosDoCliente(data.data || []);
      } else {
        setServicosDoCliente([]);
      }
    } catch (error) {
      console.error('Erro ao carregar serviços do cliente:', error);
      setServicosDoCliente([]);
    }
  };

  const formatCurrency = (value) => {
    const numericValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Erro na data';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  };

  const getTotalReceita = () => {
    return servicos
      .filter(servico => servico.status === 'concluido')
      .reduce((total, servico) => {
        const valor = parseFloat(servico.valor) || 0;
        return total + valor;
      }, 0);
  };

  // Função para converter data ISO para formato do input date (YYYY-MM-DD)
  const formatDateForInput = (isoDateString) => {
    if (!isoDateString) return '';
    const date = new Date(isoDateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para converter data do input date (YYYY-MM-DD) para formato ISO
  const formatDateForAPI = (dateString) => {
    // O input type="date" já retorna no formato YYYY-MM-DD, que é o formato ISO
    return dateString;
  };

  // Funções de filtro e paginação
  const filteredServicos = servicos.filter(servico => {
    const clienteNome = clientes.find(c => c.id === servico.cliente_id)?.nome || '';
    const searchLower = searchTerm.toLowerCase();
    
    return (
      servico.id?.toString().includes(searchLower) ||
      clienteNome.toLowerCase().includes(searchLower) ||
  (Array.isArray(servico.funcionario_responsavel) ? servico.funcionario_responsavel.join(',') : (servico.funcionario_responsavel || '')).toLowerCase().includes(searchLower) ||
      servico.status?.toLowerCase().includes(searchLower) ||
      servico.notas?.toLowerCase().includes(searchLower) ||
      formatDate(servico.data).includes(searchLower) ||
      formatCurrency(servico.valor).includes(searchLower)
    );
  });

  // Calcular itens da página atual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentServicos = filteredServicos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredServicos.length / itemsPerPage);

  // Resetar página quando busca muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleEdit = (servico) => {
    setEditingServico(servico);
    setFormData({
      cliente_id: servico.cliente_id || '',
      data: formatDateForInput(servico.data), // Convertendo a data para o formato correto
      hora: servico.hora || '',
      valor: servico.valor || '',
      notas: servico.notas || '',
      status: servico.status || 'agendado',
  funcionario_responsavel: Array.isArray(servico.funcionario_responsavel) ? servico.funcionario_responsavel : (servico.funcionario_responsavel ? [servico.funcionario_responsavel] : []),
  funcionarios: []
    });
    setFormErrors({});
    
    // Buscar histórico se há cliente selecionado
    if (servico.cliente_id) {
      fetchServicosDoCliente(servico.cliente_id);
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingServico(null);
    setFormData({
  cliente_id: '', data: '', hora: '', valor: '', notas: '', status: 'agendado', funcionario_responsavel: [], funcionarios: []
    });
    setFormErrors({});
    setServicosDoCliente([]); // Limpar histórico ao fechar modal
  };

  const handleOpenModal = () => {
    const hoje = new Date();
    const dataAtual = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    setEditingServico(null);
    setFormData({
  cliente_id: '', data: dataAtual, hora: '09:00', valor: '', notas: '', status: 'agendado', funcionario_responsavel: [], funcionarios: []
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Se o cliente foi alterado, buscar histórico de serviços
    if (name === 'cliente_id' && value) {
      fetchServicosDoCliente(value);
    } else if (name === 'cliente_id' && !value) {
      setServicosDoCliente([]);
    }
    
    // Limpar erro específico quando o usuário digitar
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.cliente_id) {
      errors.cliente_id = 'Cliente é obrigatório';
    }
    
    if (!formData.data) {
      errors.data = 'Data é obrigatória';
    }
    
    if (!formData.hora) {
      errors.hora = 'Hora é obrigatória';
    }
    
    if (formData.valor && isNaN(formData.valor)) {
      errors.valor = 'Valor deve ser um número válido';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // evita cliques múltiplos rápidos
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Determinar se é criação ou edição
    const isEditing = editingServico && editingServico.id;

    try {
      setSubmitting(true);
      // Preparar dados para envio, convertendo a data para formato ISO
  const dataToSend = { ...formData, data: formatDateForAPI(formData.data) };
  dataToSend.funcionario_responsavel = (formData.funcionario_responsavel || []).map(id => String(id));
  delete dataToSend.funcionarios;

      const url = isEditing
        ? getApiUrl(`servicos/${editingServico.id}`)
        : getApiUrl('servicos');
      const method = isEditing ? 'PUT' : 'POST';

  console.debug('📤 Enviando serviço:', dataToSend);
  const response = await authenticatedFetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = isEditing ? 'Erro ao atualizar serviço' : 'Erro ao criar serviço';
        throw new Error(errorData.message || errorMessage);
      }

  await fetchServicos(); // Recarregar a lista
      handleCloseModal();

      // Se foi criação (não edição), abrir fluxo de recontato na página de Recontatos
      if (!isEditing) {
        const clienteId = dataToSend.cliente_id;
        if (clienteId) {
          navigate('/recontatos', {
            state: { triggerProximoRecontato: true, clienteId }
          });
        }
      }
    } catch (err) {
      console.error(isEditing ? 'Erro ao atualizar serviço:' : 'Erro ao criar serviço:', err);
      if (err.response) {
        try { const t = await err.response.text(); console.error('Resposta bruta:', t);} catch(_){}
      }
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskDelete = () => {
    if (!editingServico) return;
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!editingServico) return;
    try {
      const response = await authenticatedFetch(getApiUrl(`servicos/${editingServico.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir serviço');
      }

      pushToast('Serviço excluído com sucesso!', { type: 'success' });
      await fetchServicos(); // Recarregar a lista
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
  pushToast(`Erro ao excluir serviço: ${err.message}`, { type: 'error' });
    }
    setConfirmDeleteOpen(false);
  };

  const handleCancelDelete = () => setConfirmDeleteOpen(false);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <h3>Carregando serviços...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          <h3>Erro ao carregar serviços</h3>
          <p>{error}</p>
          <button onClick={fetchServicos} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>🔧 Serviços</h1>
          <p>Lista de todos os serviços realizados no sistema</p>
        </div>
        <div className="header-buttons">
          <button className="modern-add-btn" onClick={handleOpenModal}>
            <span className="btn-icon">+</span>
            <span className="btn-text">Adicionar Serviço</span>
          </button>
          <button className="refresh-btn" onClick={fetchServicos} disabled={loading}>
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
          </button>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="search-bar">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Pesquisar por ID, cliente, funcionário, status, data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredServicos.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum serviço encontrado</h3>
          <p>{searchTerm ? 'Nenhum serviço corresponde à sua busca.' : 'Não há serviços cadastrados no sistema.'}</p>
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabela de Serviços */}
          <div className="table-container">
            <table className="servicos-table">
              <thead>
                <tr>
                  <th>ID</th><th>Data</th><th>Hora</th><th>Cliente</th><th>Funcionários</th><th>Valor</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentServicos.map(servico => {
                  const cliente = clientes.find(c => c.id === servico.cliente_id);
                  return (
                    <tr key={servico.id}>
                      <td className="id-cell">{servico.id}</td>
                      <td className="data-cell">{formatDate(servico.data)}</td>
                      <td className="hora-cell">{formatTime(servico.hora)}</td>
                      <td className="cliente-cell"><strong>{cliente?.nome || `Cliente #${servico.cliente_id}`}</strong></td>
                      <td className="funcionario-cell">
                        {Array.isArray(servico.funcionario_responsavel) && servico.funcionario_responsavel.length > 0 ? (
                          <div className="funcionarios-badges">
                            {servico.funcionario_responsavel.slice(0,3).map(fid => {
                              const u = usuarios.find(u => String(u.id) === String(fid));
                              const nome = u?.nome || fid;
                              return <span key={fid} className="func-badge" title={nome}>{nome}</span>;
                            })}
                            {servico.funcionario_responsavel.length > 3 && <span className="func-badge more" title={servico.funcionario_responsavel.slice(3).join(', ')}>+{servico.funcionario_responsavel.length - 3}</span>}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="valor-cell"><span className="valor-badge">{formatCurrency(servico.valor)}</span></td>
                      <td className="status-cell"><span className={`status-badge ${servico.status || 'pendente'}`}>{servico.status || 'Pendente'}</span></td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button 
                            className="table-action-btn edit"
                            onClick={() => handleEdit(servico)}
                            title="Editar serviço"
                          >
                            <span className="icon">✏️</span>
                            <span>EDIT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginação */}
          <div className="pagination-container">
            <div className="pagination-info">
              Exibindo {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredServicos.length)} de {filteredServicos.length} serviços
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Anterior
              </button>
              
              <div className="pagination-pages">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      className={`pagination-page ${currentPage === pageNumber ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próximo →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-shell modal-lg modal-servico" role="dialog" aria-modal="true" aria-label={editingServico ? 'Editar serviço' : 'Criar novo serviço'} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">{editingServico ? '✏️ Editar Serviço' : '➕ Novo Serviço'}</h2><button className="modal-btn icon" onClick={handleCloseModal}>✕</button></div>
            <div className="modal-body modal-body-servico">
              <div className="servico-layout-container">
                <div className="servico-form-column">
                  <div className="modal-form-section">
                    <form onSubmit={handleSubmit} className="modal-form">
                  {/* CLIENTE */}
                  <div className="form-group">
                    <label htmlFor="cliente_id">Cliente *</label>
                    {editingServico ? (
                      // Modo edição: campo de texto somente leitura
                      <input
                        type="text"
                        id="cliente_readonly"
                        value={editingServico.cliente_nome || ''}
                        className="readonly-field"
                        readOnly
                        disabled
                      />
                    ) : (
                      // Modo criação: select normal
                      <select
                        id="cliente_id"
                        name="cliente_id"
                        value={formData.cliente_id}
                        onChange={handleInputChange}
                        className={formErrors.cliente_id ? 'error' : ''}
                        required
                      >
                        <option value="">Selecione um cliente</option>
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nome} - {cliente.telefone}
                          </option>
                        ))}
                      </select>
                    )}
                    {formErrors.cliente_id && (
                      <span className="error-message">{formErrors.cliente_id}</span>
                    )}
                  </div>

                  {/* DATA E HORA */}
                  <div className="form-group-row-horizontal">
                    <div className="form-group">
                      <label htmlFor="data">Data *</label>
                      <input
                        type="date"
                        id="data"
                        name="data"
                        value={formData.data}
                        onChange={handleInputChange}
                        className={formErrors.data ? 'error' : ''}
                        required
                      />
                      {formErrors.data && (
                        <span className="error-message">{formErrors.data}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="hora">Hora *</label>
                      <input
                        type="time"
                        id="hora"
                        name="hora"
                        value={formData.hora}
                        onChange={handleInputChange}
                        className={formErrors.hora ? 'error' : ''}
                        required
                      />
                      {formErrors.hora && (
                        <span className="error-message">{formErrors.hora}</span>
                      )}
                    </div>
                  </div>

                  {/* VALOR E STATUS */}
                  <div className="form-group-row-horizontal">
                    <div className="form-group">
                      <label htmlFor="valor">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        id="valor"
                        name="valor"
                        value={formData.valor}
                        onChange={handleInputChange}
                        className={formErrors.valor ? 'error' : ''}
                        placeholder="0,00"
                      />
                      {formErrors.valor && (
                        <span className="error-message">{formErrors.valor}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="status">Status</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="agendado">Agendado</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* RESPONSÁVEIS (multi IDs) */}
                  <div className="form-group">
                    <label>Responsáveis</label>
                    <div className="multi-funcionarios-control">
                      <select onChange={e => {
                        const val = e.target.value;
                        if (val && !formData.funcionario_responsavel.includes(val)) {
                          setFormData(prev => ({ ...prev, funcionario_responsavel: [...prev.funcionario_responsavel, val] }));
                        }
                        e.target.value='';
                      }}>
                        <option value="">Adicionar usuário...</option>
                        {usuarios.filter(u => !formData.funcionario_responsavel.includes(String(u.id))).map(u => (
                          <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                      </select>
                    </div>
                    {formData.funcionario_responsavel.length > 0 && (
                      <div className="multi-funcionarios-chips" style={{marginTop:'6px'}}>
                        {formData.funcionario_responsavel.map(fid => {
                          const u = usuarios.find(u => String(u.id) === String(fid));
                          const nome = u?.nome || fid;
                          return (
                            <span key={fid} className="func-chip" title={nome}>
                              {nome}
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, funcionario_responsavel: prev.funcionario_responsavel.filter(id => id !== fid) }))}>×</button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* OBSERVAÇÕES */}
                  <div className="form-group">
                    <label htmlFor="notas">Observações</label>
                    <textarea
                      id="notas"
                      name="notas"
                      value={formData.notas}
                      onChange={handleInputChange}
                      placeholder="Descreva detalhes do serviço, materiais utilizados, observações importantes..."
                      rows="4"
                    />
                  </div>

                  {formErrors.submit && (
                    <div className="form-error">
                      ⚠️ {formErrors.submit}
                    </div>
                  )}

                  {/* BOTÕES */}
                  <div className="modal-footer">
                    <button type="button" onClick={handleCloseModal} className="modal-btn modal-btn-secondary" title="Cancelar e fechar">
                      ↩️ Cancelar
                    </button>
                    {editingServico && (
                      <button
                          type="button"
                          onClick={handleAskDelete}
                          className="modal-btn modal-btn-danger"
                          title="Excluir este serviço permanentemente"
                        >
                          🗑️ Excluir
                        </button>
                    )}
                    <button type="submit" className="modal-btn" disabled={submitting}>
                      {submitting ? '⏳ Enviando...' : (editingServico ? '💾 Salvar Alterações' : '✨ Criar Serviço')}
                    </button>
                  </div>
                </form>
                  </div>
                </div>
                
                {/* Coluna da Direita - Histórico */}
                <div className="servico-historico-column">
                  <div className="modal-historico-section">
                    {/* Seção do Histórico do Cliente */}
                    {formData.cliente_id && (
                      <div className="modal-historico">
                        <h3>📋 Histórico de Serviços</h3>
                    {servicosDoCliente.length > 0 ? (
                      <div className="historico-modal-lista">
                        {servicosDoCliente.map((servico) => (
                          <div key={servico.id} className="historico-modal-item">
                            <div className="historico-modal-header">
                              <span className="servico-data-modal">
                                📅 {formatDate(servico.data)} - {formatTime(servico.hora)}
                              </span>
                              <span className={`status-badge-modal ${servico.status}`}>
                                {servico.status}
                              </span>
                            </div>
                            {servico.valor && (
                              <div className="servico-valor-modal">
                                💰 {formatCurrency(parseFloat(servico.valor))}
                              </div>
                            )}
                            {Array.isArray(servico.funcionario_responsavel) && servico.funcionario_responsavel.length > 0 && (
                              <div className="servico-funcionario-modal">
                                � {servico.funcionario_responsavel.map(fid => {
                                  const u = usuarios.find(u => String(u.id) === String(fid));
                                  return u?.nome || fid;
                                }).join(', ')}
                              </div>
                            )}
                            {servico.notas && (
                              <div className="servico-notas-modal">
                                📝 {servico.notas}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="sem-historico-modal">
                        <p>🔍 Nenhum serviço encontrado para este cliente</p>
                      </div>
                    )}
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    <ConfirmDialog
      open={confirmDeleteOpen}
      title="Excluir serviço"
      tone="danger"
      message={`Tem certeza que deseja excluir o serviço de ${editingServico?.cliente_nome || ''}?`}
      details={<>
        <p><strong>Data:</strong> {editingServico ? formatDate(editingServico.data) : '-'}</p>
        <p><strong>Valor:</strong> {editingServico ? formatCurrency(editingServico.valor || 0) : '-'}</p>
        <p style={{marginTop:'8px'}}>Esta ação não pode ser desfeita.</p>
      </>}
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      onConfirm={handleConfirmDelete}
      onCancel={handleCancelDelete}
    />
    </div>
  );
};

export default Servicos;
