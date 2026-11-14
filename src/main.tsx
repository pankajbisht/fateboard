import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAnalytics } from './lib/utils/analytics';
import { redirectLegacyHashUrl } from './app/seo/legacyHashUrl';
import { preloadRoute } from './app/routes/appRoutes';

redirectLegacyHashUrl(); // old /#/draw links → /draw, before the router reads the URL
preloadRoute(window.location.pathname); // layout + page chunks in parallel (BUG-209)

// Google Analytics: production builds with VITE_GA_ID set only (not dev, not the e2e bundle)
if (import.meta.env.MODE === 'production') initAnalytics(import.meta.env.VITE_GA_ID);

createRoot(document.getElementById('fateboard')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
