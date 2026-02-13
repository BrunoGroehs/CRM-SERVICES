import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';

/* Toast types: success | error | warning | info | neutral | action */
const ToastContext = createContext(null);

let toastIdCounter = 0;

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  neutral: '🔔',
  action: '⚡'
};

export function ToastProvider({ children, defaultDuration = 4000, maxToasts = 5 }) {
  const [toasts, setToasts] = useState([]);
  const queueRef = useRef([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message, { type='success', duration, icon, action, onAction, dismissible=true } = {}) => {
    const id = ++toastIdCounter;
    const toast = { id, message, type, icon: icon || ICONS[type] || ICONS.info, duration: duration ?? defaultDuration, createdAt: Date.now(), action, onAction, dismissible };

    setToasts(prev => {
      if (prev.length >= maxToasts) {
        queueRef.current.push(toast);
        return prev;
      }
      return [...prev, toast];
    });
    return id;
  }, [defaultDuration, maxToasts]);

  /* Auto-dismiss */
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(t => {
      if (t.duration === 0) return null; // persistent
      return setTimeout(() => remove(t.id), t.duration);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [toasts, remove]);

  /* Drain queue when space frees */
  useEffect(() => {
    if (queueRef.current.length && toasts.length < maxToasts) {
      const next = queueRef.current.shift();
      setToasts(prev => [...prev, next]);
    }
  }, [toasts, maxToasts]);

  const contextValue = { add, remove };
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}> 
            <div className="toast-icon" aria-hidden="true">{t.icon}</div>
            <div className="toast-message">{t.message}</div>
            {t.action && (
              <button className="toast-action" onClick={() => { t.onAction?.(); remove(t.id); }}>{t.action}</button>
            )}
            {t.dismissible && (
              <button className="toast-close" aria-label="Fechar notificação" onClick={() => remove(t.id)}>×</button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
