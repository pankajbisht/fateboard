import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyFabricChrome } from './lib/fabricChrome';
import { initAnalytics } from './lib/utils/analytics';
import { redirectLegacyHashUrl } from './app/seo/legacyHashUrl';

redirectLegacyHashUrl(); // old /#/draw links → /draw, before the router reads the URL
applyFabricChrome(); // selection handles readable in light and dark mode

// Playwright hook (read-only canvas view): only in `vite build --mode e2e`, never in production
if (import.meta.env.MODE === 'e2e') void import('./test/e2eHook');

// Google Analytics: production builds with VITE_GA_ID set only (not dev, not the e2e bundle)
if (import.meta.env.MODE === 'production') initAnalytics(import.meta.env.VITE_GA_ID);

createRoot(document.getElementById('fateboard')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
