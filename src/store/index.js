import { configureStore } from '@reduxjs/toolkit';
import authReducer       from './slices/authSlice';
import orderReducer      from './slices/orderSlice';
import dashboardReducer  from './slices/dashboardSlice';
import uiReducer         from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    orders:    orderReducer,
    dashboard: dashboardReducer,
    ui:        uiReducer,
  },
});
