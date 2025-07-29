import React, { useState, useEffect } from 'react';
import './Servicos.css';

const Servicos = () => {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/servicos');
      
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  };

  const getTotalReceita = () => {
    return servicos.reduce((total, servico) => total + (servico.valor || 0), 0);
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
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{servicos.length}</span>
          <span className="stat-label">Total de Serviços</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{formatCurrency(getTotalReceita())}</span>
          <span className="stat-label">Receita Total</span>
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
                  <span className="info-value">{servico.descricao || 'Sem descrição'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📊 Status:</span>
                  <span className={`status-badge ${servico.status || 'pendente'}`}>
                    {servico.status || 'Pendente'}
                  </span>
                </div>
                {servico.criado_em && (
                  <div className="info-row">
                    <span className="info-label">📅 Cadastrado em:</span>
                    <span className="info-value">{formatDate(servico.criado_em)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchServicos} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
      </button>
    </div>
  );
};

export default Servicos;
