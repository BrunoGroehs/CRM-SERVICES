import React, { useState, useEffect } from 'react';
import './Recontatos.css';

const Recontatos = () => {
  const [recontatos, setRecontatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecontatos();
  }, []);

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
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
    
    return { status: 'agendado', label: 'Agendado', class: 'agendado' };
  };

  const getStats = () => {
    const stats = {
      total: recontatos.length,
      realizados: 0,
      atrasados: 0,
      hoje: 0,
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
        case 'agendado':
          stats.agendados++;
          break;
        default:
          break;
      }
    });

    return stats;
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
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-success">{stats.realizados}</span>
          <span className="stat-label">Realizados</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-danger">{stats.atrasados}</span>
          <span className="stat-label">Atrasados</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-warning">{stats.hoje}</span>
          <span className="stat-label">Hoje</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-info">{stats.agendados}</span>
          <span className="stat-label">Agendados</span>
        </div>
      </div>

      {recontatos.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum recontato encontrado</h3>
          <p>Não há recontatos cadastrados no sistema.</p>
        </div>
      ) : (
        <div className="data-grid">
          {recontatos.map((recontato) => {
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
              </div>
            );
          })}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchRecontatos} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
      </button>
    </div>
  );
};

export default Recontatos;
