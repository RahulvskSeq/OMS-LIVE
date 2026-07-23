/* Redux store for the React app. Slices are added as screens are ported. */
import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import orders from './ordersSlice';
import masters from './mastersSlice';
import dashboard from './dashboardSlice';

export const store = configureStore({
  reducer: {
    auth,
    orders,
    masters,
    dashboard,
  },
});
