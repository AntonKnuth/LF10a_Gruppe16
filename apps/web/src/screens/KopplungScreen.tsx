import { useState } from 'react'
import { koppeln } from '../api'

/**
 * „Dieses Tablet ist noch nicht eingerichtet."
 *
 * Der Therapeut erzeugt in seiner App einen Einmalcode, Ben tippt ihn hier ein. Das passiert
 * **in der Praxis**, bevor ein Leihgerät mitgegeben wird — zu Hause gibt es bei einer
 * Internetsperre keinen zweiten Versuch.
 *
 * Der Bildschirm ist der einzige in der Kind-App, der ein Tastenfeld zeigt. Deshalb große
 * Felder, kein Kleingedrucktes und ein Satz Erklärung (A5).
 */
export function KopplungScreen({ onGekoppelt }: { onGekoppelt: () => void }) {
  const [code, setCode] = useState('')
  const [fehler, setFehler] = useState('')
  const [laeuft, setLaeuft] = useState(false)

  async function absenden() {
    setFehler('')
    setLaeuft(true)
    try {
      await koppeln(code, geraeteName())
      onGekoppelt()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Kopplung fehlgeschlagen.')
      setCode('')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-himmel-hell p-8">
      <svg viewBox="0 0 100 100" className="h-24 w-24" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="#fff" stroke="#94a3b8" strokeWidth="4" />
        <path d="M50 22 L68 36 61 58 39 58 32 36 Z" fill="#1f3a5f" />
      </svg>

      <p className="max-w-2xl text-center text-3xl font-bold text-slate-800">
        Dieses Tablet ist noch nicht eingerichtet.
      </p>
      <p className="text-xl text-slate-600">Gib den Code ein, den du bekommen hast.</p>

      <input
        value={code}
        onChange={(e) => {
          setFehler('')
          setCode(e.target.value.toUpperCase().slice(0, 6))
        }}
        onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && void absenden()}
        placeholder="A1B2C3"
        aria-label="Kopplungscode"
        autoFocus
        className="w-96 rounded-2xl border-4 border-slate-300 bg-white p-4 text-center font-mono text-5xl font-bold tracking-[0.25em] text-slate-800 uppercase"
      />

      {fehler && <p className="text-xl font-semibold text-red-600">{fehler}</p>}

      <button
        onClick={() => void absenden()}
        disabled={code.length !== 6 || laeuft}
        className="taste bg-rasen text-2xl text-white shadow-lg active:scale-95 disabled:opacity-40"
      >
        {laeuft ? 'Einen Moment…' : 'Weiter'}
      </button>
    </div>
  )
}

/**
 * Damit der Therapeut in seiner Geräteliste erkennt, welches Tablet das ist. Bewusst grob —
 * eine genauere Kennung wäre ein zusätzliches Datum ohne Zweck.
 */
function geraeteName() {
  const ua = navigator.userAgent
  if (/iPad/i.test(ua)) return 'iPad'
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/Android/i.test(ua)) return 'Android-Tablet'
  return 'Rechner'
}
