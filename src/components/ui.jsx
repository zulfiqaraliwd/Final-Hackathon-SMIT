import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-');
export const money = (n) => (n == null ? '-' : Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 }));
export const today = () => new Date().toLocaleDateString('en-CA');
export const monthNow = () => today().slice(0, 7);

const tones = {
  green: 'bg-teal-soft text-teal-dark', amber: 'bg-amber-soft text-amber', rose: 'bg-rose-soft text-rose', plum: 'bg-plum-soft text-plum', gray: 'bg-ink-100 text-ink-700',
};
const statusTone = { present: 'green', approved: 'green', finalized: 'green', active: 'green', late: 'amber', half_day: 'amber', pending: 'amber', draft: 'amber', probation: 'amber', not_checked_in: 'gray',
  absent: 'rose', rejected: 'rose', missing_checkout: 'rose', exited: 'rose', cancelled: 'gray', on_leave: 'plum', holiday: 'plum', weekend: 'gray', off_day: 'gray', upcoming: 'gray', 'n/a': 'gray' };
export const Badge = ({ children, tone }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone || statusTone[children] || 'gray']}`}>{String(children).replace(/_/g, ' ')}</span>
);
export const Card = ({ title, action, children, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || action) && <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3"><h3 className="text-sm font-bold">{title}</h3>{action}</div>}
    <div className="p-4">{children}</div>
  </section>
);
export const Stat = ({ label, value, hint, tone = 'text-ink' }) => (
  <div className="card p-4"><div className="text-xs font-medium text-ink-500">{label}</div><div className={`mt-1 text-2xl font-extrabold ${tone}`}>{value ?? '-'}</div>{hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}</div>
);
export const Field = ({ label, children, hint }) => (
  <label className="block text-sm"><span className="mb-1 block font-semibold text-ink-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}</label>
);
export const Empty = ({ title, hint }) => (<div className="py-10 text-center"><div className="text-sm font-semibold text-ink-700">{title}</div>{hint && <div className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{hint}</div>}</div>);
export const Spinner = () => <div className="py-10 text-center text-sm text-ink-500" role="status">Loading...</div>;
export const ErrorBox = ({ error }) => error ? <div role="alert" className="rounded-md bg-rose-soft px-3 py-2 text-sm text-rose">{error}</div> : null;
export const Table = ({ head, children, empty }) => (
  <div className="overflow-x-auto"><table className="w-full min-w-[560px]"><thead className="border-b border-ink-100"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody className="divide-y divide-ink-100">{children}</tbody></table>{empty}</div>
);
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3"><h2 className="font-bold">{title}</h2><button className="btn-ghost !px-2 !py-1" onClick={onClose} aria-label="Close">Close</button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export const Pager = ({ page, pages, onChange }) => pages > 1 && (
  <div className="flex items-center justify-end gap-2 pt-3 text-sm"><button className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span className="text-ink-500">Page {page} of {pages}</span><button className="btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div>
);

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, kind = 'ok') => { const id = Math.random(); setList((l) => [...l, { id, msg, kind }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4000); }, []);
  return (
    <ToastCtx.Provider value={push}>{children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2" aria-live="polite">{list.map((t) => <div key={t.id} className={`max-w-xs rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${t.kind === 'err' ? 'bg-rose' : 'bg-ink'}`}>{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}
// small data hook
export function useLoad(fn, deps = []) {
  const [state, set] = useState({ data: null, loading: true, error: '' });
  const reload = useCallback(() => { set((s) => ({ ...s, loading: true })); return fn().then((data) => set({ data, loading: false, error: '' })).catch((e) => set({ data: null, loading: false, error: e.response?.data?.message || e.message })); }, deps); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}
