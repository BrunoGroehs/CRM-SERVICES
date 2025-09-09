import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useToast } from './ToastContext';

// Connection status: online -> everything OK
// waking -> backend likely asleep (Render free), attempting to wake/poll
// offline -> browser offline (no network)
const ConnectionContext = createContext(null);

export const useConnection = () => {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used within <ConnectionProvider>');
  return ctx;
};

export const ConnectionProvider = ({ children }) => {
  const [status, setStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [lastOkAt, setLastOkAt] = useState(Date.now());
  const [lastErrorAt, setLastErrorAt] = useState(null);
  const wakingRef = useRef(false);
  const backoffIndexRef = useRef(0);
  const pollingTimerRef = useRef(null);
  const keepAliveTimerRef = useRef(null);
  const wakeToastIdRef = useRef(null);
  const { add: pushToast, remove: removeToast } = useToast();

  const backoffMs = useMemo(() => [1500, 3000, 5000, 8000, 12000, 15000, 20000, 30000], []);

  const clearTimer = () => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const clearKeepAlive = () => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
  };

  const showWakeToast = useCallback(() => {
    if (wakeToastIdRef.current) return;
    const id = pushToast(
      'Servidor inativo. Tentando reconectar...',
      {
        type: 'warning',
        duration: 0, // persistent
        action: 'Recarregar agora',
        onAction: () => window.location.reload(),
      }
    );
    wakeToastIdRef.current = id;
  }, [pushToast]);

  const dismissWakeToast = useCallback(() => {
    if (wakeToastIdRef.current) {
      removeToast(wakeToastIdRef.current);
      wakeToastIdRef.current = null;
    }
  }, [removeToast]);

  const pingHealth = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(getApiUrl('health'), {
        method: 'GET',
        // health is public; include credentials to keep session warm just in case
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        setLastOkAt(Date.now());
        return true;
      }
      return false;
    } catch (e) {
      clearTimeout(timeout);
      return false;
    }
  }, []);

  const scheduleNextPing = useCallback(() => {
    clearTimer();
    const delay = backoffMs[Math.min(backoffIndexRef.current, backoffMs.length - 1)];
    pollingTimerRef.current = setTimeout(async () => {
      const ok = await pingHealth();
      if (ok) {
        // Recovered
        setStatus('online');
        wakingRef.current = false;
        backoffIndexRef.current = 0;
        dismissWakeToast();
        // Force a hard refresh to ensure app state and cookies are fresh
        setTimeout(() => {
          try { window.location.reload(); } catch { /* ignore */ }
        }, 500);
        return;
      }
      // keep backing off
      backoffIndexRef.current += 1;
      scheduleNextPing();
    }, delay);
  }, [backoffMs, pingHealth, dismissWakeToast]);

  const startRecovery = useCallback((reason = 'unknown') => {
    if (wakingRef.current) return; // already trying
    wakingRef.current = true;
    setStatus(navigator.onLine ? 'waking' : 'offline');
    setLastErrorAt(Date.now());
    showWakeToast();
    backoffIndexRef.current = 0;
    scheduleNextPing();
  }, [scheduleNextPing, showWakeToast]);

  const cancelRecovery = useCallback(() => {
    wakingRef.current = false;
    clearTimer();
    dismissWakeToast();
  }, [dismissWakeToast]);

  const reportNetworkIssue = useCallback((reason = 'request_failed') => {
    setLastErrorAt(Date.now());
    startRecovery(reason);
  }, [startRecovery]);

  // Listen browser-level online/offline
  useEffect(() => {
    const goOnline = () => {
      setStatus(wakingRef.current ? 'waking' : 'online');
    };
    const goOffline = () => {
      setStatus('offline');
      setLastErrorAt(Date.now());
      showWakeToast();
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [showWakeToast]);

  // Initial sanity ping shortly after mount to establish lastOkAt
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await pingHealth();
      if (!mounted) return;
      if (ok) {
        setStatus('online');
      } else if (navigator.onLine) {
        // server likely asleep
        startRecovery('initial_ping_failed');
      } else {
        setStatus('offline');
      }
    })();
    return () => { mounted = false; clearTimer(); clearKeepAlive(); };
  }, [pingHealth, startRecovery]);

  // Keep-alive pings while online and tab visible to prevent Render sleep
  useEffect(() => {
    const shouldPing = status === 'online' && document.visibilityState === 'visible';
    clearKeepAlive();
    if (shouldPing) {
      keepAliveTimerRef.current = setInterval(async () => {
        const ok = await pingHealth();
        if (ok) setLastOkAt(Date.now());
      }, 4 * 60 * 1000); // every 4 minutes
    }
    const onVis = () => {
      // restart timer on visibility changes
      clearKeepAlive();
      if (status === 'online' && document.visibilityState === 'visible') {
        keepAliveTimerRef.current = setInterval(async () => {
          const ok = await pingHealth();
          if (ok) setLastOkAt(Date.now());
        }, 4 * 60 * 1000);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearKeepAlive();
    };
  }, [status, pingHealth]);

  const value = useMemo(() => ({
    status,
    lastOkAt,
    lastErrorAt,
    startRecovery,
    cancelRecovery,
    reportNetworkIssue,
  }), [status, lastOkAt, lastErrorAt, startRecovery, cancelRecovery, reportNetworkIssue]);

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionContext;
