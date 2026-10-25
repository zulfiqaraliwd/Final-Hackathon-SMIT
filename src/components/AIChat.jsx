import { useRef, useState, useEffect } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';

const HINTS = { employee: ['How many sick leaves do I have left?', 'What is the late policy?'], hr: ['Who is on leave today?', 'Who came late most often this month?', 'What is this month\'s attendance rate?'], admin: ['How many active employees do we have?', 'Show this month\'s payroll summary'] };
export default function AIChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
  const send = async (q) => {
    const m = (q ?? text).trim(); if (!m || busy) return;
    setText(''); setMsgs((x) => [...x, { role: 'me', t: m }]); setBusy(true);
    try { const { data } = await api.post('/ai/chat', { message: m }); setMsgs((x) => [...x, { role: 'ai', t: data.answer }]); }
    catch (e) { setMsgs((x) => [...x, { role: 'err', t: errMsg(e) }]); }
    setBusy(false);
  };
  return (
    <>
      <button onClick={() => setOpen(!open)} className="btn-ai fixed bottom-4 left-4 z-40 shadow-lg lg:left-auto lg:right-4" aria-expanded={open}>Ask assistant</button>
      {open && (
        <div className="fixed inset-x-2 bottom-16 z-40 flex h-[70vh] max-h-[560px] flex-col rounded-xl border border-ink-100 bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:w-96" role="dialog" aria-label="AI assistant">
          <div className="border-b border-ink-100 px-4 py-3"><div className="font-bold">Assistant</div><div className="text-xs text-ink-500">Answers from your data and company policy. You see only what your role allows.</div></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {msgs.length === 0 && <div className="space-y-2"><div className="text-ink-500">Try asking:</div>{HINTS[user.role].map((h) => <button key={h} className="block w-full rounded-md border border-ink-100 px-3 py-2 text-left hover:bg-ink-50" onClick={() => send(h)}>{h}</button>)}</div>}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'me' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left ${m.role === 'me' ? 'bg-teal text-white' : m.role === 'err' ? 'bg-rose-soft text-rose' : 'bg-plum-soft text-ink'}`}>{m.t}</div>
                {m.role === 'ai' && <div className="mt-0.5 text-xs text-plum">AI-generated</div>}
              </div>
            ))}
            {busy && <div className="text-ink-500">Thinking...</div>}
            <div ref={end} />
          </div>
          <form className="flex gap-2 border-t border-ink-100 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" maxLength={500} aria-label="Question" />
            <button className="btn-ai" disabled={busy || !text.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
