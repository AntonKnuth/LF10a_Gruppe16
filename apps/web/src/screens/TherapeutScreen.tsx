import { useEffect, useState } from 'react'
import { loescheProfil } from '../profil'

/**
 * D1: getrennte Ansicht für Thomas.
 *
 * Die PIN ist ausdrücklich eine **Kindersicherung, keine Sicherheit**: ohne Server gibt es
 * kein echtes Auth, der Hash liegt im selben localStorage wie alles andere. Hinter diesem
 * Bildschirm darf deshalb nie etwas Vertrauliches landen.
 */
const PIN_KEY = 'tk.pinHash'

async function hash(pin: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function TherapeutScreen({ onZurueck }: { onZurueck: () => void }) {
  const [offen, setOffen] = useState(false)
  return offen ? (
    <Bereich onZurueck={onZurueck} />
  ) : (
    <PinEingabe onOk={() => setOffen(true)} onAbbruch={onZurueck} />
  )
}

function PinEingabe({ onOk, onAbbruch }: { onOk: () => void; onAbbruch: () => void }) {
  const [pin, setPin] = useState('')
  const [fehler, setFehler] = useState(false)
  const neu = localStorage.getItem(PIN_KEY) === null

  async function pruefen(eingabe: string) {
    if (neu) {
      localStorage.setItem(PIN_KEY, await hash(eingabe))
      return onOk()
    }
    if ((await hash(eingabe)) === localStorage.getItem(PIN_KEY)) return onOk()
    setFehler(true)
    setPin('')
  }

  function tippen(z: string) {
    setFehler(false)
    const naechste = pin + z
    setPin(naechste)
    if (naechste.length === 4) void pruefen(naechste)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-slate-100 p-8">
      <p className="text-2xl font-bold text-slate-700">
        {neu ? 'Neue PIN festlegen (4 Ziffern)' : 'PIN eingeben'}
      </p>
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded-full ${pin.length > i ? 'bg-slate-700' : 'bg-slate-300'}`}
          />
        ))}
      </div>
      {fehler && <p className="font-semibold text-red-600">Falsche PIN</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((z, i) =>
          z ? (
            <button
              key={i}
              onClick={() => tippen(z)}
              className="h-16 w-16 rounded-2xl bg-white text-2xl font-bold shadow active:scale-95"
            >
              {z}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <button onClick={onAbbruch} className="text-lg text-slate-500 underline">
        Zurück
      </button>
    </div>
  )
}

function Bereich({ onZurueck }: { onZurueck: () => void }) {
  const [installiert, setInstalliert] = useState(true)
  const [dauerhaft, setDauerhaft] = useState(true)

  useEffect(() => {
    setInstalliert(window.matchMedia('(display-mode: standalone)').matches)
    void navigator.storage?.persisted?.().then(setDauerhaft)
  }, [])

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto bg-slate-100 p-8">
      <h1 className="text-3xl font-bold text-slate-800">Therapeutenbereich</h1>

      {/* Ohne Homescreen-Installation löscht Safari die Website-Daten nach ~7 Tagen
          Nichtnutzung — dann sind die Therapiedaten weg. */}
      {(!installiert || !dauerhaft) && (
        <div className="rounded-2xl border-l-8 border-amber-500 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">Datenverlust möglich</p>
          <p className="text-amber-900">
            Die App läuft im Browser und ist nicht auf dem Homescreen installiert. iOS löscht die
            gespeicherten Daten nach etwa 7 Tagen ohne Nutzung. Über „Zum Home-Bildschirm"
            installieren.
          </p>
        </div>
      )}

      <p className="text-slate-500">Einstellungen und Verlauf folgen.</p>

      <button
        onClick={() => {
          if (confirm('Profil und alle Daten endgültig löschen?')) {
            loescheProfil()
            location.reload()
          }
        }}
        className="w-fit rounded-xl bg-red-600 px-6 py-3 font-bold text-white"
      >
        Profil löschen (Art. 17 DSGVO)
      </button>

      <button onClick={onZurueck} className="w-fit text-lg text-slate-500 underline">
        Zurück zum Kindmodus
      </button>
    </div>
  )
}
