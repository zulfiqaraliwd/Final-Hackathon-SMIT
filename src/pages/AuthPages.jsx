import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Field, Spinner } from '../components/ui';

const Shell = ({ title, sub, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-1 text-sm font-extrabold text-teal">HCM Lite</div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mb-5 mt-1 text-sm text-ink-500">{sub}</p>
      {children}
    </div>
  </div>
);
export function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(null);
  useEffect(() => { api.get('/auth/setup-status').then((r) => setSetup(r.data)).catch(() => setSetup({ setupDone: true })); }, []);
  if (setup && !setup.setupDone) return <Navigate to="/setup" replace />;
  if (!setup) return <Spinner />;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const { data } = await api.post('/auth/login', f); login(data.token, data.user); nav(data.user.mustChangePassword ? '/change-password' : '/'); }
    catch (x) { setErr(errMsg(x)); } setBusy(false);
  };
  return (
    <Shell title="Log in" sub={setup.companyName ? `Sign in to ${setup.companyName}` : 'Sign in to your account'}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <Field label="Email"><input className="input" type="email" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
    </Shell>
  );
}
export function Setup() {
  const { login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ companyName: '', name: '', email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => { api.get('/auth/setup-status').then((r) => setDone(r.data.setupDone)).catch(() => setDone(false)); }, []);
  if (done) return <Navigate to="/login" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const { data } = await api.post('/auth/setup', f); login(data.token, data.user); nav('/organization'); } catch (x) { setErr(errMsg(x)); } setBusy(false);
  };
  return (
    <Shell title="Set up your company" sub="This runs once. You become the Admin, then add departments and HR logins.">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <Field label="Company name"><input className="input" required value={f.companyName} onChange={set('companyName')} /></Field>
        <Field label="Your name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Admin email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="At least 8 characters"><input className="input" type="password" required minLength={8} value={f.password} onChange={set('password')} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating...' : 'Create company'}</button>
      </form>
    </Shell>
  );
}
export function ChangePassword() {
  const { user, refresh } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ current: '', password: '', again: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password !== f.again) return setErr('New passwords do not match');
    setBusy(true);
    try { await api.post('/auth/change-password', { current: f.current, password: f.password }); await refresh(); nav('/'); } catch (x) { setErr(errMsg(x)); } setBusy(false);
  };
  return (
    <Shell title="Change password" sub={user?.mustChangePassword ? 'Choose a new password before you continue.' : 'Update your password.'}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <Field label={user?.mustChangePassword ? 'Temporary password' : 'Current password'}><input className="input" type="password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="New password" hint="At least 8 characters"><input className="input" type="password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Repeat new password"><input className="input" type="password" required value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>Save password</button>
      </form>
    </Shell>
  );
}
