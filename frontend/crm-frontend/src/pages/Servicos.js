import React, { useState, useEffect } from 'react';
import './Servicos.css';
import { getApiUrl } from '../utils/api';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

const Servicos = () => {
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const authenticatedFetch = useAuthenticatedFetch();
  const [formData, setFormData] = useState({
    cliente_id: '',
    data: '',
    hora: '',
    valor: '',
    notas: '',
    status: 'agendado',
    funcionario_responsavel: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [servicosDoCliente, setServicosDoCliente] = useState([]);

  useEffect(() => {
    fetchServicos();
    fetchClientes();
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
        setClientes(data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
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
    return new Date(dateString).toLocaleDateString('pt-BR');
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

  const handleEdit = (servico) => {
    setEditingServico(servico);
    setFormData({
      cliente_id: servico.cliente_id || '',
      data: formatDateForInput(servico.data), // Convertendo a data para o formato correto
      hora: servico.hora || '',
      valor: servico.valor || '',
      notas: servico.notas || '',
      status: servico.status || 'agendado',
      funcionario_responsavel: servico.funcionario_responsavel || ''
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
      cliente_id: '',
      data: '',
      hora: '',
      valor: '',
      notas: '',
      status: 'agendado',
      funcionario_responsavel: ''
    });
    setFormErrors({});
    setServicosDoCliente([]); // Limpar histórico ao fechar modal
  };

  const handleOpenModal = () => {
    const hoje = new Date();
    const dataAtual = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    setEditingServico(null);
    setFormData({
      cliente_id: '',
      data: dataAtual,
      hora: '09:00',
      valor: '',
      notas: '',
      status: 'agendado',
      funcionario_responsavel: ''
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
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Determinar se é criação ou edição
    const isEditing = editingServico && editingServico.id;

    try {
      // Preparar dados para envio, convertendo a data para formato ISO
      const dataToSend = {
        ...formData,
        data: formatDateForAPI(formData.data)
      };

      const url = isEditing
        ? getApiUrl(`servicos/${editingServico.id}`)
        : getApiUrl('servicos');
      const method = isEditing ? 'PUT' : 'POST';

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
    } catch (err) {
      console.error(isEditing ? 'Erro ao atualizar serviço:' : 'Erro ao criar serviço:', err);
      setFormErrors({ submit: err.message });
    }
  };

  const handleDeleteServico = async () => {
    if (!editingServico) return;
    
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o serviço do cliente "${editingServico.cliente_nome}"?\n\n` +
      `Data: ${formatDate(editingServico.data)}\n` +
      `Valor: ${formatCurrency(editingServico.valor || 0)}\n\n` +
      `Esta ação não pode ser desfeita!`
    );
    
    if (!confirmDelete) return;
    
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

      alert('Serviço excluído com sucesso!');
      await fetchServicos(); // Recarregar a lista
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
      alert(`Erro ao excluir serviço: ${err.message}`);
    }
  };

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
        <h1>🔧 Serviços</h1>
        <p>Lista de todos os serviços realizados no sistema</p>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleOpenModal}>
            ➕
          </button>
          <button className="refresh-btn" onClick={fetchServicos} disabled={loading}>
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
          </button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{servicos.length}</span>
          <span className="stat-label">Total de Serviços</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{formatCurrency(getTotalReceita())}</span>
          <span className="stat-label">Receita Total</span>
          <span className="stat-note">(apenas serviços concluídos)</span>
        </div>
      </div>

      {servicos.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum serviço encontrado</h3>
          <p>Não há serviços cadastrados no sistema.</p>
        </div>
      ) : (
        <div className="data-grid">
          {servicos.map((servico) => (
            <div key={servico.id} className="data-card servico-card">
              <div className="card-header">
                <h3>{servico.cliente_nome}</h3>
                <div className="card-badges">
                  <span className="card-id">ID: {servico.id}</span>
                  <span className="valor-badge">{formatCurrency(servico.valor)}</span>
                </div>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span className="info-label">👤 Cliente ID:</span>
                  <span className="info-value">{servico.cliente_id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📱 Telefone:</span>
                  <span className="info-value">{servico.cliente_telefone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📅 Data:</span>
                  <span className="info-value">{formatDate(servico.data)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">⏰ Hora:</span>
                  <span className="info-value">{formatTime(servico.hora)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📝 Descrição:</span>
                  <span className="info-value">{servico.notas || 'Sem descrição'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📊 Status:</span>
                  <span className={`status-badge ${servico.status || 'pendente'}`}>
                    {servico.status || 'Pendente'}
                  </span>
                </div>
                {servico.funcionario_responsavel && (
                  <div className="info-row">
                    <span className="info-label">👤 Responsável:</span>
                    <span className="info-value">{servico.funcionario_responsavel}</span>
                  </div>
                )}
                {servico.criado_em && (
                  <div className="info-row">
                    <span className="info-label">📅 Cadastrado em:</span>
                    <span className="info-value">{formatDate(servico.criado_em)}</span>
                  </div>
                )}
              </div>
              <div className="card-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(servico)}
                  title="Editar serviço"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingServico ? '✏️ Editar Serviço' : '➕ Novo Serviço'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-wide">
              <div className="modal-form-section">
                <form onSubmit={handleSubmit} className="modal-form">
                  {/* CLIENTE */}
                  <div className="form-group">
                    <label htmlFor="cliente_id">Cliente *</label>
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

                  {/* FUNCIONÁRIO RESPONSÁVEL */}
                  <div className="form-group">
                    <label htmlFor="funcionario_responsavel">Funcionário Responsável</label>
                    <input
                      type="text"
                      id="funcionario_responsavel"
                      name="funcionario_responsavel"
                      value={formData.funcionario_responsavel}
                      onChange={handleInputChange}
                      placeholder="Ex: João Silva, Maria Santos..."
                    />
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
                  <div className="form-actions">
                    <button type="button" onClick={handleCloseModal} className="btn-secondary">
                      ↩️ Cancelar
                    </button>
                    
                    {editingServico && (
                      <button 
                        type="button" 
                        onClick={handleDeleteServico} 
                        className="btn-danger"
                        title="Excluir este serviço permanentemente"
                      >
                        🗑️ Excluir
                      </button>
                    )}
                    
                    <button type="submit" className="btn-primary">
                      {editingServico ? '💾 Salvar Alterações' : '✨ Criar Serviço'}
                    </button>
                  </div>
                </form>
              </div>
              
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
                            {servico.funcionario_responsavel && (
                              <div className="servico-funcionario-modal">
                                👤 {servico.funcionario_responsavel}
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
      )}
    </div>
  );
};

export default Servicos;
