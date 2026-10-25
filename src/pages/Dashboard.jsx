import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Empty, ErrorBox, Field, Spinner, Stat, money, useLoad, fmtDate, fmtTime, today } from '../components/ui';
import CheckInCard from '../components/CheckInCard';

const COLORS = ['#0d8f7d', '#5a4bc2', '#d98b1f', '#c9453f', '#51636c', '#7bc8bb'];
const Chart = ({ children, h = 220 }) => <div style={{ height: h }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
const NoData = () => <Empty title="No data yet" hint="Numbers appear here as employees check in, apply for leave and payroll is run." />;

function Filters({ f, setF, depts }) {
  return (
    <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
      <Field label="From"><input type="date" className="input" value={f.from} max={f.to} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
      <Field label="To"><input type="date" className="input" value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      <Field label="Department"><select className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">All departments</option>{depts?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
    </div>
  );
}
function Summary({ f, dashboard }) {
  const [out, setOut] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const run = async () => { setBusy(true); setErr(''); try { const { data } = await api.post('/ai/summary', { ...f, dashboard }); setOut(data.summary); } catch (e) { setErr(errMsg(e)); } setBusy(false); };
  return (
    <Card title="AI summary" action={<button className="btn-ai" onClick={run} disabled={busy}>{busy ? 'Summarizing...' : 'Summarize'}</button>}>
      <ErrorBox error={err} />
      {!out && !err && <p className="text-sm text-ink-500">Get 3 to 5 insights based on the numbers for the filters above.</p>}
      {out && <><div className="whitespace-pre-wrap text-sm leading-relaxed">{out}</div><div className="mt-2 text-xs text-plum">AI-generated</div></>}
    </Card>
  );
}
const useFilters = () => { const t = today(); return useState({ from: t.slice(0, 8) + '01', to: t, department: '' }); };

function HRDash() {
  const [f, setF] = useFilters();
  const depts = useLoad(() => api.get('/org/departments').then((r) => r.data));
  const { data: d, loading, error } = useLoad(() => api.get('/analytics/hr', { params: f }).then((r) => r.data), [f.from, f.to, f.department]);
  const k = d?.kpis;
  return (
    <>
      <Filters f={f} setF={setF} depts={depts.data} />
      <ErrorBox error={error} />
      {loading && !d ? <Spinner /> : d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Headcount" value={k.headcount} /><Stat label="Present today" value={k.presentToday} tone="text-teal" /><Stat label="On leave today" value={k.onLeaveToday} tone="text-plum" />
            <Stat label="Late today" value={k.lateToday} tone="text-amber" /><Stat label="Pending approvals" value={k.pendingApprovals} hint={<Link className="text-teal" to="/leave">Review</Link>} />
          </div>
          <div className="grid grid-cols-2 gap-3"><Stat label="Attendance rate (period)" value={k.attendanceRate + '%'} /><Stat label="Late % (period)" value={k.latePercent + '%'} /></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Attendance trend">{d.attendanceTrend.length ? <Chart><LineChart data={d.attendanceTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e3e9ea" /><XAxis dataKey="date" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip /><Line dataKey="rate" name="Rate %" stroke="#0d8f7d" strokeWidth={2} dot={false} /></LineChart></Chart> : <NoData />}</Card>
            <Card title="Absenteeism by department (%)">{d.absenteeismByDept.length ? <Chart><BarChart data={d.absenteeismByDept}><CartesianGrid strokeDasharray="3 3" stroke="#e3e9ea" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="percent" name="Absent %" fill="#c9453f" radius={[4, 4, 0, 0]} /></BarChart></Chart> : <NoData />}</Card>
            <Card title="Leave days by type">{d.leaveByType.length ? <Chart><PieChart><Pie data={d.leaveByType} dataKey="days" nameKey="name" outerRadius={80} label>{d.leaveByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></Chart> : <NoData />}</Card>
            <Card title="Top 5 late-comers">{d.topLateComers.length ? <ol className="space-y-2 text-sm">{d.topLateComers.map((l) => <li key={l.code} className="flex justify-between"><span>{l.name} <span className="text-ink-500">{l.department}</span></span><Badge tone="amber">{l.lateDays} late</Badge></li>)}</ol> : <NoData />}</Card>
          </div>
          <Summary f={f} dashboard="hr" />
        </div>
      )}
    </>
  );
}
function AdminDash() {
  const [f, setF] = useFilters();
  const depts = useLoad(() => api.get('/org/departments').then((r) => r.data));
  const { data: d, loading, error } = useLoad(() => api.get('/analytics/admin', { params: f }).then((r) => r.data), [f.from, f.to, f.department]);
  const k = d?.kpis;
  return (
    <>
      <Filters f={f} setF={setF} depts={depts.data} />
      <ErrorBox error={error} />
      {loading && !d ? <Spinner /> : d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Headcount" value={k.headcount} /><Stat label="Attrition YTD" value={k.attritionYTD + '%'} hint={`${k.exitsYTD} exit(s)`} />
            <Stat label="Payroll cost (gross)" value={money(k.payrollCost)} hint="Runs in selected period" /><Stat label="Average salary (gross)" value={money(k.avgSalary)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Headcount by department">{d.headcountByDept.length ? <Chart><BarChart data={d.headcountByDept}><CartesianGrid strokeDasharray="3 3" stroke="#e3e9ea" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Employees" fill="#0d8f7d" radius={[4, 4, 0, 0]} /></BarChart></Chart> : <NoData />}</Card>
            <Card title="Payroll cost by department (latest run)">{d.payrollCostByDept.length ? <Chart><BarChart data={d.payrollCostByDept}><CartesianGrid strokeDasharray="3 3" stroke="#e3e9ea" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => money(v)} /><Bar dataKey="value" name="Gross" fill="#5a4bc2" radius={[4, 4, 0, 0]} /></BarChart></Chart> : <NoData />}</Card>
            <Card title="Gender">{d.gender.length ? <Chart h={200}><PieChart><Pie data={d.gender} dataKey="value" nameKey="name" outerRadius={70} label>{d.gender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></Chart> : <NoData />}</Card>
            <Card title="Tenure">{d.tenure.length ? <Chart h={200}><BarChart data={d.tenure}><CartesianGrid strokeDasharray="3 3" stroke="#e3e9ea" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Employees" fill="#d98b1f" radius={[4, 4, 0, 0]} /></BarChart></Chart> : <NoData />}</Card>
          </div>
          <Card title="Recent activity" action={<Link to="/audit" className="text-sm font-semibold text-teal">Full audit log</Link>}>
            {d.auditFeed.length ? <ul className="divide-y divide-ink-100 text-sm">{d.auditFeed.map((a) => <li key={a._id} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{a.actorName}</b> {a.action.replace(/_/g, ' ')} {a.entity.replace(/_/g, ' ')}</span><span className="text-ink-500">{fmtDate(a.createdAt)} {fmtTime(a.createdAt)}</span></li>)}</ul> : <NoData />}
          </Card>
          <Summary f={f} dashboard="admin" />
        </div>
      )}
    </>
  );
}
function EmployeeDash() {
  const { data: d, loading, error, reload } = useLoad(() => api.get('/analytics/me').then((r) => r.data));
  if (loading && !d) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const left = (key) => d.balances.find((b) => b.key === key);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1"><CheckInCard onChange={reload} /></div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Stat label="Hours this week" value={`${d.hoursThisWeek} / 40`} /><Stat label="Late this month" value={d.lateCount} tone="text-amber" />
          <Stat label="Casual left" value={left('casual')?.remaining ?? '-'} /><Stat label="Annual left" value={left('annual')?.remaining ?? '-'} />
          <Stat label="Sick left" value={left('sick')?.remaining ?? '-'} />
          <Stat label="Last payslip" value={d.lastPayslip ? money(d.lastPayslip.net) : '-'} hint={d.lastPayslip ? d.lastPayslip.month : 'None yet'} />
        </div>
      </div>
      <Card title="Announcements" action={<Link to="/announcements" className="text-sm font-semibold text-teal">View all</Link>}>
        {d.announcements.length ? d.announcements.map((a) => <div key={a._id} className="border-b border-ink-100 py-2 last:border-0"><div className="font-semibold">{a.title}</div><div className="text-sm text-ink-700">{a.body}</div><div className="text-xs text-ink-500">{a.authorName}, {fmtDate(a.createdAt)}</div></div>) : <Empty title="No announcements" hint="Company news from HR will show up here." />}
      </Card>
    </div>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  return (<><h1 className="mb-4 text-xl font-extrabold">{user.role === 'admin' ? 'Company dashboard' : user.role === 'hr' ? 'HR dashboard' : `Hello, ${user.name.split(' ')[0]}`}</h1>{user.role === 'admin' ? <AdminDash /> : user.role === 'hr' ? <HRDash /> : <EmployeeDash />}</>);
}
