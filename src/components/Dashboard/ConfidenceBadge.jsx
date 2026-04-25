export default function ConfidenceBadge({ level, t }) {
  const cfg = {
    high:   { color: '#4a9967', bg: 'rgba(74,153,103,0.12)', border: 'rgba(74,153,103,0.25)', label: t.dashboard.high, dot: '●' },
    medium: { color: '#b89040', bg: 'rgba(184,144,64,0.12)', border: 'rgba(184,144,64,0.25)', label: t.dashboard.medium, dot: '◉' },
    low:    { color: '#b05040', bg: 'rgba(176,80,64,0.12)',  border: 'rgba(176,80,64,0.25)',  label: t.dashboard.low, dot: '○' },
  }[level] || {};

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: 500,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '20px', padding: '3px 9px',
      letterSpacing: '0.02em',
    }}>
      <span style={{ fontSize: '8px' }}>{cfg.dot}</span>
      {t.dashboard.confidence}: {cfg.label}
    </span>
  );
}
