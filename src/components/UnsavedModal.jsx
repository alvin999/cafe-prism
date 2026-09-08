export default function UnsavedModal({ isOpen, onStay, onDiscard, onSaveAndLeave, t }) {
  if (!isOpen) return null;

  return (
    <div className="prism-modal-backdrop" onClick={onStay}>
      <div className="prism-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--prism-text-primary)', fontWeight: 600 }}>
            {t.settings.unsavedChangesTitle}
          </h3>
        </div>

        <p style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)', lineHeight: 1.6, margin: '0 0 22px' }}>
          {t.settings.unsavedChangesConfirm}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="prism-btn prism-btn-ghost"
            onClick={onStay}
          >
            {t.settings.stayOnPage}
          </button>
          <button
            type="button"
            className="prism-btn prism-btn-danger"
            onClick={onDiscard}
          >
            {t.settings.discardAndLeave}
          </button>
          <button
            type="button"
            className="prism-btn prism-btn-primary"
            onClick={onSaveAndLeave}
          >
            ✓ {t.settings.saveAndLeave}
          </button>
        </div>
      </div>
    </div>
  );
}
