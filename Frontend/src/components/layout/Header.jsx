import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice';

export default function Header({ title, actions }) {
  const dispatch = useDispatch();
  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4 sticky top-0 z-20">
      <button onClick={() => dispatch(toggleSidebar())} className="btn-icon text-lg">☰</button>
      <h1 className="text-base font-bold text-slate-800 flex-1">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
