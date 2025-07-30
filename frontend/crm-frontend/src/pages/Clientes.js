import React, { useState, useEffect } from 'react';
import './Clientes.css';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRecontatoModal, setShowRecontatoModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [servicosHistorico, setServicosHistorico] = useState([]);
  const [recontatosHistorico, setRecontatosHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [novoClienteId, setNovoClienteId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [recontatoData, setRecontatoData] = useState({
    data_agendada: '',
    observacoes: '',
    status: 'agendado'
  });
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    cep: '',
    indicacao: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  // Função para mostrar toast
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  // Função para remover toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/clientes');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setClientes(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricoServicos = async (clienteId) => {
    try {
      const response = await fetch(`http://localhost:3000/servicos/cliente/${clienteId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setServicosHistorico(data.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de serviços:', err);
      setServicosHistorico([]);
    }
  };

  const fetchHistoricoRecontatos = async (clienteId) => {
    try {
      const response = await fetch(`http://localhost:3000/recontatos`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Filtrar recontatos pelo cliente específico
      const recontatosCliente = data.data?.filter(r => r.cliente_id === clienteId) || [];
      setRecontatosHistorico(recontatosCliente);
    } catch (err) {
      console.error('Erro ao carregar histórico de recontatos:', err);
      setRecontatosHistorico([]);
    }
  };

  const handleVerDetalhes = async (cliente) => {
    setSelectedCliente(cliente);
    setShowDetalhesModal(true);
    setLoadingHistorico(true);
    
    try {
      await Promise.all([
        fetchHistoricoServicos(cliente.id),
        fetchHistoricoRecontatos(cliente.id)
      ]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleCloseDetalhesModal = () => {
    setShowDetalhesModal(false);
    setSelectedCliente(null);
    setServicosHistorico([]);
    setRecontatosHistorico([]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusRecontato = (recontato) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataAgendada = new Date(recontato.data_agendada);
    dataAgendada.setHours(0, 0, 0, 0);
    
    if (dataAgendada < hoje) {
      return { status: 'atrasado', label: 'Atrasado', class: 'atrasado' };
    }
    
    if (dataAgendada.getTime() === hoje.getTime()) {
      return { status: 'hoje', label: 'Hoje', class: 'hoje' };
    }

    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);
    
    if (dataAgendada <= seteDias) {
      return { status: 'proximos', label: 'Próximos 7 dias', class: 'proximos' };
    }
    
    return { status: 'longe', label: 'Longe demais', class: 'longe' };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const isEditing = editingCliente && editingCliente.id;

    try {
      const url = isEditing 
        ? `http://localhost:3000/clientes/${editingCliente.id}`
        : 'http://localhost:3000/clientes';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      // Primeiro verificar se a resposta tem conteúdo antes de tentar parsear
      const result = await response.json();

      if (!response.ok) {
        // Verificar se é erro de email duplicado
        if (response.status === 409 && result.message) {
          showToast(result.message, 'error');
          return;
        }
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Atualizar a lista de clientes
      await fetchClientes();
      
      if (isEditing) {
        // Se está editando, apenas fechar o modal
        setFormData({
          nome: '',
          telefone: '',
          email: '',
          endereco: '',
          cidade: '',
          cep: '',
          indicacao: ''
        });
        setEditingCliente(null);
        setShowModal(false);
        showToast('Cliente editado com sucesso!', 'success');
      } else {
        // Se é um novo cliente, abrir modal de recontato
        const clienteId = result.data?.id || result.id;
        setNovoClienteId(clienteId);
        setShowModal(false);
        setShowRecontatoModal(true);
        showToast('Cliente cadastrado com sucesso!', 'success');
        
        // Limpar apenas o formulário de cliente
        setFormData({
          nome: '',
          telefone: '',
          email: '',
          endereco: '',
          cidade: '',
          cep: '',
          indicacao: ''
        });
      }
      
    } catch (err) {
      console.error(isEditing ? 'Erro ao editar cliente:' : 'Erro ao cadastrar cliente:', err);
      
      // Mensagem de erro mais amigável
      let errorMessage = err.message;
      if (err.message.includes('duplicate key') || err.message.includes('already exists')) {
        errorMessage = 'Este email já está sendo usado por outro cliente. Por favor, use um email diferente.';
      } else if (err.message.includes('HTTP 500')) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns momentos.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
      }
      
      showToast(`Erro ao ${isEditing ? 'editar' : 'cadastrar'} cliente: ${errorMessage}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setEditingCliente(null);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      cep: '',
      indicacao: ''
    });
    setShowModal(true);
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      cep: cliente.cep || '',
      indicacao: cliente.indicacao || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      cep: '',
      indicacao: ''
    });
  };

  // Funções para o modal de recontato
  const getDataOptions = () => {
    const hoje = new Date();
    const options = [];
    
    // Hoje
    options.push({
      label: 'Hoje',
      value: hoje.toISOString().split('T')[0],
      description: hoje.toLocaleDateString('pt-BR')
    });
    
    // Amanhã
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    options.push({
      label: 'Amanhã',
      value: amanha.toISOString().split('T')[0],
      description: amanha.toLocaleDateString('pt-BR')
    });
    
    // Em 3 dias
    const tresDias = new Date(hoje);
    tresDias.setDate(hoje.getDate() + 3);
    options.push({
      label: 'Em 3 dias',
      value: tresDias.toISOString().split('T')[0],
      description: tresDias.toLocaleDateString('pt-BR')
    });
    
    // Em 1 semana
    const umaSemana = new Date(hoje);
    umaSemana.setDate(hoje.getDate() + 7);
    options.push({
      label: 'Em 1 semana',
      value: umaSemana.toISOString().split('T')[0],
      description: umaSemana.toLocaleDateString('pt-BR')
    });
    
    // Em 2 semanas
    const duasSemanas = new Date(hoje);
    duasSemanas.setDate(hoje.getDate() + 14);
    options.push({
      label: 'Em 2 semanas',
      value: duasSemanas.toISOString().split('T')[0],
      description: duasSemanas.toLocaleDateString('pt-BR')
    });
    
    // Em 1 mês
    const umMes = new Date(hoje);
    umMes.setMonth(hoje.getMonth() + 1);
    options.push({
      label: 'Em 1 mês',
      value: umMes.toISOString().split('T')[0],
      description: umMes.toLocaleDateString('pt-BR')
    });
    
    return options;
  };

  const handleDataOptionClick = (dataValue) => {
    setRecontatoData(prev => ({
      ...prev,
      data_agendada: dataValue
    }));
  };

  const handleRecontatoInputChange = (e) => {
    const { name, value } = e.target;
    setRecontatoData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitRecontato = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3000/recontatos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_id: novoClienteId,
          ...recontatoData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      alert('Cliente e recontato criados com sucesso!');
      handleCloseRecontatoModal();
      
    } catch (err) {
      console.error('Erro ao criar recontato:', err);
      alert('Erro ao criar recontato: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRecontatoModal = () => {
    setShowRecontatoModal(false);
    setNovoClienteId(null);
    setRecontatoData({
      data_agendada: '',
      observacoes: '',
      status: 'agendado'
    });
  };

  const handleSkipRecontato = () => {
    alert('Cliente criado com sucesso!');
    handleCloseRecontatoModal();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <h3>Carregando clientes...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          <h3>Erro ao carregar clientes</h3>
          <p>{error}</p>
          <button onClick={fetchClientes} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Clientes</h1>
        <p>Lista de todos os clientes cadastrados no sistema</p>
        <button className="add-btn" onClick={openModal}>
          ➕ CLIENTE +
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{clientes.length}</span>
          <span className="stat-label">Total de Clientes</span>
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum cliente encontrado</h3>
          <p>Não há clientes cadastrados no sistema.</p>
        </div>
      ) : (
        <div className="data-grid">
          {clientes.map((cliente) => (
            <div key={cliente.id} className="data-card">
              <div className="card-header">
                <h3>{cliente.nome}</h3>
                <span className="card-id">ID: {cliente.id}</span>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span className="info-label">📧 Email:</span>
                  <span className="info-value">{cliente.email || 'Não informado'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📱 Telefone:</span>
                  <span className="info-value">{cliente.telefone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📍 Endereço:</span>
                  <span className="info-value">{cliente.endereco}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">🏙️ Cidade:</span>
                  <span className="info-value">{cliente.cidade}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📮 CEP:</span>
                  <span className="info-value">{cliente.cep}</span>
                </div>
                {cliente.indicacao && (
                  <div className="info-row">
                    <span className="info-label">👥 Indicação:</span>
                    <span className="info-value">{cliente.indicacao}</span>
                  </div>
                )}
                {cliente.criado_em && (
                  <div className="info-row">
                    <span className="info-label">📅 Cadastrado em:</span>
                    <span className="info-value">{formatDate(cliente.criado_em)}</span>
                  </div>
                )}
              </div>
              <div className="card-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(cliente)}
                  title="Editar cliente"
                >
                  ✏️ Editar
                </button>
                <button 
                  className="details-btn"
                  onClick={() => handleVerDetalhes(cliente)}
                  title="Ver histórico e detalhes"
                >
                  📋 Ver Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchClientes} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
      </button>

      {/* Modal para cadastro de cliente */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCliente ? '✏️ Editar Cliente' : '➕ Cadastrar Novo Cliente'}</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="cliente-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">Nome Completo *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefone">Telefone *</label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    required
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cidade">Cidade *</label>
                  <input
                    type="text"
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    placeholder="Nome da cidade"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="endereco">Endereço</label>
                  <input
                    type="text"
                    id="endereco"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cep">CEP</label>
                  <input
                    type="text"
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="indicacao">👥 Indicação</label>
                  <input
                    type="text"
                    id="indicacao"
                    name="indicacao"
                    value={formData.indicacao}
                    onChange={handleInputChange}
                    placeholder="Quem indicou este cliente?"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  ❌ Cancelar
                </button>
                <button type="submit" disabled={submitting} className="submit-btn">
                  {submitting 
                    ? '⏳ Salvando...' 
                    : editingCliente 
                      ? '💾 Salvar Alterações' 
                      : '✅ Salvar Cliente'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para criação de recontato */}
      {showRecontatoModal && (
        <div className="modal-overlay" onClick={handleCloseRecontatoModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>� Agendar Primeiro Recontato</h2>
              <button className="close-btn" onClick={handleCloseRecontatoModal}>✕</button>
            </div>
            
            <form onSubmit={handleSubmitRecontato} className="recontato-form">
              <div className="recontato-intro">
                <p>Cliente criado com sucesso!</p>
                <p>Agora vamos agendar o primeiro recontato para manter o relacionamento ativo e identificar novas oportunidades de negócio.</p>
              </div>

              <div className="data-options">
                <h3>Escolha uma data rápida:</h3>
                <div className="quick-dates">
                  {getDataOptions().map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`date-option ${recontatoData.data_agendada === option.value ? 'selected' : ''}`}
                      onClick={() => handleDataOptionClick(option.value)}
                    >
                      <span className="date-label">{option.label}</span>
                      <span className="date-description">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-date-section">
                <h3>Ou escolha uma data personalizada:</h3>
                <div className="form-group">
                  <label htmlFor="data_agendada">📅 Data Personalizada</label>
                  <input
                    type="date"
                    id="data_agendada"
                    name="data_agendada"
                    value={recontatoData.data_agendada}
                    onChange={handleRecontatoInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder="Selecione uma data específica"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="observacoes">� Observações (opcional)</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={recontatoData.observacoes}
                  onChange={handleRecontatoInputChange}
                  placeholder="Ex: Verificar interesse em novos serviços, apresentar promoções, acompanhar satisfação..."
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleSkipRecontato} className="skip-btn">
                  ⏭️ Finalizar sem Agendar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !recontatoData.data_agendada} 
                  className="submit-btn"
                >
                  {submitting ? '⏳ Agendando...' : '� Agendar Recontato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cliente */}
      {showDetalhesModal && selectedCliente && (
        <div className="modal-overlay" onClick={handleCloseDetalhesModal}>
          <div className="modal-content detalhes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Detalhes do Cliente - {selectedCliente.nome}</h2>
              <button className="close-btn" onClick={handleCloseDetalhesModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {/* Informações do Cliente */}
              <div className="cliente-info-detalhada">
                <h3>👤 Informações do Cliente</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">📱 Telefone:</span>
                    <span className="info-value">{selectedCliente.telefone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📧 Email:</span>
                    <span className="info-value">{selectedCliente.email || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">🏠 Endereço:</span>
                    <span className="info-value">{selectedCliente.endereco || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">🏙️ Cidade:</span>
                    <span className="info-value">{selectedCliente.cidade || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📮 CEP:</span>
                    <span className="info-value">{selectedCliente.cep || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">👥 Indicação:</span>
                    <span className="info-value">{selectedCliente.indicacao || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">� Quantidade de Painéis:</span>
                    <span className="info-value">{selectedCliente.quantidade_paineis || 0} painéis</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">�📅 Cadastrado em:</span>
                    <span className="info-value">{formatDate(selectedCliente.criado_em)}</span>
                  </div>
                </div>
              </div>

              {/* Histórico de Serviços */}
              <div className="historico-section">
                <h3>🔧 Histórico de Serviços ({servicosHistorico.length})</h3>
                
                {loadingHistorico ? (
                  <div className="loading-historico">
                    <p>Carregando histórico de serviços...</p>
                  </div>
                ) : servicosHistorico.length === 0 ? (
                  <div className="empty-historico">
                    <p>Nenhum serviço encontrado para este cliente.</p>
                  </div>
                ) : (
                  <div className="servicos-list">
                    {servicosHistorico.map((servico) => (
                      <div key={servico.id} className="servico-item">
                        <div className="servico-header">
                          <span className="servico-data">{formatDate(servico.data)}</span>
                          <span className={`servico-status ${servico.status}`}>
                            {servico.status || 'Agendado'}
                          </span>
                        </div>
                        <div className="servico-details">
                          <div className="servico-info">
                            <span className="servico-label">⏰ Hora:</span>
                            <span>{formatTime(servico.hora)}</span>
                          </div>
                          <div className="servico-info">
                            <span className="servico-label">💰 Valor:</span>
                            <span>{formatCurrency(servico.valor || 0)}</span>
                          </div>
                          {servico.funcionario_responsavel && (
                            <div className="servico-info">
                              <span className="servico-label">👤 Responsável:</span>
                              <span>{servico.funcionario_responsavel}</span>
                            </div>
                          )}
                          {servico.notas && (
                            <div className="servico-info">
                              <span className="servico-label">📝 Observações:</span>
                              <span>{servico.notas}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico de Recontatos */}
              <div className="historico-section">
                <h3>📞 Histórico de Recontatos ({recontatosHistorico.length})</h3>
                
                {loadingHistorico ? (
                  <div className="loading-historico">
                    <p>Carregando histórico de recontatos...</p>
                  </div>
                ) : recontatosHistorico.length === 0 ? (
                  <div className="empty-historico">
                    <p>Nenhum recontato encontrado para este cliente.</p>
                  </div>
                ) : (
                  <div className="recontatos-list">
                    {recontatosHistorico.map((recontato) => {
                      const statusInfo = getStatusRecontato(recontato);
                      return (
                        <div key={recontato.id} className="recontato-item">
                          <div className="recontato-header">
                            <span className="recontato-data">{formatDate(recontato.data_agendada)}</span>
                            <span className={`recontato-status ${statusInfo.class}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="recontato-details">
                            {recontato.hora_agendada && (
                              <div className="recontato-info">
                                <span className="recontato-label">⏰ Hora:</span>
                                <span>{formatTime(recontato.hora_agendada)}</span>
                              </div>
                            )}
                            <div className="recontato-info">
                              <span className="recontato-label">🎯 Motivo:</span>
                              <span>{recontato.motivo || 'Não informado'}</span>
                            </div>
                            <div className="recontato-info">
                              <span className="recontato-label">📊 Status:</span>
                              <span>{recontato.status || 'Pendente'}</span>
                            </div>
                            {recontato.observacoes && (
                              <div className="recontato-info">
                                <span className="recontato-label">📝 Observações:</span>
                                <span>{recontato.observacoes}</span>
                              </div>
                            )}
                            <div className="recontato-info">
                              <span className="recontato-label">📅 Criado em:</span>
                              <span>{formatDate(recontato.created_at || recontato.criado_em)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sistema de Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span className="toast-icon">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
              </span>
              <span className="toast-message">{toast.message}</span>
              <button 
                className="toast-close" 
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar notificação"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Clientes;
