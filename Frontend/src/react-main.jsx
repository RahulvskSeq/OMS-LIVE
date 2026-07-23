/* Entry for the TRUE React app (app.html → #root).
 * React renders the entire UI here. Reuses the existing design system
 * (legacy/styles.css) so ported screens look identical to the live app. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './react/store.js';
import App from './react/App.jsx';
import * as ordersSlice from './react/ordersSlice.js';
import '../legacy/styles.css';

// Dev-only test hooks (stripped from production builds).
if (import.meta.env.DEV) {
  window.__store = store;
  window.__ordersSlice = ordersSlice;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
