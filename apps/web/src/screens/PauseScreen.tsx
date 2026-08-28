import { useEffect, useState } from 'react'
import { useVorlesen } from '../ui/vorlesen'

/**
 * A3 / B3: Die Pause ist verpflichtend. Sie lässt sich **anhalten**, falls zu Hause etwas
 * dazwischenkommt, und läuft danach weiter — aber es gibt keinen Weg, sie zu überspringen.
 * Der „Weiter"-Knopf erscheint erst bei 0.
 */
export function PauseScreen({
  dauerSek,
  inhalt,
  onWeiter,
}: {
  dauerSek: number
  inhalt: string
  onWeiter: () => void
}) {
  const [rest, setRest] = useState(dauerSek)
  const [laeuft, setLaeuft] = useState(true)
  useVorlesen(`Kurze Pause. ${inhalt}.`)

  useEffect(() => {
    if (!laeuft) return
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [laeuft])

  const fertig = rest === 0
  const anteil = dauerSek > 0 ? rest / dauerSek : 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-himmel-hell p-8">
      <p className="text-4xl font-bold text-slate-700">Kurze Pause</p>
      <p className="text-center text-5xl font-extrabold text-rasen-dunkel">{inhalt}</p>

      <div className="relative">
        <svg viewBox="-60 -60 120 120" className="h-56 w-56 -rotate-90">
          <circle r="50" fill="none" stroke="#fff" strokeWidth="12" />
          <circle
            r="50"
            fill="none"
            stroke="#4caf50"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 50}
            strokeDashoffset={2 * Math.PI * 50 * (1 - anteil)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-slate-700">
          {rest}
        </span>
      </div>

      {fertig ? (
        <button onClick={onWeiter} className="taste bg-rasen text-white shadow-lg active:scale-95">
          Weiter
        </button>
      ) : (
        <button
          onClick={() => setLaeuft((l) => !l)}
          className="taste bg-white text-slate-600 shadow active:scale-95"
        >
          {laeuft ? 'Anhalten' : 'Weiterlaufen'}
        </button>
      )}
    </div>
  )
}
