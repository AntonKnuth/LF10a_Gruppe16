import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Bittet den Browser, die lokalen Daten nicht bei Speicherdruck zu verwerfen. Seit die
// Therapiedaten auf dem Server liegen, schützt das nicht mehr den Verlauf, sondern das
// Gerätetoken: fliegt es raus, ist die Kopplung weg und der nächste Termin fällt aus.
void navigator.storage?.persist?.()

// Der Service Worker ist mit der Offline-Anforderung entfallen. Diese Zeilen sind kein Rest,
// sondern nötig: `registerType: 'autoUpdate'` hat sich auf jedem Gerät eingetragen, das je einen
// Build gesehen hat. Ohne ausdrückliches Abmelden liefert er dort weiterhin die alte App aus —
// egal, was auf dem Server steht. Kann entfernt werden, wenn kein Testgerät mehr betroffen ist.
void navigator.serviceWorker?.getRegistrations?.().then((eintraege) => {
  eintraege.forEach((eintrag) => void eintrag.unregister())
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
