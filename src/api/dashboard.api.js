import api from './axios';
export const dashboardApi = {
  summary:         () => api.get('/dashboard/summary'),
  pipeline:        () => api.get('/dashboard/pipeline'),
  recentOrders:    () => api.get('/dashboard/recent-orders'),
  dueOrders:       () => api.get('/dashboard/due-orders'),
  purchased:       () => api.get('/dashboard/purchased'),
  lrAtTransporter: () => api.get('/dashboard/lr-at-transporter'),
  etaEdited:       () => api.get('/dashboard/eta-edited'),
  dealerSummary:   () => api.get('/dashboard/dealer-summary'),
  supplierSummary: () => api.get('/dashboard/supplier-summary'),
};
