import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('fateboard-portal')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
