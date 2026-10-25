import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { download, errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Modal, Pager, Spinner, Table, fmtDate, money, useLoad, useToast, monthNow } from '../components/ui';

const blank = { code: '', name: '', email: '', phone: '', gender: 'other', department: '', designation: '', joinDate: '', basic: '', status: 'active', exitDate: '' };
function EmployeeForm({ initial, onClose, onSaved }) {
  const edit = !!initial?._id;
  const [f, setF] = useState(initial ? { ...blank, ...initial, department: initial.department?._id || '', designation: initial.designation?._id || '' } : blank);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [login, setLogin] = useState(null);
  const depts = useLoad(() => api.get('/org/departments').then((r) => r.data));
  const desigs = useLoad(() => api.get('/org/designations').then((r) => r.data));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (edit) { await api.put(`/employees/${initial._id}`, f); onSaved(); onClose(); }
      else { const { data } = await api.post('/employees', f); setLogin(data.login); onSaved(); }
    } catch (x) { setErr(errMsg(x)); } setBusy(false);
  };
  if (login) return (
    <Modal title="Employee registered" onClose={onClose}>
      <p className="text-sm">A login was created. Share these details once; the employee must change the password at first sign-in.</p>
      <div className="my-3 rounded-md bg-ink-50 p-3 text-sm"><div>Email: <b>{login.email}</b></div><div>Temporary password: <b className="select-all">{login.tempPassword}</b></div></div>
      <button className="btn-primary" onClick={onClose}>Done</button>
    </Modal>
  );
  return (
    <Modal title={edit ? 'Edit employee' : 'Register employee'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBox error={err} /></div>
        <Field label="Employee code"><input className="input" required value={f.code} onChange={set('code')} /></Field>
        <Field label="Full name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email (used to log in)"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
        <Field label="Gender"><select className="input" value={f.gender} onChange={set('gender')}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
        <Field label="Join date"><input className="input" type="date" required value={f.joinDate} onChange={set('joinDate')} /></Field>
        <Field label="Department"><select className="input" value={f.department} onChange={set('department')}><option value="">Select</option>{depts.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
        <Field label="Designation"><select className="input" value={f.designation} onChange={set('designation')}><option value="">Select</option>{desigs.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
        <Field label="Basic salary (monthly)" hint="Gross = 1.5 x basic (HRA 40%, medical 10%)"><input className="input" type="number" min="1" required value={f.basic} onChange={set('basic')} /></Field>
        <Field label="Status"><select className="input" value={f.status} onChange={set('status')}><option value="active">Active</option><option value="probation">Probation</option>{edit && <option value="exited">Exited</option>}</select></Field>
        {f.status === 'exited' && <Field label="Exit date"><input className="input" type="date" required value={f.exitDate || ''} onChange={set('exitDate')} /></Field>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{edit ? 'Save changes' : 'Register employee'}</button></div>
      </form>
    </Modal>
  );
}
function ImportModal({ onClose, onDone }) {
  const [csv, setCsv] = useState(''); const [rep, setRep] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [logins, setLogins] = useState(null);
  const run = async (dry) => {
    setBusy(true); setErr('');
    try { const { data } = await api.post(`/employees/import?dry=${dry ? 1 : 0}`, { csv }); if (dry) setRep(data); else { setLogins(data.logins); onDone(); } } catch (e) { setErr(errMsg(e)); } setBusy(false);
  };
  const read = (file) => { const r = new FileReader(); r.onload = () => { setCsv(String(r.result)); setRep(null); }; r.readAsText(file); };
  if (logins) return (
    <Modal title={`Imported ${logins.length} employees`} onClose={onClose}>
      <p className="mb-2 text-sm">Temporary passwords (shown once):</p>
      <div className="max-h-64 overflow-auto rounded-md bg-ink-50 p-3 text-xs">{logins.map((l) => <div key={l.email}>{l.email} : <b>{l.tempPassword}</b></div>)}</div>
      <button className="btn-primary mt-3" onClick={onClose}>Done</button>
    </Modal>
  );
  return (
    <Modal title="Import employees from CSV" onClose={onClose} wide>
      <p className="mb-2 text-sm text-ink-500">Columns: <code>code,name,email,phone,gender,department,designation,joinDate,basic,status</code>. Departments must already exist. Run a dry run first.</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && read(e.target.files[0])} className="mb-3 text-sm" />
      <ErrorBox error={err} />
      {rep && (
        <div className="mb-3 rounded-md border border-ink-100 p-3 text-sm">
          <div><b>{rep.valid}</b> of {rep.total} rows are valid.</div>
          {rep.errors.length > 0 && <div className="mt-2 max-h-48 overflow-auto"><Table head={['Row', 'Field', 'Reason']}>{rep.errors.map((e, i) => <tr key={i}><td className="td">{e.row}</td><td className="td">{e.field}</td><td className="td">{e.reason}</td></tr>)}</Table></div>}
        </div>
      )}
      <div className="flex justify-end gap-2"><button className="btn-ghost" disabled={!csv || busy} onClick={() => run(true)}>Dry run</button><button className="btn-primary" disabled={!rep || !rep.valid || busy} onClick={() => run(false)}>Import {rep?.valid || 0} valid rows</button></div>
    </Modal>
  );
}
export default function Employees() {
  const { user } = useAuth(); const toast = useToast();
  const isHR = user.role === 'hr';
  const [q, setQ] = useState(''); const [dept, setDept] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const depts = useLoad(() => api.get('/org/departments').then((r) => r.data));
  const { data, loading, error, reload } = useLoad(() => api.get('/employees', { params: { q, department: dept, status, page, limit: 10 } }).then((r) => r.data), [q, dept, status, page]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Employees</h1>
        {isHR && <div className="flex gap-2"><button className="btn-ghost" onClick={() => download('/employees/export', 'employees.csv').catch((e) => toast(errMsg(e), 'err'))}>Export CSV</button><button className="btn-ghost" onClick={() => setModal('import')}>Import CSV</button><button className="btn-primary" onClick={() => setModal('new')}>Register employee</button></div>}
      </div>
      <div className="card mb-4 flex flex-wrap gap-3 p-3">
        <input className="input max-w-xs" placeholder="Search name, code or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search" />
        <select className="input max-w-[200px]" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} aria-label="Department"><option value="">All departments</option>{depts.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select className="input max-w-[160px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="probation">Probation</option><option value="exited">Exited</option></select>
      </div>
      <ErrorBox error={error} />
      <Card>
        {loading && !data ? <Spinner /> : (
          <>
            <Table head={['Code', 'Name', 'Department', 'Designation', 'Joined', 'Status']} empty={data?.data.length === 0 && <Empty title="No employees found" hint={isHR ? 'Register your first employee to create their login.' : 'HR registers employees. They will appear here.'} />}>
              {data?.data.map((e) => (
                <tr key={e._id} className="hover:bg-ink-50"><td className="td">{e.code}</td><td className="td"><Link className="font-semibold text-teal" to={`/employees/${e._id}`}>{e.name}</Link><div className="text-xs text-ink-500">{e.email}</div></td><td className="td">{e.department?.name || '-'}</td><td className="td">{e.designation?.name || '-'}</td><td className="td">{fmtDate(e.joinDate)}</td><td className="td"><Badge>{e.status}</Badge></td></tr>
              ))}
            </Table>
            <Pager page={data?.page} pages={data?.pages} onChange={setPage} />
          </>
        )}
      </Card>
      {modal === 'new' && <EmployeeForm onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} onDone={reload} />}
    </>
  );
}
export function EmployeeDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [month, setMonth] = useState(monthNow()); const [edit, setEdit] = useState(false);
  const { data, loading, error, reload } = useLoad(() => api.get(`/employees/${id}`).then((r) => r.data), [id]);
  const cal = useLoad(() => api.get(`/attendance/employee/${id}`, { params: { month } }).then((r) => r.data), [id, month]);
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const { employee: e, attendanceThisMonth: a, leaveBalances, payslips } = data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><Link to="/employees" className="text-sm font-semibold text-teal">Back to employees</Link><h1 className="text-xl font-extrabold">{e.name} <Badge>{e.status}</Badge></h1><div className="text-sm text-ink-500">{e.code} / {e.designation?.name || 'No designation'} / {e.department?.name || 'No department'}</div></div>{user.role === 'hr' && <button className="btn-primary" onClick={() => setEdit(true)}>Edit employee</button>}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Profile"><dl className="space-y-1.5 text-sm">{[['Email', e.email], ['Phone', e.phone || '-'], ['Address', e.address || '-'], ['Gender', e.gender], ['Joined', fmtDate(e.joinDate)], ['Exit date', e.exitDate ? fmtDate(e.exitDate) : '-'], ['Basic salary', money(e.basic)], ['Gross salary', money(e.basic * 1.5)]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-ink-500">{k}</dt><dd className="text-right font-semibold capitalize">{v}</dd></div>)}</dl></Card>
        <Card title="This month"><div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(a.counts).map(([k, v]) => <div key={k} className="rounded-md bg-ink-50 p-2"><div className="text-xs capitalize text-ink-500">{k.replace(/_/g, ' ')}</div><div className="text-lg font-bold">{v}</div></div>)}</div><div className="mt-3 text-sm">Attendance rate: <b>{a.attendanceRate}%</b></div>{Object.keys(a.counts).length === 0 && <p className="text-sm text-ink-500">No attendance recorded yet.</p>}</Card>
        <Card title="Leave balance (this year)"><table className="w-full text-sm"><tbody>{leaveBalances.map((b) => <tr key={b.key}><td className="py-1">{b.name}</td><td className="py-1 text-right font-semibold">{b.unlimited ? `${b.used} used` : `${b.remaining} / ${b.quota} left`}{b.pending > 0 && <span className="text-xs text-amber"> ({b.pending} pending)</span>}</td></tr>)}</tbody></table></Card>
      </div>
      <Card title="Attendance calendar" action={<input type="month" className="input !w-auto" value={month} onChange={(ev) => setMonth(ev.target.value)} />}>
        {cal.data ? <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">{cal.data.map((d) => <div key={d.date} className="rounded-md border border-ink-100 p-2 text-xs"><div className="font-semibold">{d.date.slice(8)}</div><Badge>{d.status}</Badge></div>)}</div> : <Spinner />}
      </Card>
      <Card title="Payslips">{payslips.length ? <Table head={['Month', 'Status', 'Net pay']}>{payslips.map((p) => <tr key={p.month}><td className="td">{p.month}</td><td className="td"><Badge>{p.status}</Badge></td><td className="td">{money(p.net)}</td></tr>)}</Table> : <Empty title="No payslips yet" />}</Card>
      {edit && <EmployeeForm initial={e} onClose={() => setEdit(false)} onSaved={reload} />}
    </div>
  );
}
