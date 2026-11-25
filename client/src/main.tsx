import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App';
import { applyAppearance } from './shared/lib/appearance';
import { loadToken } from './shared/lib/token';

applyAppearance();
await loadToken();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
