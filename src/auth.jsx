import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('hcm_token'));
  const refresh = useCallback(async () => {
    try { const { data } = await api.get('/auth/me'); setUser(data.user); } catch { setUser(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (localStorage.getItem('hcm_token')) refresh(); }, [refresh]);
  const login = (token, u) => { localStorage.setItem('hcm_token', token); setUser(u); };
  const logout = () => { localStorage.removeItem('hcm_token'); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}
