export default function SourceChip({ source }) {
  const labels = {
    semantic_scholar: { label: 'Paper', color: '#5080c0' },
    rss: { label: 'News', color: '#608050' },
    reddit: { label: 'Reddit', color: '#b06030' },
  };
  const cfg = labels[source] || { label: source, color: '#606060' };
  return (
    <span style={{
      fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
      background: `${cfg.color}18`, color: cfg.color,
      border: `1px solid ${cfg.color}30`, fontWeight: 500,
    }}>
      {cfg.label}
    </span>
  );
}
