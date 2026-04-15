import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initStorage } from './lib/storage';
import App from './App';

// Bootstrap localStorage keys once, before the first render.
// Safe to call on every page load — existing data is never overwritten.
initStorage();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
