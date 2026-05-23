import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="text-7xl">📋</div>
      <h1 className="text-3xl font-black text-slate-800">404 — Not Found</h1>
      <p className="text-slate-500">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary mt-2">← Back to Dashboard</Link>
    </div>
  );
}
