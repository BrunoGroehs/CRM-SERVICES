import React, { useState, useEffect, useCallback } from 'react';
import './Recontatos.css';
import { getApiUrl } from '../utils/api';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

const Recontatos = () => {
  const [recontatos, setRecontatos] = useState([]);
  const [filteredRecontatos, setFilteredRecontatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showServicoModal, setShowServicoModal] = useState(false);
  const [showProrrogarModal, setShowProrrogarModal] = useState(false);
  const [showProximoRecontatoModal, setShowProximoRecontatoModal] = useState(false);
  const [recontatoParaProrrogar, setRecontatoParaProrrogar] = useState(null);
  const [servicoCriado, setServicoCriado] = useState(null);
  const authenticatedFetch = useAuthenticatedFetch();
  const [proximoRecontatoData, setProximoRecontatoData] = useState({
    periodo: '',
    data_personalizada: '',
    observacoes: ''
  });
  const [prorrogacaoTempo, setProrrogacaoTempo] = useState({ tipo: 'dias', quantidade: 7 });
  const [clientes, setClientes] = useState([]);
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
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [servicosHistorico, setServicosHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Função para determinar o status do recontato
  const getStatusInfo = (recontato) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataAgendada = new Date(recontato.data_agendada);
    dataAgendada.setHours(0, 0, 0, 0);
    
    // Removido o status "realizado" - não existe mais
    
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
    
    // Se não está atrasado, não é hoje, nem próximos 7 dias = longe demais
    return { status: 'longe', label: 'Longe demais para se preocupar', class: 'longe' };
  };

  // Função para aplicar filtros
  const applyFilter = useCallback(() => {
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
      case 'longe':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'longe');
        break;
      default:
        filtered = recontatos;
    }
    
    setFilteredRecontatos(filtered);
  }, [recontatos, activeFilter]);

  useEffect(() => {
    fetchRecontatos();
    fetchClientes();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const fetchRecontatos = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(getApiUrl('recontatos'));
      
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
      const response = await authenticatedFetch(getApiUrl(`servicos/cliente/${clienteId}`));
      
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

  // Funções do modal de serviço
  const handleCriarServico = (recontato) => {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    
    setFormData({
      cliente_id: recontato.cliente_id,
      data: dataFormatada,
      hora: '09:00',
      valor: '',
      notas: `Recontato realizado - ${recontato.observacoes || ''}`,
      status: 'agendado',
      funcionario_responsavel: ''
    });
    setFormErrors({});
    
    // Buscar histórico do cliente automaticamente
    if (recontato.cliente_id) {
      fetchServicosHistorico(recontato.cliente_id);
    }
    
    setShowServicoModal(true);
  };

  const handleCloseServicoModal = () => {
    setShowServicoModal(false);
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
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Se o cliente foi alterado, buscar histórico de serviços
    if (name === 'cliente_id' && value) {
      fetchServicosHistorico(value);
    } else if (name === 'cliente_id' && !value) {
      setServicosHistorico([]);
    }
    
    // Limpar erro do campo quando o usuário começar a digitar
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

  const handleSubmitServico = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const response = await authenticatedFetch(getApiUrl('servicos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar serviço');
      }

      const servicoResult = await response.json();
      
      // Armazenar informações do serviço criado e do cliente
      const clienteInfo = clientes.find(c => c.id === formData.cliente_id);
      setServicoCriado({
        ...servicoResult,
        cliente_nome: clienteInfo?.nome || 'Cliente',
        cliente_id: formData.cliente_id
      });

      alert('Serviço criado com sucesso!');
      handleCloseServicoModal();
      
      // Abrir modal para próximo recontato
      setShowProximoRecontatoModal(true);
      
    } catch (err) {
      console.error('Erro ao criar serviço:', err);
      setFormErrors({ submit: err.message });
    }
  };

  // Função auxiliar para formatar datas corretamente
  const formatDateSafe = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      // Se for uma string de data ISO, converter
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

  // Funções para prorrogação
  const handleProrrogar = (recontato) => {
    console.log('Recontato selecionado para prorrogação:', recontato);
    console.log('Data do recontato:', recontato.data_agendada);
    
    setRecontatoParaProrrogar(recontato);
    setProrrogacaoTempo({ tipo: 'dias', quantidade: 7 });
    setShowProrrogarModal(true);
  };

  const handleCloseProrrogarModal = () => {
    setShowProrrogarModal(false);
    setRecontatoParaProrrogar(null);
    setProrrogacaoTempo({ tipo: 'dias', quantidade: 7 });
  };

  const handleProrrogacaoChange = (campo, valor) => {
    setProrrogacaoTempo(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const calcularNovaData = () => {
    if (!recontatoParaProrrogar) return null;
    
    try {
      // Criar data a partir da string ISO
      const dataAtual = new Date(recontatoParaProrrogar.data_agendada);
      
      // Verificar se a data é válida
      if (isNaN(dataAtual.getTime())) {
        console.error('Data inválida:', recontatoParaProrrogar.data_agendada);
        return null;
      }
      
      const novaData = new Date(dataAtual);
      const quantidade = parseInt(prorrogacaoTempo.quantidade);
      
      if (isNaN(quantidade) || quantidade <= 0) {
        return null;
      }
      
      switch (prorrogacaoTempo.tipo) {
        case 'dias':
          novaData.setDate(novaData.getDate() + quantidade);
          break;
        case 'semanas':
          novaData.setDate(novaData.getDate() + (quantidade * 7));
          break;
        case 'meses':
          novaData.setMonth(novaData.getMonth() + quantidade);
          break;
        default:
          return null;
      }
      
      return novaData;
    } catch (error) {
      console.error('Erro ao calcular nova data:', error);
      return null;
    }
  };

  const confirmarProrrogacao = async () => {
    if (!recontatoParaProrrogar) return;
    
    try {
      const novaData = calcularNovaData();
      
      if (!novaData) {
        alert('Erro ao calcular a nova data. Verifique os valores inseridos.');
        return;
      }
      
      const dataFormatada = novaData.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log('Enviando prorrogação:', {
        id: recontatoParaProrrogar.id,
        data_antiga: recontatoParaProrrogar.data_agendada,
        data_nova: dataFormatada
      });
      
      const response = await authenticatedFetch(getApiUrl(`recontatos/${recontatoParaProrrogar.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_agendada: dataFormatada,
          status: 'agendado' // Resetar status para agendado (status válido)
        }),
      });

      if (!response.ok) {
        // Tentar obter detalhes do erro
        let errorMessage = 'Erro ao prorrogar recontato';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Erro ao parsear resposta de erro:', parseError);
        }
        throw new Error(errorMessage);
      }

      alert(`Recontato prorrogado para ${formatDateSafe(novaData.toISOString())} com sucesso!`);
      handleCloseProrrogarModal();
      await fetchRecontatos(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao prorrogar recontato:', err);
      alert(`Erro ao prorrogar recontato: ${err.message}`);
    }
  };

  // Funções para próximo recontato
  const getProximoRecontatoOptions = () => {
    const hoje = new Date();
    const options = [];
    
    // 6 meses
    const seisMeses = new Date(hoje);
    seisMeses.setMonth(hoje.getMonth() + 6);
    options.push({
      label: '6 Meses',
      value: '6_meses',
      data: seisMeses.toISOString().split('T')[0],
      description: seisMeses.toLocaleDateString('pt-BR')
    });
    
    // 1 ano
    const umAno = new Date(hoje);
    umAno.setFullYear(hoje.getFullYear() + 1);
    options.push({
      label: '1 Ano',
      value: '1_ano',
      data: umAno.toISOString().split('T')[0],
      description: umAno.toLocaleDateString('pt-BR')
    });
    
    // 1 ano e meio
    const umAnoEMeio = new Date(hoje);
    umAnoEMeio.setMonth(hoje.getMonth() + 18);
    options.push({
      label: '1 Ano e Meio',
      value: '1_ano_meio',
      data: umAnoEMeio.toISOString().split('T')[0],
      description: umAnoEMeio.toLocaleDateString('pt-BR')
    });
    
    return options;
  };

  const handleProximoRecontatoOptionClick = (option) => {
    setProximoRecontatoData(prev => ({
      ...prev,
      periodo: option.value,
      data_personalizada: option.data
    }));
  };

  const handleProximoRecontatoInputChange = (e) => {
    const { name, value } = e.target;
    setProximoRecontatoData(prev => ({
      ...prev,
      [name]: value,
      // Se escolher data personalizada, limpar período pré-definido
      ...(name === 'data_personalizada' ? { periodo: 'personalizada' } : {})
    }));
  };

  const handleSubmitProximoRecontato = async (e) => {
    e.preventDefault();

    if (!servicoCriado) {
      alert('Erro: informações do serviço não encontradas');
      return;
    }

    try {
      const dataRecontato = proximoRecontatoData.data_personalizada;
      
      if (!dataRecontato) {
        alert('Por favor, selecione uma data para o próximo recontato');
        return;
      }

      // Encontrar o recontato atual do cliente para atualizar
      const recontatoAtual = recontatos.find(r => r.cliente_id === servicoCriado.cliente_id);
      
      if (!recontatoAtual) {
        alert('Erro: recontato atual não encontrado para este cliente');
        return;
      }

      const response = await authenticatedFetch(getApiUrl(`recontatos/${recontatoAtual.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_agendada: dataRecontato,
          observacoes: proximoRecontatoData.observacoes || `Recontato pós-serviço - Acompanhamento do serviço realizado`,
          status: 'agendado'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      alert('Recontato reagendado com sucesso!');
      handleCloseProximoRecontatoModal();
      await fetchRecontatos(); // Recarregar lista
      
    } catch (err) {
      console.error('Erro ao reagendar recontato:', err);
      alert('Erro ao reagendar recontato: ' + err.message);
    }
  };

  const handleCloseProximoRecontatoModal = () => {
    setShowProximoRecontatoModal(false);
    setServicoCriado(null);
    setProximoRecontatoData({
      periodo: '',
      data_personalizada: '',
      observacoes: ''
    });
  };

  const handleSkipProximoRecontato = () => {
    alert('Serviço criado com sucesso! Recontato não foi reagendado.');
    handleCloseProximoRecontatoModal();
  };

  const handleDeleteRecontato = async (recontato) => {
    if (!window.confirm(`Tem certeza que deseja deletar o recontato de ${recontato.cliente_nome}?`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(getApiUrl(`recontatos/${recontato.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      alert('Recontato deletado com sucesso!');
      handleCloseModal(); // Fechar modal de detalhes
      await fetchRecontatos(); // Recarregar lista
      
    } catch (err) {
      console.error('Erro ao deletar recontato:', err);
      alert('Erro ao deletar recontato: ' + err.message);
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

  const getStats = () => {
    const stats = {
      total: recontatos.length,
      atrasados: 0,
      hoje: 0,
      proximos: 0,
      longe: 0
    };

    recontatos.forEach(recontato => {
      const statusInfo = getStatusInfo(recontato);
      switch (statusInfo.status) {
        case 'atrasado':
          stats.atrasados++;
          break;
        case 'hoje':
          stats.hoje++;
          break;
        case 'proximos':
          stats.proximos++;
          break;
        case 'longe':
          stats.longe++;
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
          className={`stat-item ${activeFilter === 'longe' ? 'active' : ''}`}
          onClick={() => setActiveFilter('longe')}
        >
          <span className="stat-value stat-secondary">{stats.longe}</span>
          <span className="stat-label">Longe demais</span>
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
                  </div>
                </div>
                <div className="card-content">
                  <div className="info-row">
                    <span className="info-label">📱 Telefone:</span>
                    <span className="info-value" title={recontato.cliente_telefone}>{recontato.cliente_telefone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📞 Recontato:</span>
                    <span className="info-value" title={formatDate(recontato.data_agendada)}>{formatDate(recontato.data_agendada)}</span>
                  </div>
                  {recontato.hora_agendada && (
                    <div className="info-row">
                      <span className="info-label">⏰ Hora:</span>
                      <span className="info-value" title={formatTime(recontato.hora_agendada)}>{formatTime(recontato.hora_agendada)}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">🎯 Motivo:</span>
                    <span className="info-value" title={recontato.motivo || 'Não informado'}>{recontato.motivo || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📝 Nota:</span>
                    <span className="info-value" title={recontato.observacoes || 'Sem nota'}>{recontato.observacoes || 'Sem nota'}</span>
                  </div>
                  {recontato.criado_em && (
                    <div className="info-row">
                      <span className="info-label">📅 Cadastrado em:</span>
                      <span className="info-value" title={formatDate(recontato.criado_em)}>{formatDate(recontato.criado_em)}</span>
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
                  
                  <button 
                    className="action-btn marcar-btn"
                    onClick={() => handleCriarServico(recontato)}
                    title="Criar novo serviço para este cliente"
                  >
                    📅 Agendar Serviço
                  </button>
                  
                  <button 
                    className="action-btn prorrogar-btn"
                    onClick={() => handleProrrogar(recontato)}
                    title="Prorrogar recontato"
                  >
                    ⏳ Prorrogar
                  </button>
                  
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

      {/* Modal de Prorrogação */}
      {showProrrogarModal && recontatoParaProrrogar && (
        <div className="modal-overlay" onClick={handleCloseProrrogarModal}>
          <div className="modal-content prorrogar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⏳ Prorrogar Recontato</h2>
              <button className="close-btn" onClick={handleCloseProrrogarModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="prorrogar-info">
                <h3>Cliente: {recontatoParaProrrogar.cliente_nome}</h3>
                <p>Data atual: {formatDateSafe(recontatoParaProrrogar.data_agendada)}</p>
              </div>
              
              <div className="prorrogar-form">
                <h4>Por quanto tempo deseja prorrogar?</h4>
                
                <div className="prorrogar-options">
                  <div className="quick-options">
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'dias' && prorrogacaoTempo.quantidade === 1 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'dias', quantidade: 1 })}
                    >
                      1 Dia
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'dias' && prorrogacaoTempo.quantidade === 3 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'dias', quantidade: 3 })}
                    >
                      3 Dias
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'dias' && prorrogacaoTempo.quantidade === 7 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'dias', quantidade: 7 })}
                    >
                      1 Semana
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'semanas' && prorrogacaoTempo.quantidade === 2 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'semanas', quantidade: 2 })}
                    >
                      2 Semanas
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'meses' && prorrogacaoTempo.quantidade === 1 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'meses', quantidade: 1 })}
                    >
                      1 Mês
                    </button>
                  </div>
                  
                  <div className="custom-option">
                    <h5>Ou defina um período personalizado:</h5>
                    <div className="custom-inputs">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={prorrogacaoTempo.quantidade}
                        onChange={(e) => handleProrrogacaoChange('quantidade', e.target.value)}
                        className="quantidade-input"
                      />
                      <select
                        value={prorrogacaoTempo.tipo}
                        onChange={(e) => handleProrrogacaoChange('tipo', e.target.value)}
                        className="tipo-select"
                      >
                        <option value="dias">Dias</option>
                        <option value="semanas">Semanas</option>
                        <option value="meses">Meses</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {calcularNovaData() && (
                  <div className="nova-data-preview">
                    <strong>Nova data do recontato: {formatDateSafe(calcularNovaData().toISOString())}</strong>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button className="cancel-btn" onClick={handleCloseProrrogarModal}>
                  Cancelar
                </button>
                <button className="confirm-btn" onClick={confirmarProrrogacao}>
                  ⏳ Confirmar Prorrogação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Serviço */}
      {showServicoModal && (
        <div className="modal-overlay" onClick={handleCloseServicoModal}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 Novo Serviço</h2>
              <button className="close-btn" onClick={handleCloseServicoModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-wide">
              <div className="modal-form-section">
                <form onSubmit={handleSubmitServico} className="modal-form">
              <div className="form-row">
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
              </div>

              <div className="form-row-horizontal">
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

              <div className="form-row-horizontal">
                <div className="form-group">
                  <label htmlFor="valor">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
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

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="notas">Observações</label>
                  <textarea
                    id="notas"
                    name="notas"
                    value={formData.notas}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Descreva o serviço a ser realizado..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="funcionario_responsavel">Funcionário Responsável</label>
                  <input
                    type="text"
                    id="funcionario_responsavel"
                    name="funcionario_responsavel"
                    value={formData.funcionario_responsavel}
                    onChange={handleInputChange}
                    placeholder="Nome do funcionário responsável"
                  />
                </div>
              </div>

              {formErrors.submit && (
                <div className="form-error">
                  {formErrors.submit}
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={handleCloseServicoModal} className="cancel-btn">
                  Cancelar
                </button>
                <button type="submit" className="submit-btn">
                  📅 Criar Serviço
                </button>
              </div>
            </form>
              </div>
              
              <div className="modal-historico-section">
                {/* Seção do Histórico do Cliente */}
                {formData.cliente_id && (
                  <div className="modal-historico">
                    <h3>📋 Histórico de Serviços</h3>
                    {servicosHistorico.length > 0 ? (
                      <div className="historico-modal-lista">
                        {servicosHistorico.map((servico) => (
                          <div key={servico.id} className="historico-modal-item">
                            <div className="historico-modal-header">
                              <span className="servico-data-modal">
                                📅 {formatDate(servico.data)} - {servico.hora}
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
                  <span className="info-value" title={selectedCliente.cliente_nome}>{selectedCliente.cliente_nome}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📱 Telefone:</span>
                  <span className="info-value" title={selectedCliente.cliente_telefone}>{selectedCliente.cliente_telefone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📞 Recontato:</span>
                  <span className="info-value" title={formatDate(selectedCliente.data_agendada)}>{formatDate(selectedCliente.data_agendada)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">🎯 Motivo:</span>
                  <span className="info-value" title={selectedCliente.motivo || 'Não informado'}>{selectedCliente.motivo || 'Não informado'}</span>
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
                              <span className="servico-label">📝 Nota:</span>
                              <span>{servico.notas}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Ações do Recontato */}
              <div className="recontato-actions">
                <button 
                  className="delete-recontato-btn"
                  onClick={() => handleDeleteRecontato(selectedCliente)}
                  title="Deletar este recontato permanentemente"
                >
                  🗑️ Deletar Recontato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Próximo Recontato */}
      {showProximoRecontatoModal && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && handleCloseProximoRecontatoModal()}>
          <div className="beautiful-modal">
            <div className="modal-header">
              <h3>🎯 Reagendar Recontato</h3>
              <button className="close-btn" onClick={handleCloseProximoRecontatoModal}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="success-message">
                <p>✅ Serviço criado com sucesso!</p>
                <p>Agora vamos reagendar o recontato deste cliente para dar continuidade ao relacionamento.</p>
              </div>

              <form onSubmit={handleSubmitProximoRecontato}>
                <div className="form-group">
                  <label>📅 Quando fazer o próximo recontato?</label>
                  <div className="quick-options">
                    {getProximoRecontatoOptions().map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`quick-option ${proximoRecontatoData.periodo === option.value ? 'active' : ''}`}
                        onClick={() => handleProximoRecontatoOptionClick(option)}
                      >
                        <span className="option-label">{option.label}</span>
                        <span className="option-date">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="data_personalizada">Ou escolha uma data personalizada:</label>
                  <input
                    type="date"
                    id="data_personalizada"
                    name="data_personalizada"
                    value={proximoRecontatoData.data_personalizada}
                    onChange={handleProximoRecontatoInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="observacoes_proximo">Observações (opcional):</label>
                  <textarea
                    id="observacoes_proximo"
                    name="observacoes"
                    value={proximoRecontatoData.observacoes}
                    onChange={handleProximoRecontatoInputChange}
                    placeholder="Ex: Verificar satisfação com o serviço, apresentar novos produtos..."
                    rows="3"
                    className="form-input"
                  />
                </div>

                <div className="button-group">
                  <button type="button" className="btn-secondary" onClick={handleSkipProximoRecontato}>
                    Pular Reagendamento
                  </button>
                  <button type="submit" className="btn-primary">
                    Reagendar Recontato
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Recontatos;
