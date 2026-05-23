import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import PendingDONs from './pages/PendingDONs';
import PendingSPOs from './pages/PendingSPOs';
import Shipments from './pages/Shipments';
import GRN from './pages/GRN';
import Reports from './pages/Reports';
import UsersSettings from './pages/settings/Users';
import PermissionsSettings from './pages/settings/Permissions';
import MastersSettings from './pages/settings/Masters';
import NotFound from './pages/NotFound';

function ProtectedRoute() {
  const token = useSelector(s => s.auth.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestRoute() {
  const token = useSelector(s => s.auth.token);
  return token ? <Navigate to="/" replace /> : <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [{ path: '/login', element: <Login /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <Layout />,
      children: [
        { index: true,              element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard',        element: <Dashboard /> },
        { path: 'orders',           element: <Orders /> },
        { path: 'orders/:id',       element: <OrderDetail /> },
        { path: 'dons',             element: <PendingDONs /> },
        { path: 'spos',             element: <PendingSPOs /> },
        { path: 'shipments',        element: <Shipments /> },
        { path: 'grn',              element: <GRN /> },
        { path: 'reports',          element: <Reports /> },
        { path: 'settings/users',   element: <UsersSettings /> },
        { path: 'settings/permissions', element: <PermissionsSettings /> },
        { path: 'settings/masters', element: <MastersSettings /> },
      ],
    }],
  },
  { path: '*', element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
