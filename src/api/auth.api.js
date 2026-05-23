import api from './axios';
export const authApi = {
  login:          (d)  => api.post('/auth/login', d),
  me:             ()   => api.get('/auth/me'),
  changePassword: (d)  => api.post('/auth/change-password', d),
  refresh:        ()   => api.post('/auth/refresh'),
};
