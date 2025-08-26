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
      console.log('🔄 Iniciando fetch de dados...');
      
      // Buscar serviços
      console.log('📞 Chamando API de serviços...');
      const servicosResponse = await authenticatedFetch(getApiUrl('servicos'));
      console.log('📊 Resposta da API de serviços:', {
        status: servicosResponse.status,
        ok: servicosResponse.ok,
        headers: Object.fromEntries(servicosResponse.headers.entries())
      });
      
      if (servicosResponse.ok) {
        const servicosData = await servicosResponse.json();
        console.log('✅ Dados de serviços recebidos:', servicosData);
        console.log('🔍 Tipo dos dados de serviços:', typeof servicosData, Array.isArray(servicosData));
        
        // A API pode retornar { data: [...] } ou um array direto
        const servicosArray = servicosData.data || servicosData;
        console.log('📋 Array de serviços:', servicosArray);
        
        // Garantir que sempre seja um array
        setServicos(Array.isArray(servicosArray) ? servicosArray : []);
      } else {
        const errorText = await servicosResponse.text();
        console.error('❌ Erro ao buscar serviços:', servicosResponse.status, errorText);
        setServicos([]);
      }

      // Buscar recontatos
      console.log('📞 Chamando API de recontatos...');
      const recontatosResponse = await authenticatedFetch(getApiUrl('recontatos'));
      console.log('📊 Resposta da API de recontatos:', {
        status: recontatosResponse.status,
        ok: recontatosResponse.ok,
        headers: Object.fromEntries(recontatosResponse.headers.entries())
      });
      
      if (recontatosResponse.ok) {
        const recontatosData = await recontatosResponse.json();
        console.log('✅ Dados de recontatos recebidos:', recontatosData);
        console.log('🔍 Tipo dos dados de recontatos:', typeof recontatosData, Array.isArray(recontatosData));
        
        // A API pode retornar { data: [...] } ou um array direto
        const recontatosArray = recontatosData.data || recontatosData;
        console.log('📋 Array de recontatos:', recontatosArray);
        
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
      console.log('🏁 Fetch de dados finalizado');
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
    console.log('Buscando eventos para data:', dateStr);
    
    // Garantir que servicos e recontatos são arrays antes de usar filter
    const servicosArray = Array.isArray(servicos) ? servicos : [];
    const recontatosArray = Array.isArray(recontatos) ? recontatos : [];
    
    console.log('Total de serviços:', servicosArray.length);
    console.log('Total de recontatos:', recontatosArray.length);
    
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
      <div className="calendario-header">
        <h1>📅 Calendário</h1>
        <p>Visualize seus serviços e recontatos de forma organizada</p>
      </div>

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
                        </div>
                        <div className="event-title">{servico.notas || 'Serviço Agendado'}</div>
                        <div className="event-client">👤 {servico.cliente_nome}</div>
                        {servico.funcionario_responsavel && (
                          <div className="event-obs">👨‍� {servico.funcionario_responsavel}</div>
                        )}
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
    </div>
  );
};

export default Calendario;
