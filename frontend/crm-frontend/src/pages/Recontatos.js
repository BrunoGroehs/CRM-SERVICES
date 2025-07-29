import React, { useState, useEffect } from 'react';
import './Recontatos.css';

const Recontatos = () => {
  const [recontatos, setRecontatos] = useState([]);
  const [filteredRecontatos, setFilteredRecontatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [servicosHistorico, setServicosHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    fetchRecontatos();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [recontatos, activeFilter]);

  const fetchRecontatos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/recontatos');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRecontatos(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar recontatos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchServicosHistorico = async (clienteId) => {
    try {
      setLoadingHistorico(true);
      const response = await fetch(`http://localhost:3000/servicos/cliente/${clienteId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setServicosHistorico(data.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setServicosHistorico([]);
    } finally {
      setLoadingHistorico(false);
    }
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

  const getStatusInfo = (recontato) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataAgendada = new Date(recontato.data_agendada);
    dataAgendada.setHours(0, 0, 0, 0);
    
    if (recontato.status === 'realizado') {
      return { status: 'realizado', label: 'Realizado', class: 'realizado' };
    }
    
    if (dataAgendada < hoje) {
      return { status: 'atrasado', label: 'Atrasado', class: 'atrasado' };
    }
    
    if (dataAgendada.getTime() === hoje.getTime()) {
      return { status: 'hoje', label: 'Hoje', class: 'hoje' };
    }

    // Próximos 7 dias
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);
    
    if (dataAgendada <= seteDias) {
      return { status: 'proximos', label: 'Próximos 7 dias', class: 'proximos' };
    }
    
    return { status: 'agendado', label: 'Agendado', class: 'agendado' };
  };

  const applyFilter = () => {
    let filtered = recontatos;
    
    switch (activeFilter) {
      case 'atrasados':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'atrasado');
        break;
      case 'hoje':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'hoje');
        break;
      case 'proximos':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'proximos');
        break;
      case 'realizados':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'realizado');
        break;
      case 'agendados':
        filtered = recontatos.filter(r => ['agendado', 'proximos'].includes(getStatusInfo(r).status));
        break;
      default:
        filtered = recontatos;
    }
    
    setFilteredRecontatos(filtered);
  };

  const getStats = () => {
    const stats = {
      total: recontatos.length,
      realizados: 0,
      atrasados: 0,
      hoje: 0,
      proximos: 0,
      agendados: 0
    };

    recontatos.forEach(recontato => {
      const statusInfo = getStatusInfo(recontato);
      switch (statusInfo.status) {
        case 'realizado':
          stats.realizados++;
          break;
        case 'atrasado':
          stats.atrasados++;
          break;
        case 'hoje':
          stats.hoje++;
          break;
        case 'proximos':
          stats.proximos++;
          break;
        case 'agendado':
          stats.agendados++;
          break;
        default:
          break;
      }
    });

    return stats;
  };

  const handleContatar = (recontato) => {
    // Abrir WhatsApp ou telefone
    const phone = recontato.cliente_telefone.replace(/\D/g, '');
    const message = `Olá ${recontato.cliente_nome}, estou entrando em contato conforme agendado. Como posso ajudá-lo?`;
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleMarcarRealizado = async (recontato) => {
    try {
      console.log('Marcando recontato como realizado:', recontato.id);
      
      const requestBody = {
        status: 'realizado',
        data_realizado: new Date().toISOString().split('T')[0]
      };
      
      console.log('Dados enviados:', requestBody);
      
      const response = await fetch(`http://localhost:3000/recontatos/${recontato.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Resposta do servidor:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Recontato atualizado com sucesso:', data);
        await fetchRecontatos(); // Recarregar lista
        alert('Recontato marcado como realizado com sucesso!');
      } else {
        const errorData = await response.text();
        console.error('Erro na resposta:', errorData);
        alert(`Erro ao marcar como realizado: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erro ao marcar como realizado:', err);
      alert(`Erro de conexão: ${err.message}`);
    }
  };

  const handleVerDetalhes = async (recontato) => {
    setSelectedCliente(recontato);
    setShowModal(true);
    await fetchServicosHistorico(recontato.cliente_id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCliente(null);
    setServicosHistorico([]);
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <h3>Carregando recontatos...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          <h3>Erro ao carregar recontatos</h3>
          <p>{error}</p>
          <button onClick={fetchRecontatos} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📞 Recontatos</h1>
        <p>Lista de todos os recontatos agendados no sistema</p>
      </div>

      <div className="stats-bar recontatos-stats">
        <div 
          className={`stat-item ${activeFilter === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('todos')}
        >
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Todos</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'atrasados' ? 'active' : ''}`}
          onClick={() => setActiveFilter('atrasados')}
        >
          <span className="stat-value stat-danger">{stats.atrasados}</span>
          <span className="stat-label">Atrasados</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'hoje' ? 'active' : ''}`}
          onClick={() => setActiveFilter('hoje')}
        >
          <span className="stat-value stat-warning">{stats.hoje}</span>
          <span className="stat-label">Hoje</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'proximos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('proximos')}
        >
          <span className="stat-value stat-info">{stats.proximos}</span>
          <span className="stat-label">Próximos 7 dias</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'realizados' ? 'active' : ''}`}
          onClick={() => setActiveFilter('realizados')}
        >
          <span className="stat-value stat-success">{stats.realizados}</span>
          <span className="stat-label">Realizados</span>
        </div>
      </div>

      {filteredRecontatos.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum recontato encontrado</h3>
          <p>Não há recontatos {activeFilter === 'todos' ? 'cadastrados' : `na categoria "${activeFilter}"`} no sistema.</p>
        </div>
      ) : (
        <div className="data-grid">
          {filteredRecontatos.map((recontato) => {
            const statusInfo = getStatusInfo(recontato);
            return (
              <div key={recontato.id} className={`data-card recontato-card ${statusInfo.class}`}>
                <div className="card-header">
                  <h3>{recontato.cliente_nome}</h3>
                  <div className="card-badges">
                    <span className="card-id">ID: {recontato.id}</span>
                    <span className={`status-badge ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <div className="card-content">
                  <div className="info-row">
                    <span className="info-label">👤 Cliente ID:</span>
                    <span className="info-value">{recontato.cliente_id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📱 Telefone:</span>
                    <span className="info-value">{recontato.cliente_telefone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📅 Data Agendada:</span>
                    <span className="info-value">{formatDate(recontato.data_agendada)}</span>
                  </div>
                  {recontato.hora_agendada && (
                    <div className="info-row">
                      <span className="info-label">⏰ Hora:</span>
                      <span className="info-value">{formatTime(recontato.hora_agendada)}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">🎯 Motivo:</span>
                    <span className="info-value">{recontato.motivo || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📝 Observações:</span>
                    <span className="info-value">{recontato.observacoes || 'Sem observações'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📊 Status:</span>
                    <span className="info-value">{recontato.status || 'Pendente'}</span>
                  </div>
                  {recontato.criado_em && (
                    <div className="info-row">
                      <span className="info-label">📅 Cadastrado em:</span>
                      <span className="info-value">{formatDate(recontato.criado_em)}</span>
                    </div>
                  )}
                </div>
                
                {/* Botões de Ação */}
                <div className="card-actions">
                  <button 
                    className="action-btn contatar-btn"
                    onClick={() => handleContatar(recontato)}
                    title="Contatar cliente via WhatsApp"
                  >
                    💬 Contatar
                  </button>
                  
                  {recontato.status !== 'realizado' && (
                    <button 
                      className="action-btn marcar-btn"
                      onClick={() => handleMarcarRealizado(recontato)}
                      title="Marcar como realizado"
                    >
                      ✅ Marcar
                    </button>
                  )}
                  
                  <button 
                    className="action-btn detalhes-btn"
                    onClick={() => handleVerDetalhes(recontato)}
                    title="Ver histórico de serviços"
                  >
                    📋 Ver Detalhes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchRecontatos} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
      </button>

      {/* Modal de Detalhes do Cliente */}
      {showModal && selectedCliente && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content cliente-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Histórico de Serviços - {selectedCliente.cliente_nome}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="cliente-info">
                <div className="info-row">
                  <span className="info-label">👤 Cliente:</span>
                  <span className="info-value">{selectedCliente.cliente_nome}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📱 Telefone:</span>
                  <span className="info-value">{selectedCliente.cliente_telefone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📞 Recontato agendado:</span>
                  <span className="info-value">{formatDate(selectedCliente.data_agendada)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">🎯 Motivo:</span>
                  <span className="info-value">{selectedCliente.motivo || 'Não informado'}</span>
                </div>
              </div>

              <div className="historico-section">
                <h3>📈 Histórico de Serviços</h3>
                
                {loadingHistorico ? (
                  <div className="loading-historico">
                    <p>Carregando histórico...</p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recontatos;
