/* Login — real React component (state-driven), for the true React app.
 *
 * Reuses the exact CSS classes from legacy/styles.css (#loginScreen, .lcard,
 * .fg, .pwd-wrap, .btn, .lerr, .btn-spin) so it looks identical to the live
 * app, but the behaviour is genuine React: controlled fields, an eye toggle
 * via state, Enter-to-submit, a Redux login thunk hitting POST /api/auth/login,
 * loading spinner and error display.
 */
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, clearError } from '../react/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  async function submit() {
    if (loading) return;
    const res = await dispatch(login({ username: username.trim(), password: password.trim() }));
    if (res.meta.requestStatus === 'fulfilled') navigate('/dashboard', { replace: true });
  }
  function onKeyDown(e) { if (e.key === 'Enter') submit(); }
  function onType(setter) {
    return (e) => { setter(e.target.value); if (error) dispatch(clearError()); };
  }

  return (
    <div id="loginScreen" style={{ display: 'flex' }}>
      <div className="lcard">
        <div className="logo">
          <div className="icon">📦</div>
          <h1>Order Management System</h1>
          <p>Pending Stock Order Tracker — Bangalore</p>
        </div>

        {error && <div className="lerr" style={{ display: 'block' }}>❌ {error}</div>}

        <div className="fg">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            autoComplete="username"
            value={username}
            onChange={onType(setUsername)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="fg">
          <label>Password</label>
          <div className="pwd-wrap">
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Enter password"
              autoComplete="current-password"
              value={password}
              onChange={onType(setPassword)}
              onKeyDown={onKeyDown}
            />
            <button
              type="button"
              className="pwd-eye"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
              title={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button className="btn btn-primary btn-block" disabled={loading} onClick={submit}>
          {loading ? <span className="btn-spin" /> : '🔐 Sign In'}
        </button>
      </div>
    </div>
  );
}
