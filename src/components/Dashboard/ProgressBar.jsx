export default function ProgressBar({ progress, message }) {
  return (
    <div className="animate-fade-in" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--prism-text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="animate-spin" style={{ color: 'var(--prism-amber-500)', fontSize: '11px' }}>⟳</span>
          {message}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--prism-amber-500)', fontFamily: 'monospace', fontWeight: 600 }}>
          {progress}%
        </span>
      </div>
      <div style={{
        height: '5px',
        background: 'rgba(255, 255, 255, 0.07)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div
          className="animate-shimmer"
          style={{
            height: '100%',
            borderRadius: '3px',
            background: 'linear-gradient(90deg, #b5853a, #dfbe78)',
            width: `${progress}%`,
            transition: 'width 0.35s var(--prism-ease-spring)',
            boxShadow: '0 0 10px rgba(200, 160, 96, 0.5)',
          }}
        />
      </div>
    </div>
  );
}
