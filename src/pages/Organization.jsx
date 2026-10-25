import { useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Modal, Spinner, Table, fmtDate, useLoad, useToast } from '../components/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function Settings({ canEdit }) {
  const toast = useToast();
  const { data, loading } = useLoad(() => api.get('/org/settings').then((r) => r.data));
  const [f, setF] = useState(null); const [err, setErr] = useState('');
  const v = f || data; if (loading || !v) return <Spinner />;
  const set = (k) => (e) => setF({ ...v, [k]: e.target.value });
  const locate = () => navigator.geolocation.getCurrentPosition((p) => setF({ ...v, officeLat: p.coords.latitude.toFixed(6), officeLng: p.coords.longitude.toFixed(6) }), () => toast('Could not read your location', 'err'));
  const save = async (e) => { e.preventDefault(); setErr(''); try { const { data: d } = await api.put('/org/settings', v); setF(d); toast('Settings saved. New rules apply to new records.'); } catch (x) { setErr(errMsg(x)); } };
  return (
    <Card title="Company settings">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><ErrorBox error={err} /></div>
        <Field label="Company name"><input className="input" disabled={!canEdit} value={v.companyName || ''} onChange={set('companyName')} /></Field>
        <Field label="Office start time"><input type="time" className="input" disabled={!canEdit} value={v.officeStart} onChange={set('officeStart')} /></Field>
        <Field label="Grace time (minutes)" hint="Late after start time plus grace"><input type="number" min="0" className="input" disabled={!canEdit} value={v.graceMinutes} onChange={set('graceMinutes')} /></Field>
        <Field label="Half day if worked under (hours)"><input type="number" min="0" step="0.5" className="input" disabled={!canEdit} value={v.halfDayHours} onChange={set('halfDayHours')} /></Field>
        <Field label="Weekend days"><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1 text-sm"><input type="checkbox" disabled={!canEdit} checked={v.weekend.includes(i)} onChange={(e) => setF({ ...v, weekend: e.target.checked ? [...v.weekend, i] : v.weekend.filter((x) => x !== i) })} />{d}</label>)}</div></Field>
        <Field label="Camera check-in radius (meters)"><input type="number" min="10" className="input" disabled={!canEdit} value={v.officeRadius} onChange={set('officeRadius')} /></Field>
        <Field label="Office latitude"><input className="input" disabled={!canEdit} value={v.officeLat ?? ''} onChange={set('officeLat')} /></Field>
        <Field label="Office longitude"><input className="input" disabled={!canEdit} value={v.officeLng ?? ''} onChange={set('officeLng')} /></Field>
        {canEdit && <div className="flex gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={locate}>Use my current location</button><button className="btn-primary">Save settings</button></div>}
      </form>
    </Card>
  );
}
function Lookup({ title, path, canEdit, fields, columns, empty }) {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get(path).then((r) => r.data));
  const [f, setF] = useState({}); const [err, setErr] = useState('');
  const add = async (e) => { e.preventDefault(); setErr(''); try { await api.post(path, f); setF({}); toast('Added'); reload(); } catch (x) { setErr(errMsg(x)); } };
  const del = async (id) => { if (!confirm('Delete this item?')) return; try { await api.delete(`${path}/${id}`); reload(); } catch (x) { toast(errMsg(x), 'err'); } };
  return (
    <Card title={title}>
      {canEdit && <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-3">{fields.map((x) => <Field key={x.k} label={x.label}>{x.type === 'check' ? <input type="checkbox" checked={f[x.k] ?? x.def ?? false} onChange={(e) => setF({ ...f, [x.k]: e.target.checked })} /> : <input className="input" type={x.type || 'text'} required={!x.optional} min={x.type === 'number' ? 0 : undefined} value={f[x.k] ?? ''} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />}</Field>)}<button className="btn-primary">Add</button></form>}
      <ErrorBox error={err} />
      {loading && !data ? <Spinner /> : <Table head={[...columns.map((c) => c[0]), '']} empty={data?.length === 0 && <Empty title={empty} />}>{data?.map((r) => <tr key={r._id}>{columns.map(([h, fn]) => <td key={h} className="td">{fn(r)}</td>)}<td className="td text-right">{canEdit && <button className="btn-ghost" onClick={() => del(r._id)}>Delete</button>}</td></tr>)}</Table>}
    </Card>
  );
}
function Users() {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get('/org/users').then((r) => r.data));
  const [f, setF] = useState({ name: '', email: '' }); const [err, setErr] = useState(''); const [creds, setCreds] = useState(null);
  const add = async (e) => { e.preventDefault(); setErr(''); try { const { data: d } = await api.post('/org/users/hr', f); setCreds({ email: d.email, tempPassword: d.tempPassword }); setF({ name: '', email: '' }); reload(); } catch (x) { setErr(errMsg(x)); } };
  const toggle = async (u) => { try { await api.patch(`/org/users/${u._id}/active`, { active: !u.active }); reload(); } catch (x) { toast(errMsg(x), 'err'); } };
  const reset = async (u) => { try { const { data: d } = await api.post(`/org/users/${u._id}/reset-password`); setCreds({ email: u.email, tempPassword: d.tempPassword }); } catch (x) { toast(errMsg(x), 'err'); } };
  return (
    <Card title="Logins">
      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-3"><Field label="HR name"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="HR email"><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field><button className="btn-primary">Create HR login</button></form>
      <ErrorBox error={err} />
      {loading && !data ? <Spinner /> : <Table head={['Name', 'Email', 'Role', 'Status', '']}>{data?.map((u) => <tr key={u._id}><td className="td font-semibold">{u.name}</td><td className="td">{u.email}</td><td className="td capitalize">{u.role}</td><td className="td"><Badge tone={u.active ? 'green' : 'rose'}>{u.active ? 'active' : 'deactivated'}</Badge></td><td className="td space-x-2 text-right"><button className="btn-ghost" onClick={() => reset(u)}>Reset password</button><button className="btn-ghost" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</Table>}
      {creds && <Modal title="Temporary password" onClose={() => setCreds(null)}><p className="text-sm">Share once. The user must change it at first sign-in.</p><div className="my-3 rounded-md bg-ink-50 p-3 text-sm"><div>Email: <b>{creds.email}</b></div><div>Password: <b className="select-all">{creds.tempPassword}</b></div></div><button className="btn-primary" onClick={() => setCreds(null)}>Done</button></Modal>}
    </Card>
  );
}
export default function Organization() {
  const { user } = useAuth(); const admin = user.role === 'admin';
  const [tab, setTab] = useState('settings');
  const tabs = [['settings', 'Settings'], ['departments', 'Departments'], ['designations', 'Designations'], ['leave', 'Leave types'], ['holidays', 'Holidays'], ...(admin ? [['users', 'Logins']] : [])];
  return (
    <>
      <h1 className="mb-1 text-xl font-extrabold">{admin ? 'Organization setup' : 'Company setup'}</h1>
      {!admin && <p className="mb-3 text-sm text-ink-500">View only. Admin manages company rules.</p>}
      <div className="mb-4 mt-3 flex flex-wrap gap-1.5">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-ink text-white' : 'btn-ghost'}`}>{l}</button>)}</div>
      {tab === 'settings' && <Settings canEdit={admin} />}
      {tab === 'departments' && <Lookup title="Departments" path="/org/departments" canEdit={admin} fields={[{ k: 'name', label: 'Department name' }]} columns={[['Name', (r) => r.name]]} empty="No departments yet. Add one to start registering employees." />}
      {tab === 'designations' && <Lookup title="Designations" path="/org/designations" canEdit={admin} fields={[{ k: 'name', label: 'Designation' }]} columns={[['Name', (r) => r.name]]} empty="No designations yet." />}
      {tab === 'leave' && <Lookup title="Leave types and yearly quotas" path="/org/leave-types" canEdit={admin} fields={[{ k: 'name', label: 'Name' }, { k: 'quota', label: 'Yearly quota (days)', type: 'number' }, { k: 'paid', label: 'Paid', type: 'check', def: true }]} columns={[['Type', (r) => r.name], ['Quota', (r) => (r.unlimited ? 'Unlimited' : r.quota)], ['Paid', (r) => (r.paid ? 'Yes' : 'No')]]} empty="No leave types." />}
      {tab === 'holidays' && <Lookup title="Public holidays" path="/org/holidays" canEdit={admin} fields={[{ k: 'date', label: 'Date', type: 'date' }, { k: 'name', label: 'Holiday name' }]} columns={[['Date', (r) => fmtDate(r.date)], ['Name', (r) => r.name]]} empty="No holidays yet. Working-day counts skip holidays you add here." />}
      {tab === 'users' && admin && <Users />}
    </>
  );
}
