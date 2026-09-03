import { useEffect, useState } from 'react'
import { beiBedienungsAenderung, bedienung, setzeBedienung } from '../bedienung'

/**
 * Der Anhalte-Knopf und das Menü dahinter.
 *
 * Erreichbar auf dem Startbildschirm **und in jedem Spiel**, ohne Langdruck und ohne PIN.
 * Hier liegt nichts Vertrauliches mehr: Einstellungen, Verlauf und das Löschen des Profils
 * sind in die Therapeuten-App gezogen. Was bleibt, darf Ben selbst bedienen.
 *
 * Beim Öffnen steht deutlich da, dass das Spiel angehalten ist — Ben soll nicht glauben, ihm
 * laufe gerade die Zeit davon. Vier Bedienelemente, damit A2 (höchstens fünf pro Bildschirm)
 * gewahrt bleibt.
 */
export function AnhalteKnopf({ onOeffnen }: { onOeffnen: () => void }) {
  return (
    <button
      onClick={onOeffnen}
      aria-label="Anhalten"
      className="absolute top-4 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-lg active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16" rx="1.5" fill="#475569" />
        <rect x="14" y="4" width="4" height="16" rx="1.5" fill="#475569" />
      </svg>
    </button>
  )
}

export function PausenMenue({ onWeiterspielen }: { onWeiterspielen: () => void }) {
  // Der Zustand liegt außerhalb von React (die Bildschleifen lesen ihn synchron), deshalb
  // hier nur eine Kopie, die sich bei Änderungen erneuert.
  const [b, setB] = useState(bedienung)
  useEffect(() => beiBedienungsAenderung(() => setB(bedienung())), [])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-6">
      <div className="flex w-full max-w-xl flex-col gap-6 rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-center text-4xl font-bold text-slate-800">Das Spiel wartet auf dich.</p>

        <label className="flex items-center justify-between gap-4">
          <span className="text-2xl font-semibold text-slate-700">Ton</span>
          <button
            onClick={() => setzeBedienung({ tonAn: !b.tonAn })}
            className={`h-12 w-24 rounded-full px-1 transition-colors ${
              b.tonAn ? 'bg-rasen' : 'bg-slate-300'
            }`}
            aria-label={b.tonAn ? 'Ton ausschalten' : 'Ton einschalten'}
            aria-pressed={b.tonAn}
          >
            <span
              className={`block h-10 w-10 rounded-full bg-white shadow transition-transform ${
                b.tonAn ? 'translate-x-12' : ''
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between gap-4">
          <span className="text-2xl font-semibold text-slate-700">Lautstärke</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={b.lautstaerke}
            disabled={!b.tonAn}
            onChange={(e) => setzeBedienung({ lautstaerke: Number(e.target.value) })}
            className="h-3 w-56 accent-rasen disabled:opacity-40"
          />
        </label>

        <label className="flex items-center justify-between gap-4">
          <span className="text-2xl font-semibold text-slate-700">Bildschirm dunkler</span>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.1}
            value={b.abdunkeln}
            onChange={(e) => setzeBedienung({ abdunkeln: Number(e.target.value) })}
            className="h-3 w-56 accent-slate-700"
          />
        </label>

        <button
          onClick={onWeiterspielen}
          autoFocus
          className="taste bg-rasen text-2xl text-white shadow-lg active:scale-95"
        >
          Weiterspielen
        </button>
      </div>
    </div>
  )
}

/**
 * Der Schleier über allem. Liegt über der App, nimmt aber keine Klicks entgegen — sonst wäre
 * das Spiel bei jeder Abdunklung unbedienbar.
 */
export function Abdunklung() {
  const [b, setB] = useState(bedienung)
  useEffect(() => beiBedienungsAenderung(() => setB(bedienung())), [])

  if (b.abdunkeln <= 0) return null
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 bg-black"
      style={{ opacity: b.abdunkeln }}
      aria-hidden="true"
    />
  )
}
