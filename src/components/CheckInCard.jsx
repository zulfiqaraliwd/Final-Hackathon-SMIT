import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api';
import { Badge, Card, ErrorBox, Modal, fmtTime, useToast } from './ui';

// Optional camera check-in: face detection (browser FaceDetector API) + GPS. The server decides.
function CameraModal({ onClose, onDone }) {
  const video = useRef(); const stream = useRef(); const toast = useToast();
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const supported = 'FaceDetector' in window;
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } }).then((s) => { stream.current = s; video.current.srcObject = s; }).catch(() => setErr('Camera permission is needed for this check-in.'));
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  const go = async () => {
    setBusy(true); setErr('');
    try {
      const faces = await new window.FaceDetector({ fastMode: true }).detect(video.current);
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, () => rej(new Error('Location permission is needed.')), { enableHighAccuracy: true, timeout: 10000 }));
      await api.post('/attendance/check-in', { method: 'camera', faceCount: faces.length, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      toast('Checked in with camera'); onDone();
    } catch (e) { setErr(e.response ? errMsg(e) : e.message); }
    setBusy(false);
  };
  return (
    <Modal title="Camera check-in" onClose={onClose}>
      <p className="mb-3 text-sm text-ink-500">We check that one face is in view and that you are inside the office area. No photo is stored.</p>
      <video ref={video} autoPlay playsInline muted className="mb-3 w-full rounded-lg bg-ink" />
      {!supported && <ErrorBox error="Face detection is not supported in this browser. Use Chrome, or use the normal check-in." />}
      <ErrorBox error={err} />
      <button className="btn-primary mt-3 w-full" disabled={!supported || busy} onClick={go}>{busy ? 'Checking...' : 'Check in'}</button>
    </Modal>
  );
}
export default function CheckInCard({ onChange }) {
  const toast = useToast();
  const [rec, setRec] = useState(undefined); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [cam, setCam] = useState(false);
  const load = () => api.get('/attendance/today').then((r) => setRec(r.data || null));
  useEffect(() => { load(); }, []);
  const act = async (path, msg) => {
    setBusy(true); setErr('');
    try { await api.post(path); toast(msg); await load(); onChange?.(); } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  return (
    <Card title="Today">
      <ErrorBox error={err} />
      {rec === undefined ? <p className="text-sm text-ink-500">Loading...</p> : (
        <div className="space-y-3">
          <div className="text-sm">
            {rec ? <>Checked in at <b>{fmtTime(rec.checkIn)}</b> <Badge>{rec.status}</Badge>{rec.checkOut && <><br />Checked out at <b>{fmtTime(rec.checkOut)}</b> ({rec.hours} h)</>}</> : 'You have not checked in yet.'}
          </div>
          {!rec && <><button className="btn-primary w-full" disabled={busy} onClick={() => act('/attendance/check-in', 'Checked in')}>Check in</button><button className="btn-ghost w-full" onClick={() => setCam(true)}>Check in with camera and location</button></>}
          {rec && !rec.checkOut && <button className="btn-primary w-full" disabled={busy} onClick={() => act('/attendance/check-out', 'Checked out')}>Check out</button>}
          {rec?.checkOut && <p className="text-sm text-ink-500">You are done for today.</p>}
        </div>
      )}
      {cam && <CameraModal onClose={() => setCam(false)} onDone={() => { setCam(false); load(); onChange?.(); }} />}
    </Card>
  );
}
