import { Fragment, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Pager, Spinner, Table, fmtDate, fmtTime, money, useLoad, useToast } from '../components/ui';

export function Announcements() {
  const { user } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ title: '', body: '' }); const [err, setErr] = useState('');
  const { data, loading, reload } = useLoad(() => api.get('/comms/announcements').then((r) => r.data));
  const post = async (e) => { e.preventDefault(); setErr(''); try { await api.post('/comms/announcements', f); setF({ title: '', body: '' }); toast('Announcement posted'); reload(); } catch (x) { setErr(errMsg(x)); } };
  return (
    <div className="space-y-4"><h1 className="text-xl font-extrabold">Announcements</h1>
      {user.role !== 'employee' && <Card title="Post an announcement"><form onSubmit={post} className="space-y-3"><ErrorBox error={err} /><Field label="Title"><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field label="Message"><textarea className="input" rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field><button className="btn-primary">Post to everyone</button></form></Card>}
      <Card>{loading && !data ? <Spinner /> : data?.length ? data.map((a) => <div key={a._id} className="border-b border-ink-100 py-3 last:border-0"><div className="font-bold">{a.title}</div><div className="whitespace-pre-wrap text-sm text-ink-700">{a.body}</div><div className="mt-1 text-xs text-ink-500">{a.authorName}, {fmtDate(a.createdAt)}</div></div>) : <Empty title="No announcements yet" hint={user.role === 'employee' ? 'Company news will appear here.' : 'Post the first one above.'} />}</Card>
    </div>
  );
}
export function Audit() {
  const [page, setPage] = useState(1); const [entity, setEntity] = useState(''); const [open, setOpen] = useState(null);
  const { data, loading, error } = useLoad(() => api.get('/comms/audit', { params: { page, entity } }).then((r) => r.data), [page, entity]);
  return (
    <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-extrabold">Audit log</h1><select className="input !w-auto" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Entity"><option value="">All entities</option>{['employee', 'leave', 'correction', 'payroll', 'settings', 'department', 'designation', 'leave_type', 'holiday', 'hr_user', 'user', 'announcement'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></div>
      <ErrorBox error={error} />
      <Card>{loading && !data ? <Spinner /> : (
        <><p className="mb-2 text-xs text-ink-500">Entries are read-only and cannot be edited or deleted.</p>
          <Table head={['When', 'Actor', 'Action', 'Entity', 'Details']} empty={data?.data.length === 0 && <Empty title="No audit entries yet" />}>
            {data?.data.map((a) => <Fragment key={a._id}><tr><td className="td whitespace-nowrap">{fmtDate(a.createdAt)} {fmtTime(a.createdAt)}</td><td className="td">{a.actorName}</td><td className="td"><Badge tone="plum">{a.action.replace(/_/g, ' ')}</Badge></td><td className="td">{a.entity.replace(/_/g, ' ')}</td><td className="td"><button className="text-sm font-semibold text-teal" onClick={() => setOpen(open === a._id ? null : a._id)}>{open === a._id ? 'Hide' : 'Before / after'}</button></td></tr>
              {open === a._id && <tr><td colSpan={5} className="bg-ink-50 p-3"><div className="grid gap-3 md:grid-cols-2 text-xs"><div><b>Before</b><pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap">{JSON.stringify(a.before, null, 2) ?? 'null'}</pre></div><div><b>After</b><pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap">{JSON.stringify(a.after, null, 2) ?? 'null'}</pre></div></div></td></tr>}</Fragment>)}
          </Table><Pager page={data?.page} pages={data?.pages} onChange={setPage} /></>
      )}</Card>
    </div>
  );
}
export function Profile() {
  const toast = useToast(); const [f, setF] = useState(null); const [err, setErr] = useState('');
  const { data, loading, reload } = useLoad(() => api.get('/employees/me').then((r) => r.data));
  if (loading && !data) return <Spinner />;
  const v = f || { phone: data.phone || '', address: data.address || '' };
  const save = async (e) => { e.preventDefault(); setErr(''); try { await api.patch('/employees/me', v); toast('Profile updated'); reload(); } catch (x) { setErr(errMsg(x)); } };
  return (
    <div className="space-y-4"><h1 className="text-xl font-extrabold">My profile</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Job details"><dl className="space-y-1.5 text-sm">{[['Name', data.name], ['Employee code', data.code], ['Email', data.email], ['Department', data.department?.name || '-'], ['Designation', data.designation?.name || '-'], ['Joined', fmtDate(data.joinDate)], ['Basic salary', money(data.basic)]].map(([k, x]) => <div key={k} className="flex justify-between gap-3"><dt className="text-ink-500">{k}</dt><dd className="font-semibold">{x}</dd></div>)}</dl><p className="mt-3 text-xs text-ink-500">Only HR can change job details or salary.</p></Card>
        <Card title="Contact details"><form onSubmit={save} className="space-y-3"><ErrorBox error={err} /><Field label="Phone"><input className="input" value={v.phone} onChange={(e) => setF({ ...v, phone: e.target.value })} /></Field><Field label="Address"><textarea className="input" rows={3} value={v.address} onChange={(e) => setF({ ...v, address: e.target.value })} /></Field><button className="btn-primary">Save contact details</button></form></Card>
      </div>
    </div>
  );
}
