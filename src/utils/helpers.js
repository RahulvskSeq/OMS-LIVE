export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? d : `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};

export const fmtDateShort = (d) => {
  if (!d) return '—';
  const p = String(d).slice(0,10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : d;
};

export const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export const fmtRelative = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
};

export const daysBetween = (d1, d2) => {
  const t1 = new Date(d1).getTime(), t2 = new Date(d2).getTime();
  return isNaN(t1)||isNaN(t2) ? 0 : Math.round((t2-t1)/86400000);
};

export const todayStr = () => new Date().toISOString().slice(0,10);

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const classNames = (...cls) => cls.filter(Boolean).join(' ');
