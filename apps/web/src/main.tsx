import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Bittet den Browser, die Therapiedaten nicht bei Speicherdruck zu verwerfen.
// Zusammen mit der Homescreen-Installation die Voraussetzung dafür, dass Bens
// Verlauf über Wochen erhalten bleibt.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
