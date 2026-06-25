import api from './axios';

const crud = (base) => ({
  getAll:  (p)     => api.get(base, { params: p }),
  getOne:  (id)    => api.get(`${base}/${id}`),
  create:  (d)     => api.post(base, d),
  update:  (id, d) => api.put(`${base}/${id}`, d),
  delete:  (id)    => api.delete(`${base}/${id}`),
});

export const customerApi    = crud('/customers');
export const supplierApi    = crud('/suppliers');
export const productApi     = crud('/products');
export const transporterApi = crud('/transporters');

export const userApi = {
  getAll:           (p)     => api.get('/users', { params: p }),
  getOne:           (id)    => api.get(`/users/${id}`),
  create:           (d)     => api.post('/users', d),
  update:           (id, d) => api.put(`/users/${id}`, d),
  delete:           (id)    => api.delete(`/users/${id}`),
  resetPassword:    (id, d) => api.patch(`/users/${id}/reset-password`, d),
  setPermissions:   (id, d) => api.patch(`/users/${id}/permissions`, d),
  copyPermissions:  (d)     => api.post('/users/copy-permissions', d),
};

export const permissionApi = {
  getMatrix:   ()       => api.get('/permissions/matrix'),
  getAllKeys:   ()       => api.get('/permissions/all-keys'),
  getRoles:    ()       => api.get('/permissions/roles'),
  getRole:     (name)   => api.get(`/permissions/roles/${name}`),
  updateRole:  (name,d) => api.put(`/permissions/roles/${name}`, d),
  toggle:      (name,d) => api.patch(`/permissions/roles/${name}/toggle`, d),
};

export const donApi = {
  getAll:  (p)     => api.get('/dons', { params: p }),
  approve: (id, d) => api.patch(`/dons/${id}/approve`, d),
};

export const spoApi = {
  getAll:  (p)     => api.get('/spos', { params: p }),
  raisePo: (id, d) => api.patch(`/spos/${id}/raise-po`, d),
};

export const shipmentApi = {
  getAll:   (p)     => api.get('/shipments', { params: p }),
  dispatch: (id, d) => api.patch(`/shipments/${id}/dispatch`, d),
  arrived:  (id, d) => api.patch(`/shipments/${id}/arrived`, d),
};

export const grnApi = {
  getAll:    (p)     => api.get('/grns', { params: p }),
  raiseGrn:  (id, d) => api.patch(`/grns/${id}`, d),
  purchase:  (id, d) => api.patch(`/grns/${id}/purchase`, d),
};

export const reportApi = {
  orders:        (p) => api.get('/reports/orders', { params: p }),
  exportOrders:  (p) => api.get('/reports/orders/export', { params: p, responseType: 'blob' }),
  exportEta:     (p) => api.get('/reports/eta-edited/export', { params: p, responseType: 'blob' }),
  exportDealers: (p) => api.get('/reports/dealer-summary/export', { params: p, responseType: 'blob' }),
};
