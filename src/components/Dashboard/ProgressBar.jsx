export default function ProgressBar({ progress, message }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: '#a09070' }}>{message}</span>
        <span style={{ fontSize: '13px', color: '#706050', fontFamily: 'monospace' }}>{progress}%</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          background: 'linear-gradient(90deg, #8a6030, #c8a050)',
          width: `${progress}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}
