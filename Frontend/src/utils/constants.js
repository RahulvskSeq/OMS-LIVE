export const ORDER_STATUSES = [
  'Order','Approved','PO Raised','In Transit','At Transporter','Warehouse','GRN','Purchased','Billed','Delivered','Cancelled'
];

export const STATUS_COLORS = {
  'Order':          { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'Approved':       { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'PO Raised':      { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  'In Transit':     { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'At Transporter': { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  'Warehouse':      { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  'GRN':            { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  'Purchased':      { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'Billed':         { bg: '#fdf4ff', text: '#6b21a8', border: '#e9d5ff' },
  'Delivered':      { bg: '#f0fdf4', text: '#14532d', border: '#86efac' },
  'Cancelled':      { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
};

export const ROLES = ['superadmin','admin','manager','logistics','purchase','biller','salesman'];

export const ROLE_LABELS = {
  superadmin: 'Super Admin', admin: 'Admin', manager: 'Manager',
  logistics: 'Logistics', purchase: 'Purchase', biller: 'Biller', salesman: 'Salesman',
};

export const ROLE_COLORS = {
  superadmin: 'bg-red-100 text-red-700',
  admin:      'bg-purple-100 text-purple-700',
  manager:    'bg-blue-100 text-blue-700',
  logistics:  'bg-amber-100 text-amber-700',
  purchase:   'bg-emerald-100 text-emerald-700',
  biller:     'bg-cyan-100 text-cyan-700',
  salesman:   'bg-slate-100 text-slate-700',
};
