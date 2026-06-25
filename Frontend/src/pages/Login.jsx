import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, clearError } from '../store/slices/authSlice';
import Spinner from '../components/ui/Spinner';

export default function Login() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { loading, error, token } = useSelector(s => s.auth);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => { if (token) navigate('/dashboard', { replace: true }); }, [token]);
  useEffect(() => { dispatch(clearError()); }, []);

  const onSubmit = async (data) => {
    const res = await dispatch(login(data));
    if (res.meta.requestStatus === 'fulfilled') navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-3xl mb-3 shadow-xl">S</div>
          <h1 className="text-2xl font-black text-white">Stencil OMS</h1>
          <p className="text-slate-400 text-sm mt-1">Order Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Sign in to continue</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username or Email</label>
              <input
                className="input"
                placeholder="admin"
                {...register('username', { required: 'Username is required' })}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <Spinner size="sm" /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}
