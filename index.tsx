/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const start = () => ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// `npm run dev:demo`: sample answers instead of the bank's servers (local only, never in a build)
if (import.meta.env.DEV && import.meta.env.MODE === 'demo') {
  import('./dev/mockApi').then(m => { m.installMockApi(); start(); });
} else {
  start();
}
