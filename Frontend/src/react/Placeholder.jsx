/* Temporary page for screens not yet ported to React.
 * Each is replaced by its real component as the migration proceeds. */
export default function Placeholder({ title }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{title}</h1>
      <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 14 }}>
        This screen is being ported to React.
      </p>
    </div>
  );
}
