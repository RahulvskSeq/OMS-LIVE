/* Router for the React app.
 * HashRouter (#/login, #/dashboard, …) so it works on any static host and the
 * backend one-server mode WITHOUT server rewrites.
 *
 * Every screen has a route; those not yet ported render <Placeholder/> inside
 * the real app shell, and are swapped for their real component one at a time. */
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from '../pages/Login.jsx';
import Layout from './Layout.jsx';
import Placeholder from './Placeholder.jsx';
import Orders from './Orders.jsx';
import Dashboard from './Dashboard.jsx';
import Pending from './Pending.jsx';
import Shipments from './Shipments.jsx';
import Deliveries from './Deliveries.jsx';
import Masters from './Masters.jsx';
import Users from './Users.jsx';
import Roles from './Roles.jsx';
import Departments from './Departments.jsx';
import Reports from './Reports.jsx';
import Settings from './Settings.jsx';

function Protected({ children }) {
  const token = useSelector((s) => s.auth.token);
  return token ? children : <Navigate to="/login" replace />;
}
function GuestOnly({ children }) {
  const token = useSelector((s) => s.auth.token);
  return token ? <Navigate to="/dashboard" replace /> : children;
}

// path → title. Real components replace the Placeholder as screens are ported.
const SCREENS = [
  ['dashboard', 'Dashboard'],
  ['orders', 'Orders'],
  ['vendorpo', 'Supplier PO'],
  ['intransit', 'Mark In Transit'],
  ['pending-don', 'Pending DONs'],
  ['pending-vpo', 'Pending SPOs'],
  ['pending-supplier', 'Pending by Supplier'],
  ['ship-intransit', 'In Transit'],
  ['ship-transporter', 'At Transporter'],
  ['ship-warehouse', 'Warehouse'],
  ['deliv-grn', 'GRN'],
  ['deliv-purchased', 'Purchased'],
  ['deliv-billed', 'Billed'],
  ['deliv-cancelled', 'Cancelled'],
  ['products', 'Product Master'],
  ['customers', 'Customer Master'],
  ['vendors', 'Supplier Master'],
  ['transporters', 'Transporter Master'],
  ['reports', 'Reports'],
  ['departments', 'Departments'],
  ['roles', 'Role Management'],
  ['users', 'User Management'],
  ['backend', 'Backend / Settings'],
];

// Screens ported to real React components (the rest fall back to Placeholder).
const PORTED = {
  dashboard: <Dashboard />,
  orders: <Orders />,
  'pending-don': <Pending mode="don" />,
  'pending-vpo': <Pending mode="spo" />,
  'pending-supplier': <Pending mode="supplier" />,
  'ship-intransit': <Shipments status="In Transit" />,
  'ship-transporter': <Shipments status="At Transporter" />,
  'ship-warehouse': <Shipments status="Warehouse" />,
  'deliv-grn': <Deliveries status="GRN" />,
  'deliv-purchased': <Deliveries status="Purchased" />,
  'deliv-billed': <Deliveries status="Billed" />,
  'deliv-cancelled': <Deliveries status="Cancelled" />,
  products: <Masters type="products" />,
  customers: <Masters type="customers" />,
  vendors: <Masters type="vendors" />,
  transporters: <Masters type="transporters" />,
  users: <Users />,
  roles: <Roles />,
  departments: <Departments />,
  reports: <Reports />,
  backend: <Settings />,
};

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {SCREENS.map(([path, title]) => (
            <Route
              key={path}
              path={path}
              element={PORTED[path] ? PORTED[path] : <Placeholder title={title} />}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
