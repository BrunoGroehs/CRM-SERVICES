import React, { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import './Calendario.css';

const Calendario = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [recontatos, setRecontatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ servicos: [], recontatos: [] });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [submittingComplete, setSubmittingComplete] = useState(null);
  const authenticatedFetch = useAuthenticatedFetch();

  const getApiUrl = (endpoint) => {
    return `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/${endpoint}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar serviços
      const servicosResponse = await authenticatedFetch(getApiUrl('servicos'));
      
      if (servicosResponse.ok) {
        const servicosData = await servicosResponse.json();
        
        // A API pode retornar { data: [...] } ou um array direto
        const servicosArray = servicosData.data || servicosData;
        
        // Garantir que sempre seja um array
        setServicos(Array.isArray(servicosArray) ? servicosArray : []);
      } else {
        const errorText = await servicosResponse.text();
        console.error('❌ Erro ao buscar serviços:', servicosResponse.status, errorText);
        setServicos([]);
      }

      // Buscar recontatos
      const recontatosResponse = await authenticatedFetch(getApiUrl('recontatos'));
      
      if (recontatosResponse.ok) {
        const recontatosData = await recontatosResponse.json();
        
        // A API pode retornar { data: [...] } ou um array direto
        const recontatosArray = recontatosData.data || recontatosData;
        
        // Garantir que sempre seja um array
        setRecontatos(Array.isArray(recontatosArray) ? recontatosArray : []);
      } else {
        const errorText = await recontatosResponse.text();
        console.error('❌ Erro ao buscar recontatos:', recontatosResponse.status, errorText);
        setRecontatos([]);
      }

    } catch (error) {
      console.error('💥 Erro ao carregar dados:', error);
      setServicos([]);
      setRecontatos([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date) => {
    const dateStr = formatDate(date);
    
    // Garantir que servicos e recontatos são arrays antes de usar filter
    const servicosArray = Array.isArray(servicos) ? servicos : [];
    const recontatosArray = Array.isArray(recontatos) ? recontatos : [];
    
    const servicosNaData = servicosArray.filter(servico => {
      if (!servico || !servico.data) return false;
      
      // Tentar diferentes formatos de data
      let servicoDate;
      try {
        servicoDate = new Date(servico.data).toISOString().split('T')[0];
      } catch (error) {
        console.warn('Erro ao processar data do serviço:', servico.data);
        return false;
      }
      
      const match = servicoDate === dateStr;
      if (match) {
        console.log('Serviço encontrado para', dateStr, ':', servico);
      }
      return match;
    });

    const recontatosNaData = recontatosArray.filter(recontato => {
      if (!recontato || !recontato.data_agendada) return false;
      
      // Tentar diferentes formatos de data
      let recontatoDate;
      try {
        recontatoDate = new Date(recontato.data_agendada).toISOString().split('T')[0];
      } catch (error) {
        console.warn('Erro ao processar data do recontato:', recontato.data_agendada);
        return false;
      }
      
      const match = recontatoDate === dateStr;
      if (match) {
        console.log('Recontato encontrado para', dateStr, ':', recontato);
      }
      return match;
    });

    console.log(`Eventos encontrados para ${dateStr}:`, {
      servicos: servicosNaData.length,
      recontatos: recontatosNaData.length
    });

    return { servicos: servicosNaData, recontatos: recontatosNaData };
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const events = getEventsForDate(date);
    setModalData(events);
    // Sempre abrir o modal, mesmo sem eventos
    setShowModal(true);
  };

  // Função para abrir modal de edição de serviço
  const handleEditService = (servico) => {
    // Garantir que a data esteja no formato correto para o input[type="date"]
    let dataFormatada = servico.data;
    if (dataFormatada) {
      // Se a data contém horário (formato ISO), extrair apenas a parte da data
      if (dataFormatada.includes('T')) {
        dataFormatada = dataFormatada.split('T')[0];
      }
      // Se a data está no formato DD/MM/YYYY, converter para YYYY-MM-DD
      if (dataFormatada.includes('/')) {
        const partes = dataFormatada.split('/');
        if (partes.length === 3) {
          dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
      }
    }

    // Garantir que a hora esteja no formato HH:MM para o input[type="time"]
    let horaFormatada = servico.hora;
    if (horaFormatada && horaFormatada.length > 5) {
      horaFormatada = horaFormatada.substring(0, 5);
    }

    setEditingService({
      id: servico.id,
      cliente_id: servico.cliente_id,
      data: dataFormatada || '',
      hora: horaFormatada || '',
      valor: servico.valor || '',
      notas: servico.notas || '',
      status: servico.status || 'agendado',
      funcionario_responsavel: servico.funcionario_responsavel || ''
    });
    setShowEditModal(true);
  };

  // Função para marcar serviço como concluído
  const handleMarkComplete = async (servicoId) => {
    setSubmittingComplete(servicoId);
    
    try {
      console.log('🔄 Marcando serviço como concluído:', servicoId);
      
      const response = await authenticatedFetch(
        getApiUrl(`servicos/${servicoId}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'concluido' })
        }
      );

      console.log('📊 Resposta do servidor:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        // Atualizar o estado local
        setServicos(prevServicos => 
          prevServicos.map(servico => 
            servico.id === servicoId 
              ? { ...servico, status: 'concluido' }
              : servico
          )
        );

        // Atualizar os dados do modal se estiver aberto
        setModalData(prevData => ({
          ...prevData,
          servicos: prevData.servicos.map(servico => 
            servico.id === servicoId 
              ? { ...servico, status: 'concluido' }
              : servico
          )
        }));

        alert('Serviço marcado como concluído!');
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na resposta:', errorData);
        
        if (response.status === 401) {
          alert('Sessão expirada. Faça login novamente.');
        } else if (response.status === 403) {
          alert('Você não tem permissão para realizar esta ação.');
        } else if (response.status === 400 && errorData.errors) {
          console.error('🔍 Erros de validação detalhados:', errorData.errors);
          alert(`Erro de validação: ${errorData.errors.join(', ')}`);
        } else {
          alert(`Erro ao marcar como concluído: ${errorData.message || `Status ${response.status}`}`);
        }
      }
    } catch (error) {
      console.error('Erro ao marcar serviço como concluído:', error);
      
      if (error.message === 'Sessão expirada') {
        alert('Sua sessão expirou. Você será redirecionado para o login.');
      } else {
        alert('Erro ao marcar como concluído. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSubmittingComplete(null);
    }
  };

  // Função para salvar edição do serviço
  const handleSaveEdit = async () => {
    if (!editingService) return;

    try {
      const response = await authenticatedFetch(
        getApiUrl(`servicos/${editingService.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editingService)
        }
      );

      if (response.ok) {
        const updatedService = await response.json();
        
        // Atualizar o estado local
        setServicos(prevServicos => 
          prevServicos.map(servico => 
            servico.id === editingService.id 
              ? { ...servico, ...updatedService.servico || updatedService }
              : servico
          )
        );

        // Atualizar os dados do modal se estiver aberto
        setModalData(prevData => ({
          ...prevData,
          servicos: prevData.servicos.map(servico => 
            servico.id === editingService.id 
              ? { ...servico, ...updatedService.servico || updatedService }
              : servico
          )
        }));

        setShowEditModal(false);
        setEditingService(null);
        alert('Serviço atualizado com sucesso!');
      } else {
        const errorData = await response.json();
        alert(`Erro ao atualizar serviço: ${errorData.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      alert('Erro ao atualizar serviço. Tente novamente.');
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Dias em branco do mês anterior
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const events = getEventsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${events.servicos.length > 0 || events.recontatos.length > 0 ? 'has-events' : ''}`}
          onClick={() => handleDateClick(date)}
        >
          <span className="day-number">{day}</span>
          <div className="events-indicators">
            {events.servicos.length > 0 && (
              <div className="indicator servico" title={`${events.servicos.length} serviço(s)`}>
                <div className="strong-indicator"></div>
              </div>
            )}
            {events.recontatos.length > 0 && (
              <div className="indicator recontato" title={`${events.recontatos.length} recontato(s)`}>
                <div className="dot-indicator"></div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando calendário...</p>
      </div>
    );
  }

  return (
    <div className="calendario-container">
      <div className="calendar-wrapper">
        <div className="calendar-controls">
          <button onClick={() => navigateMonth(-1)} className="nav-btn">
            ← Anterior
          </button>
          <h2 className="month-year">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={() => navigateMonth(1)} className="nav-btn">
            Próximo →
          </button>
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-indicator servico">
              <div className="strong-indicator"></div>
            </div>
            <span>Serviços</span>
          </div>
          <div className="legend-item">
            <div className="legend-indicator recontato">
              <div className="dot-indicator"></div>
            </div>
            <span>Recontatos</span>
          </div>
        </div>

        <div className="calendar-grid">
          <div className="calendar-header-days">
            {dayNames.map(day => (
              <div key={day} className="header-day">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {renderCalendarDays()}
          </div>
        </div>
      </div>

      {/* Modal de Eventos */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 {selectedDate?.toLocaleDateString('pt-BR')}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {modalData.servicos.length > 0 && (
                <div className="events-section">
                  <h3>🔧 Serviços ({modalData.servicos.length})</h3>
                  <div className="events-list">
                    {modalData.servicos.map((servico) => (
                      <div key={servico.id} className="event-card servico-card">
                        <div className="event-header">
                          <span className="event-time">⏰ {formatTime(servico.hora)}</span>
                          <span className="event-value">{formatCurrency(servico.valor)}</span>
                          <span className={`event-status status-${servico.status}`}>
                            {servico.status === 'agendado' && '📅'}
                            {servico.status === 'em_andamento' && '⚡'}
                            {servico.status === 'concluido' && '✅'}
                            {servico.status === 'cancelado' && '❌'}
                            {servico.status || 'agendado'}
                          </span>
                        </div>
                        <div className="event-title">{servico.notas || 'Serviço Agendado'}</div>
                        <div className="event-client">👤 {servico.cliente_nome}</div>
                        {servico.funcionario_responsavel && (
                          <div className="event-obs">👨‍💼 {servico.funcionario_responsavel}</div>
                        )}
                        <div className="event-actions">
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEditService(servico)}
                            title="Editar serviço"
                          >
                            ✏️ Editar
                          </button>
                          {servico.status !== 'concluido' && (
                            <button 
                              className="action-btn complete-btn"
                              onClick={() => handleMarkComplete(servico.id)}
                              disabled={submittingComplete === servico.id}
                              title="Marcar como concluído"
                            >
                              {submittingComplete === servico.id ? '⏳' : '✅'} 
                              {submittingComplete === servico.id ? 'Salvando...' : 'Concluir'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalData.recontatos.length > 0 && (
                <div className="events-section">
                  <h3>📞 Recontatos ({modalData.recontatos.length})</h3>
                  <div className="events-list">
                    {modalData.recontatos.map((recontato) => (
                      <div key={recontato.id} className="event-card recontato-card">
                        <div className="event-header">
                          <span className="event-status">{recontato.status}</span>
                        </div>
                        <div className="event-title">{recontato.motivo || 'Recontato Agendado'}</div>
                        <div className="event-client">👤 {recontato.cliente_nome}</div>
                        {recontato.observacoes && (
                          <div className="event-obs">📝 {recontato.observacoes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalData.servicos.length === 0 && modalData.recontatos.length === 0 && (
                <div className="no-events">
                  <div className="no-events-icon">📅</div>
                  <h3>Nenhum evento agendado</h3>
                  <p>Não há serviços ou recontatos marcados para esta data.</p>
                  <div className="suggestions">
                    <p>💡 <strong>Dica:</strong> Você pode agendar novos eventos nas páginas:</p>
                    <div className="suggestion-links">
                      <span>🔧 Serviços</span>
                      <span>📞 Recontatos</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Serviço */}
      {showEditModal && editingService && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar Serviço</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowEditModal(false)}
                title="Fechar"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-data">📅 Data do Serviço:</label>
                    <input
                      type="date"
                      id="edit-data"
                      value={editingService.data}
                      onChange={(e) => setEditingService(prev => ({ ...prev, data: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-hora">⏰ Horário:</label>
                    <input
                      type="time"
                      id="edit-hora"
                      value={editingService.hora}
                      onChange={(e) => setEditingService(prev => ({ ...prev, hora: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-valor">💰 Valor do Serviço:</label>
                    <input
                      type="number"
                      id="edit-valor"
                      step="0.01"
                      min="0"
                      value={editingService.valor}
                      onChange={(e) => setEditingService(prev => ({ ...prev, valor: e.target.value }))}
                      placeholder="Ex: 150.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-status">📊 Status do Serviço:</label>
                    <select
                      id="edit-status"
                      value={editingService.status}
                      onChange={(e) => setEditingService(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="agendado">📅 Agendado</option>
                      <option value="em_andamento">⚡ Em Andamento</option>
                      <option value="concluido">✅ Concluído</option>
                      <option value="cancelado">❌ Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-funcionario">👨‍💼 Funcionário Responsável:</label>
                  <input
                    type="text"
                    id="edit-funcionario"
                    value={editingService.funcionario_responsavel}
                    onChange={(e) => setEditingService(prev => ({ ...prev, funcionario_responsavel: e.target.value }))}
                    placeholder="Nome do profissional responsável pelo serviço"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-notas">📝 Observações e Detalhes:</label>
                  <textarea
                    id="edit-notas"
                    value={editingService.notas}
                    onChange={(e) => setEditingService(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Descreva o serviço, materiais necessários, observações especiais..."
                    rows="4"
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    ❌ Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    💾 Salvar Alterações
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

export default Calendario;
