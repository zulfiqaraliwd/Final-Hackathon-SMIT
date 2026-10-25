import { useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Modal, Spinner, Table, fmtDate, today, useLoad, useToast } from '../components/ui';

function History({ role, status, reload: outer }) {
  const toast = useToast();
  const [m, setM] = useState(null); const [comment, setComment] = useState(''); const [err, setErr] = useState('');
  const { data, loading, error, reload } = useLoad(() => api.get('/leave', { params: { status } }).then((r) => r.data), [status]);
  const after = () => { reload(); outer?.(); };
  const cancel = async (l) => { try { await api.patch(`/leave/${l._id}/cancel`); toast('Leave cancelled'); after(); } catch (e) { toast(errMsg(e), 'err'); } };
  const decide = async (decision) => { setErr(''); try { await api.patch(`/leave/${m._id}/decision`, { decision, comment }); toast(`Leave ${decision}`); setM(null); setComment(''); after(); } catch (e) { setErr(errMsg(e)); } };
  return (
    <>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : (
        <Table head={[role !== 'employee' && 'Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', ''].filter(Boolean)} empty={data?.length === 0 && <Empty title="No leave requests" hint={role === 'employee' ? 'Apply for leave above. Your requests and HR decisions appear here.' : 'Nothing here for this filter.'} />}>
          {data?.map((l) => (
            <tr key={l._id}>{role !== 'employee' && <td className="td font-semibold">{l.employee?.name}</td>}<td className="td capitalize">{l.type}</td><td className="td">{fmtDate(l.start)}</td><td className="td">{fmtDate(l.end)}</td><td className="td">{l.days}</td><td className="td max-w-[200px] truncate" title={l.reason}>{l.reason || '-'}</td>
              <td className="td"><Badge>{l.status}</Badge>{l.comment && <div className="text-xs text-ink-500">{l.comment}</div>}</td>
              <td className="td">{role === 'hr' && l.status === 'pending' && <button className="btn-ghost" onClick={() => { setErr(''); setM(l); }}>Review</button>}{role === 'employee' && ['pending', 'approved'].includes(l.status) && l.end >= today() && <button className="btn-ghost" onClick={() => cancel(l)}>Cancel</button>}</td></tr>
          ))}
        </Table>
      )}
      {m && (
        <Modal title={`Leave request: ${m.employee?.name}`} onClose={() => setM(null)}>
          <ErrorBox error={err} />
          <p className="mb-3 text-sm capitalize">{m.type} leave, {fmtDate(m.start)} to {fmtDate(m.end)} ({m.days} working day{m.days > 1 ? 's' : ''})<br /><span className="normal-case text-ink-500">{m.reason}</span></p>
          <Field label="Comment" hint="Required when rejecting"><input className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2"><button className="btn-danger" onClick={() => decide('rejected')}>Reject</button><button className="btn-primary" onClick={() => decide('approved')}>Approve</button></div>
        </Modal>
      )}
    </>
  );
}
function EmployeeLeave() {
  const toast = useToast();
  const types = useLoad(() => api.get('/org/leave-types').then((r) => r.data));
  const bal = useLoad(() => api.get('/leave/balance').then((r) => r.data));
  const [f, setF] = useState({ type: 'casual', start: '', end: '', reason: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [text, setText] = useState(''); const [aiBusy, setAiBusy] = useState(false); const [aiErr, setAiErr] = useState(''); const [aiNote, setAiNote] = useState(false);
  const [tick, setTick] = useState(0);
  const smart = async () => {
    setAiBusy(true); setAiErr(''); setAiNote(false);
    try { const { data } = await api.post('/ai/smart-leave', { text }); setF({ ...f, ...data.leave }); setAiNote(true); } catch (e) { setAiErr(errMsg(e)); } setAiBusy(false);
  };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/leave', f); toast('Leave request sent to HR'); setF({ type: 'casual', start: '', end: '', reason: '' }); setText(''); setAiNote(false); bal.reload(); setTick((t) => t + 1); } catch (x) { setErr(errMsg(x)); } setBusy(false);
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{bal.data?.map((b) => <div key={b.key} className="card p-4"><div className="text-xs font-medium text-ink-500">{b.name}</div><div className="mt-1 text-2xl font-extrabold">{b.unlimited ? b.used : b.remaining}</div><div className="text-xs text-ink-500">{b.unlimited ? 'days taken (no limit)' : `of ${b.quota} left${b.pending ? `, ${b.pending} pending` : ''}`}</div></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Describe your leave">
          <p className="mb-2 text-sm text-ink-500">Example: "Need next Monday and Tuesday off for my sister's wedding". The form fills in; you confirm before sending.</p>
          <textarea className="input" rows={3} maxLength={400} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type in plain words" aria-label="Leave request in plain words" />
          <ErrorBox error={aiErr} />
          <button className="btn-ai mt-2" disabled={!text.trim() || aiBusy} onClick={smart}>{aiBusy ? 'Reading...' : 'Fill the form'}</button>
        </Card>
        <Card title="Leave request">
          <form onSubmit={submit} className="space-y-3">
            {aiNote && <div className="rounded-md bg-plum-soft px-3 py-2 text-xs text-plum">AI-generated. Check the dates and type, then send.</div>}
            <ErrorBox error={err} />
            <Field label="Leave type"><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{types.data?.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" className="input" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value, end: f.end && f.end < e.target.value ? e.target.value : f.end })} /></Field><Field label="To"><input type="date" className="input" required min={f.start} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field></div>
            <Field label="Reason"><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
            <button className="btn-primary w-full" disabled={busy}>Send request</button>
          </form>
        </Card>
      </div>
      <Card title="My leave history"><History key={tick} role="employee" reload={bal.reload} /></Card>
    </div>
  );
}
function Inbox({ role }) {
  const [status, setStatus] = useState('pending');
  return (
    <Card title={role === 'hr' ? 'Approval inbox' : 'All leave requests'} action={<select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option><option value="">All</option></select>}>
      <History key={status} role={role} status={status} />
    </Card>
  );
}
export default function Leave() {
  const { user } = useAuth();
  return (<><h1 className="mb-4 text-xl font-extrabold">{user.role === 'employee' ? 'My leave' : 'Leave requests'}</h1>{user.role === 'employee' ? <EmployeeLeave /> : <Inbox role={user.role} />}</>);
}
