import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import { fmtDate } from './ui';
import AIChat from './AIChat';

const NAV = {
  admin: [['/', 'Dashboard'], ['/employees', 'Employees'], ['/attendance', 'Attendance'], ['/leave', 'Leave'], ['/payroll', 'Payroll'], ['/organization', 'Organization'], ['/announcements', 'Announcements'], ['/audit', 'Audit log']],
  hr: [['/', 'Dashboard'], ['/employees', 'Employees'], ['/attendance', 'Attendance'], ['/leave', 'Leave requests'], ['/payroll', 'Payroll'], ['/organization', 'Company setup'], ['/announcements', 'Announcements']],
  employee: [['/', 'My dashboard'], ['/attendance', 'My attendance'], ['/leave', 'My leave'], ['/payroll', 'Payslips'], ['/profile', 'My profile'], ['/announcements', 'Announcements']],
};
export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [notes, setNotes] = useState({ list: [], unread: 0 });
  const [company, setCompany] = useState('');
  const load = () => api.get('/comms/notifications').then((r) => setNotes(r.data)).catch(() => {});
  useEffect(() => { load(); api.get('/org/settings').then((r) => setCompany(r.data.companyName)).catch(() => {}); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  const readAll = async () => { await api.post('/comms/notifications/read-all'); load(); };
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 transform bg-ink text-white transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5"><div className="text-lg font-extrabold">HCM Lite</div><div className="truncate text-xs text-ink-300">{company || 'Your company'}</div></div>
        <nav className="space-y-0.5 px-3" aria-label="Main">
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-teal text-white' : 'text-ink-100 hover:bg-ink-700'}`}>{label}</NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-ink-700 p-4">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="mb-2 text-xs capitalize text-ink-300">{user.role}</div>
          <button className="btn w-full bg-ink-700 text-white hover:bg-ink-500" onClick={() => { logout(); nav('/login'); }}>Log out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white px-4 py-2.5">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">Menu</button>
          <div className="hidden text-sm text-ink-500 lg:block">{fmtDate(new Date().toISOString())}</div>
          <div className="relative">
            <button className="btn-ghost" onClick={() => { setBell(!bell); load(); }} aria-label="Notifications">Notifications{notes.unread > 0 && <span className="rounded-full bg-rose px-1.5 text-xs text-white">{notes.unread}</span>}</button>
            {bell && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-ink-100 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2"><span className="text-sm font-bold">Notifications</span><button className="text-xs font-semibold text-teal" onClick={readAll}>Mark all read</button></div>
                <div className="max-h-80 overflow-y-auto">
                  {notes.list.length === 0 && <div className="p-4 text-sm text-ink-500">Nothing new. Leave decisions and payslips will show up here.</div>}
                  {notes.list.map((n) => <div key={n._id} className={`border-b border-ink-100 px-3 py-2 text-sm ${n.read ? '' : 'bg-teal-soft'}`}><div className="font-semibold">{n.title}</div><div className="text-ink-700">{n.body}</div><div className="text-xs text-ink-500">{fmtDate(n.createdAt)}</div></div>)}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
      </div>
      <AIChat />
    </div>
  );
}
