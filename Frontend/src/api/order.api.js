import api from './axios';
export const orderApi = {
  getAll:       (p)       => api.get('/orders', { params: p }),
  getOne:       (id)      => api.get(`/orders/${id}`),
  create:       (d)       => api.post('/orders', d),
  update:       (id, d)   => api.put(`/orders/${id}`, d),
  updateStatus: (id, d)   => api.patch(`/orders/${id}/status`, d),
  updateEta:    (id, d)   => api.patch(`/orders/${id}/eta`, d),
  addComment:   (id, d)   => api.post(`/orders/${id}/comment`, d),
  raiseGrn:     (id, d)   => api.patch(`/orders/${id}/grn`, d),
  addBilling:   (id, d)   => api.patch(`/orders/${id}/billing`, d),
  markDelivered:(id, d)   => api.patch(`/orders/${id}/delivery`, d),
  split:        (id, d)   => api.post(`/orders/${id}/split`, d),
  getTrail:     (id)      => api.get(`/orders/${id}/trail`),
  delete:       (id)      => api.delete(`/orders/${id}`),
};
