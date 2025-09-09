import React from 'react';
import { useConnection } from '../contexts/ConnectionContext';

const bannerStyles = {
  base: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    width: '100%',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
  },
  offline: { background: '#fff3cd', color: '#664d03', borderBottom: '1px solid #ffe69c' },
  waking: { background: '#cff4fc', color: '#055160', borderBottom: '1px solid #b6effb' },
  button: {
    background: 'transparent',
    border: '1px solid currentColor',
    color: 'inherit',
    padding: '6px 10px',
    borderRadius: 6,
    cursor: 'pointer',
  }
};

export default function ConnectionBanner() {
  const { status, lastOkAt } = useConnection();
  if (status === 'online') return null;

  const base = bannerStyles.base;
  const tone = status === 'offline' ? bannerStyles.offline : bannerStyles.waking;
  const label = status === 'offline' ? 'Sem conexão. Verifique sua internet.' : 'Servidor acordando... isso pode levar alguns segundos.';
  const since = new Date(lastOkAt).toLocaleTimeString();

  return (
    <div style={{ ...base, ...tone }} role="status" aria-live="polite">
      <div>
        <strong>{label}</strong>
        <span style={{ marginLeft: 8, opacity: 0.8 }}>Última conexão OK: {since}</span>
      </div>
      <button style={bannerStyles.button} onClick={() => window.location.reload()}>
        Recarregar página
      </button>
    </div>
  );
}
