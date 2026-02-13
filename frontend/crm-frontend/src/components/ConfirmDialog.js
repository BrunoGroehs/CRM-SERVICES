import React from 'react';

export const ConfirmDialog = ({ open, title, message, details, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone='danger', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title || 'Confirmação'}>
      <div className={`modal-shell modal-sm confirm-dialog confirm-${tone}`}>
        <div className="modal-header">
          <h3>{title || 'Confirmar ação'}</h3>
          <button className="modal-btn modal-btn-icon" aria-label="Fechar" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          {message && <p className="confirm-message">{message}</p>}
          {details && <div className="confirm-details">{details}</div>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={`modal-btn ${tone === 'danger' ? 'modal-btn-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;