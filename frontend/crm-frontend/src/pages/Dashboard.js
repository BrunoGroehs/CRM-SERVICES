import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Resposta indica falha no servidor');
      }

      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
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
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading && !metrics) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <h3>Carregando métricas...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">
          <h3>Erro ao carregar dados</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Dashboard CRM</h1>
        <p>Visão geral das métricas e estatísticas do sistema</p>
      </div>

      <div className="metrics-grid">
        {/* Card Clientes */}
        <div className="metric-card clientes">
          <h3>👥 Clientes</h3>
          <div className="metric-value">{metrics?.metricas?.clientes?.total || 0}</div>
          <div className="metric-description">
            {metrics?.metricas?.clientes?.descricao || 'Número total de clientes cadastrados'}
          </div>
        </div>

        {/* Card Serviços */}
        <div className="metric-card servicos">
          <h3>🔧 Serviços</h3>
          <div className="metric-value">{metrics?.metricas?.servicos?.realizados || 0}</div>
          <div className="metric-description">
            {metrics?.metricas?.servicos?.descricao || 'Serviços realizados e receita total'}
          </div>
          <div className="sub-metrics">
            <div className="sub-metric">
              <span className="sub-metric-label">Hoje:</span>
              <span className="sub-metric-value">{metrics?.metricas?.servicos?.hoje || 0}</span>
            </div>
            <div className="sub-metric">
              <span className="sub-metric-label">Receita Total:</span>
              <span className="sub-metric-value">
                {formatCurrency(metrics?.metricas?.servicos?.receita_total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Card Recontatos */}
        <div className="metric-card recontatos">
          <h3>📞 Recontatos</h3>
          <div className="metric-value">{metrics?.metricas?.recontatos?.total || 0}</div>
          <div className="metric-description">
            {metrics?.metricas?.recontatos?.descricao || 'Status dos recontatos no sistema'}
          </div>
          <div className="sub-metrics">
            <div className="sub-metric">
              <span className="sub-metric-label">
                <span className="status-indicator status-success"></span>Realizados:
              </span>
              <span className="sub-metric-value">{metrics?.metricas?.recontatos?.realizados || 0}</span>
            </div>
            <div className="sub-metric">
              <span className="sub-metric-label">
                <span className="status-indicator status-danger"></span>Atrasados:
              </span>
              <span className="sub-metric-value">{metrics?.metricas?.recontatos?.atrasados || 0}</span>
            </div>
            <div className="sub-metric">
              <span className="sub-metric-label">
                <span className="status-indicator status-warning"></span>Próximos:
              </span>
              <span className="sub-metric-value">{metrics?.metricas?.recontatos?.proximos || 0}</span>
            </div>
            <div className="sub-metric">
              <span className="sub-metric-label">Taxa de Conversão:</span>
              <span className="sub-metric-value">{metrics?.metricas?.recontatos?.taxa_conversao || '0%'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="summary">
        <h2>📈 Resumo Executivo</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="value">{metrics?.resumo?.total_clientes || 0}</div>
            <div className="label">Total de Clientes</div>
          </div>
          <div className="summary-item">
            <div className="value">{metrics?.resumo?.servicos_realizados || 0}</div>
            <div className="label">Serviços Realizados</div>
          </div>
          <div className="summary-item">
            <div className="value">{formatCurrency(metrics?.resumo?.receita_total || 0)}</div>
            <div className="label">Receita Total</div>
          </div>
          <div className="summary-item">
            <div className="value">{metrics?.resumo?.recontatos_urgentes || 0}</div>
            <div className="label">Recontatos Urgentes</div>
          </div>
        </div>
      </div>

      <div className="timestamp">
        Última atualização: {metrics?.timestamp ? formatDate(metrics.timestamp) : '-'}
      </div>

      <button className="refresh-btn" onClick={fetchDashboardData} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar'}
      </button>
    </div>
  );
};

export default Dashboard;
