import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input, Spinner } from '../components/ui.jsx';
import { apiError } from '../api/client.js';

export default function AuthPage({ mode }) {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            F
          </div>
          <h1 className="text-xl font-bold">Flowdeck</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
              <Input value={form.name} onChange={set('name')} placeholder="Ada Lovelace" required />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              required
              minLength={8}
            />
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <a href="/register" className="font-medium text-brand-600 hover:underline">
                Register
              </a>
            </>
          ) : (
            <>
              Already registered?{' '}
              <a href="/login" className="font-medium text-brand-600 hover:underline">
                Sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
