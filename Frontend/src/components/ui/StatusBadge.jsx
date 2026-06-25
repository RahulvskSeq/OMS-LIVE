import { STATUS_COLORS } from '../../utils/constants';

export default function StatusBadge({ status, size = 'sm' }) {
  const c = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  const px = size === 'sm' ? '8px' : '10px';
  const py = size === 'sm' ? '2px' : '4px';
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: `${py} ${px}`, fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {status || '—'}
    </span>
  );
}
