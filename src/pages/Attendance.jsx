import { useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Modal, Spinner, Table, fmtDate, fmtTime, today, monthNow, useLoad, useToast } from '../components/ui';
import CheckInCard from '../components/CheckInCard';

function Corrections({ role }) {
  const toast = useToast();
  const [modal, setModal] = useState(null); const [err, setErr] = useState(''); const [f, setF] = useState({ date: today(), checkIn: '09:00', checkOut: '', reason: '' }); const [comment, setComment] = useState('');
  const { data, loading, error, reload } = useLoad(() => api.get('/attendance/corrections').then((r) => r.data));
  const request = async (e) => { e.preventDefault(); setErr(''); try { await api.post('/attendance/corrections', f); toast('Correction requested'); setModal(null); reload(); } catch (x) { setErr(errMsg(x)); } };
  const decide = async (decision) => { try { await api.patch(`/attendance/corrections/${modal.c._id}`, { decision, comment }); toast(`Correction ${decision}`); setModal(null); setComment(''); reload(); } catch (x) { setErr(errMsg(x)); } };
  return (
    <Card title={role === 'employee' ? 'My correction requests' : 'Attendance corrections'} action={role === 'employee' && <button className="btn-primary" onClick={() => { setErr(''); setModal({ type: 'new' }); }}>Request correction</button>}>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : (
        <Table head={['Employee', 'Date', 'Requested times', 'Reason', 'Status', '']} empty={data?.length === 0 && <Empty title="No corrections" hint={role === 'employee' ? 'Forgot to check in, or the camera check failed? Request a correction and HR will review it.' : 'Requests from employees show up here.'} />}>
          {data?.map((c) => <tr key={c._id}><td className="td">{c.employee?.name}</td><td className="td">{fmtDate(c.date)}</td><td className="td">{c.checkIn} - {c.checkOut || '?'}</td><td className="td max-w-[220px] truncate" title={c.reason}>{c.reason}</td><td className="td"><Badge>{c.status}</Badge></td><td className="td">{role === 'hr' && c.status === 'pending' && <button className="btn-ghost" onClick={() => { setErr(''); setModal({ type: 'decide', c }); }}>Review</button>}</td></tr>)}
        </Table>
      )}
      {modal?.type === 'new' && (
        <Modal title="Request attendance correction" onClose={() => setModal(null)}>
          <form onSubmit={request} className="space-y-3"><ErrorBox error={err} />
            <Field label="Date"><input type="date" className="input" max={today()} required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Check-in time"><input type="time" className="input" required value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></Field><Field label="Check-out time"><input type="time" className="input" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field></div>
            <Field label="Reason"><textarea className="input" rows={3} required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
            <button className="btn-primary w-full">Send request</button></form>
        </Modal>
      )}
      {modal?.type === 'decide' && (
        <Modal title={`Correction for ${modal.c.employee?.name}`} onClose={() => setModal(null)}>
          <ErrorBox error={err} />
          <p className="mb-3 text-sm">{fmtDate(modal.c.date)}: {modal.c.checkIn} to {modal.c.checkOut || 'no check-out'}<br /><span className="text-ink-500">{modal.c.reason}</span></p>
          <Field label="Comment (optional)"><input className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2"><button className="btn-danger" onClick={() => decide('rejected')}>Reject</button><button className="btn-primary" onClick={() => decide('approved')}>Approve</button></div>
        </Modal>
      )}
    </Card>
  );
}
function EmployeeView() {
  const [month, setMonth] = useState(monthNow());
  const cal = useLoad(() => api.get('/attendance/my', { params: { month } }).then((r) => r.data), [month]);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3"><CheckInCard onChange={cal.reload} />
        <Card title="My attendance calendar" className="lg:col-span-2" action={<input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />}>
          {cal.data ? <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-7">{cal.data.map((d) => <div key={d.date} className="rounded-md border border-ink-100 p-2 text-xs"><div className="font-semibold">{d.date.slice(8)}</div><Badge>{d.status}</Badge>{d.checkIn && <div className="mt-1 text-ink-500">{fmtTime(d.checkIn)} - {fmtTime(d.checkOut)}</div>}</div>)}</div> : <Spinner />}
        </Card>
      </div>
      <Corrections role="employee" />
    </div>
  );
}
function BoardView({ role }) {
  const [date, setDate] = useState(today()); const [dept, setDept] = useState('');
  const depts = useLoad(() => api.get('/org/departments').then((r) => r.data));
  const { data, loading, error } = useLoad(() => api.get('/attendance/board', { params: { date, department: dept } }).then((r) => r.data), [date, dept]);
  const count = (s) => data?.filter((r) => r.status === s).length ?? 0;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Department"><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{depts.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
        {data && <div className="ml-auto flex flex-wrap gap-2 text-sm"><Badge tone="green">{count('present')} present</Badge><Badge tone="amber">{count('late')} late</Badge><Badge tone="plum">{count('on_leave')} on leave</Badge><Badge tone="rose">{count('absent')} absent</Badge></div>}
      </div>
      <ErrorBox error={error} />
      <Card title="Daily attendance board">
        {loading && !data ? <Spinner /> : (
          <Table head={['Code', 'Employee', 'Department', 'Check-in', 'Check-out', 'Hours', 'Status']} empty={data?.length === 0 && <Empty title="No employees for this date" hint="Register employees first, or pick another date." />}>
            {data?.map((r) => <tr key={r.employee._id}><td className="td">{r.employee.code}</td><td className="td font-semibold">{r.employee.name}</td><td className="td">{r.employee.department || '-'}</td><td className="td">{fmtTime(r.checkIn)}</td><td className="td">{fmtTime(r.checkOut)}</td><td className="td">{r.hours || '-'}</td><td className="td"><Badge>{r.status}</Badge>{r.source === 'camera' && <span className="ml-1 text-xs text-ink-500">camera</span>}</td></tr>)}
          </Table>
        )}
      </Card>
      <Corrections role={role} />
    </div>
  );
}
export default function Attendance() {
  const { user } = useAuth();
  return (<><h1 className="mb-4 text-xl font-extrabold">{user.role === 'employee' ? 'My attendance' : 'Attendance'}</h1>{user.role === 'employee' ? <EmployeeView /> : <BoardView role={user.role} />}</>);
}
