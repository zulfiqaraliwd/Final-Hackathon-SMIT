import { useState } from 'react';
import api, { download, errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Modal, Spinner, Table, money, monthNow, useLoad, useToast } from '../components/ui';

function Salaries({ canEdit }) {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get('/employees', { params: { limit: 100 } }).then((r) => r.data));
  const [m, setM] = useState(null); const [basic, setBasic] = useState(''); const [err, setErr] = useState('');
  const save = async () => { setErr(''); try { await api.put(`/employees/${m._id}`, { basic }); toast('Salary updated'); setM(null); reload(); } catch (e) { setErr(errMsg(e)); } };
  return (
    <Card title="Salary structure">
      {loading && !data ? <Spinner /> : (
        <Table head={['Employee', 'Basic', 'HRA (40%)', 'Medical (10%)', 'Gross', '']} empty={data?.data.length === 0 && <Empty title="No employees yet" hint="Salary is set when HR registers an employee." />}>
          {data?.data.map((e) => <tr key={e._id}><td className="td font-semibold">{e.name}<div className="text-xs text-ink-500">{e.code}</div></td><td className="td">{money(e.basic)}</td><td className="td">{money(e.basic * 0.4)}</td><td className="td">{money(e.basic * 0.1)}</td><td className="td font-semibold">{money(e.basic * 1.5)}</td><td className="td">{canEdit && <button className="btn-ghost" onClick={() => { setM(e); setBasic(e.basic); setErr(''); }}>Edit</button>}</td></tr>)}
        </Table>
      )}
      {m && <Modal title={`Salary: ${m.name}`} onClose={() => setM(null)}><ErrorBox error={err} /><Field label="Basic salary (monthly)"><input type="number" min="1" className="input" value={basic} onChange={(e) => setBasic(e.target.value)} /></Field><div className="mt-4 flex justify-end"><button className="btn-primary" onClick={save}>Save salary</button></div></Modal>}
    </Card>
  );
}
function Runs({ role }) {
  const toast = useToast();
  const [month, setMonth] = useState(monthNow()); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const list = useLoad(() => api.get('/payroll').then((r) => r.data));
  const run = useLoad(() => api.get(`/payroll/${month}`).then((r) => r.data).catch((e) => (e.response?.status === 404 ? null : Promise.reject(e))), [month]);
  const draft = async () => { setBusy(true); setErr(''); try { await api.post('/payroll/draft', { month }); toast('Payroll draft ready'); run.reload(); list.reload(); } catch (e) { setErr(errMsg(e)); } setBusy(false); };
  const finalize = async () => { if (!confirm(`Finalize payroll for ${month}? This locks the month and cannot be undone.`)) return; setBusy(true); setErr(''); try { await api.post(`/payroll/${month}/finalize`); toast('Payroll finalized'); run.reload(); list.reload(); } catch (e) { setErr(errMsg(e)); } setBusy(false); };
  const r = run.data;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <Field label="Month"><input type="month" className="input" max={monthNow()} value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        {role === 'hr' && <button className="btn-primary" disabled={busy || r?.status === 'finalized'} onClick={draft}>{r ? 'Refresh draft' : 'Create draft'}</button>}
        {role === 'admin' && r?.status === 'draft' && <button className="btn-primary" disabled={busy} onClick={finalize}>Finalize and lock</button>}
        {r && <Badge>{r.status}</Badge>}
      </div>
      <ErrorBox error={err || run.error} />
      <Card title={`Payroll ${month}`}>
        {run.loading && !r ? <Spinner /> : !r ? <Empty title="No payroll run for this month" hint={role === 'hr' ? 'Create a draft. It uses attendance and approved leave from this month.' : 'HR prepares the draft; you finalize it here.'} /> : (
          <>
            <p className="mb-3 text-sm text-ink-500">{r.workingDays} working days. Gross = 1.5 x basic. Deductions cover absent days, unpaid leave and half days.</p>
            <Table head={['Employee', 'Gross', 'Absent', 'Unpaid', 'Half', 'Deduction', 'Tax', 'Net pay', '']}>
              {r.items.map((i) => <tr key={i.employee}><td className="td font-semibold">{i.name}<div className="text-xs text-ink-500">{i.department}</div></td><td className="td">{money(i.gross)}</td><td className="td">{i.absent}</td><td className="td">{i.unpaid}</td><td className="td">{i.half}</td><td className="td">{money(i.deduction)}</td><td className="td">{money(i.tax)}</td><td className="td font-bold">{money(i.net)}</td><td className="td"><button className="btn-ghost" onClick={() => download(`/payroll/${month}/slip/${i.employee}/pdf`, `payslip-${i.code}-${month}.pdf`).catch((e) => toast(errMsg(e), 'err'))}>PDF</button></td></tr>)}
            </Table>
            <div className="mt-3 flex justify-end gap-6 text-sm"><span>Total gross: <b>{money(r.items.reduce((a, i) => a + i.gross, 0))}</b></span><span>Total net: <b>{money(r.items.reduce((a, i) => a + i.net, 0))}</b></span></div>
          </>
        )}
      </Card>
      <Card title="All runs">{list.data?.length ? <Table head={['Month', 'Status', 'Employees', 'Gross', 'Net']}>{list.data.map((x) => <tr key={x.month} className="cursor-pointer hover:bg-ink-50" onClick={() => setMonth(x.month)}><td className="td">{x.month}</td><td className="td"><Badge>{x.status}</Badge></td><td className="td">{x.employees}</td><td className="td">{money(x.gross)}</td><td className="td">{money(x.net)}</td></tr>)}</Table> : <Empty title="No payroll runs yet" />}</Card>
      <Salaries canEdit={role === 'hr'} />
    </div>
  );
}
function Payslips() {
  const toast = useToast();
  const { data, loading, error } = useLoad(() => api.get('/payroll/slips/mine').then((r) => r.data));
  const { user } = useAuth();
  if (loading && !data) return <Spinner />;
  return (
    <Card title="My payslips"><ErrorBox error={error} />
      {data?.length ? <Table head={['Month', 'Gross', 'Deductions', 'Tax', 'Net pay', '']}>{data.map((p) => <tr key={p.month}><td className="td font-semibold">{p.month}</td><td className="td">{money(p.gross)}</td><td className="td">{money(p.deduction)}</td><td className="td">{money(p.tax)}</td><td className="td font-bold">{money(p.net)}</td><td className="td"><button className="btn-primary" onClick={() => download(`/payroll/${p.month}/slip/${user.employee}/pdf`, `payslip-${p.month}.pdf`).catch((e) => toast(errMsg(e), 'err'))}>Download PDF</button></td></tr>)}</Table>
        : <Empty title="No payslips yet" hint="Your payslip appears here once Admin finalizes the month's payroll." />}
    </Card>
  );
}
export default function Payroll() {
  const { user } = useAuth();
  return (<><h1 className="mb-4 text-xl font-extrabold">{user.role === 'employee' ? 'Payslips' : 'Payroll'}</h1>{user.role === 'employee' ? <Payslips /> : <Runs role={user.role} />}</>);
}
