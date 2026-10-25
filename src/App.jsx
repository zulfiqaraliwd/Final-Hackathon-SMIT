import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { Login, Setup, ChangePassword } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Employees, { EmployeeDetail } from './pages/Employees';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Payroll from './pages/Payroll';
import Organization from './pages/Organization';
import { Announcements, Audit, Profile } from './pages/Misc';

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Guard roles={['hr', 'admin']}><Employees /></Guard>} />
        <Route path="employees/:id" element={<Guard roles={['hr', 'admin']}><EmployeeDetail /></Guard>} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leave" element={<Leave />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="organization" element={<Guard roles={['hr', 'admin']}><Organization /></Guard>} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="audit" element={<Guard roles={['admin']}><Audit /></Guard>} />
        <Route path="profile" element={<Guard roles={['employee']}><Profile /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
