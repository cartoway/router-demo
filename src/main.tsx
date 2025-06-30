import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { TranslationProvider } from './contexts/TranslationContext.tsx'
import './index.css'
import './config/fontawesome.ts' // Import Font Awesome configuration

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </StrictMode>,
)
