import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { vereine } from './content'
import type { SpielErgebnis } from './engine/segmente'
import { SpielScreen } from './screens/SpielScreen'
import { SPIELE } from './spiele'

/**
 * Probebühne für einzelne Minispiele — **Entwicklerwerkzeug, nicht Teil des Kindmodus.**
 *
 * Über den Tagesplan dauert es bis zum dritten Spiel eines Vereins gut 40 Sekunden: zwei
 * Platzhalter und zwei Zwangspausen, die A3 absichtlich nicht überspringbar macht. Zum
 * Entwickeln eines Spiels ist das unbrauchbar — man ändert eine Zahl und klickt wieder
 * eine Dreiviertelminute.
 *
 *   http://localhost:5173/probe.html
 *   http://localhost:5173/probe.html?spiel=rasenmaehen&stufe=3&dauer=45
 *
 * Bindet bewusst den **echten** `SpielScreen` ein: Anweisung, Vorlesen und der sichtbare
 * Timer aus A3 verhalten sich hier genau wie im Tagesplan. Was auf der Probebühne läuft,
 * läuft auch im Spiel — sonst wäre das Werkzeug wertlos.
 *
 * Steht als eigener Vite-Einstiegspunkt neben `index.html` und wird von `vite build`
 * nicht mitgebaut. Es gibt also keinen Weg, auf dem Ben hier landen könnte.
 */
export function Probe() {
  const p = new URLSearchParams(location.search)
  const [spielId, setSpielId] = useState(p.get('spiel') ?? 'rasenmaehen')
  const [stufe, setStufe] = useState(Number(p.get('stufe') ?? 3))
  const [dauer, setDauer] = useState(Number(p.get('dauer') ?? 45))
  const [vereinId, setVereinId] = useState(vereine[0].id)
  // Zählt bei jedem Neustart hoch und erzwingt als `key` eine frische Spielwelt.
  const [lauf, setLauf] = useState(0)
  const [ergebnis, setErgebnis] = useState<SpielErgebnis | null>(null)
  const [angehalten, setAngehalten] = useState(false)

  const verein = vereine.find((v) => v.id === vereinId) ?? vereine[0]

  const neu = () => {
    setErgebnis(null)
    setLauf((l) => l + 1)
  }

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 text-sm text-slate-200">
        <span className="font-bold text-slate-400">Probebühne</span>

        <label className="flex items-center gap-2">
          Spiel
          <select
            className="rounded bg-slate-700 px-2 py-1"
            value={spielId}
            onChange={(e) => {
              setSpielId(e.target.value)
              neu()
            }}
          >
            {Object.entries(SPIELE).map(([id, s]) => (
              <option key={id} value={id}>
                {s.titel}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          Verein
          <select
            className="rounded bg-slate-700 px-2 py-1"
            value={vereinId}
            onChange={(e) => {
              setVereinId(e.target.value)
              neu()
            }}
          >
            {vereine.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        {/* B1: die Stufe ohne Umweg über den Therapeutenmodus durchprobieren. */}
        <label className="flex items-center gap-2">
          Stufe
          <input
            type="number"
            min={1}
            max={5}
            className="w-16 rounded bg-slate-700 px-2 py-1"
            value={stufe}
            onChange={(e) => setStufe(Number(e.target.value))}
          />
        </label>

        <label className="flex items-center gap-2">
          Dauer&nbsp;s
          <input
            type="number"
            min={5}
            max={300}
            step={5}
            className="w-20 rounded bg-slate-700 px-2 py-1"
            value={dauer}
            onChange={(e) => setDauer(Number(e.target.value))}
          />
        </label>

        <button onClick={neu} className="rounded bg-emerald-600 px-4 py-1 font-bold text-white">
          Neu starten
        </button>

        {/* Zum Prüfen, ob ein Spiel das Anhalten wirklich beachtet: Bild und Uhr müssen
            stehen bleiben, und die gemessene Dauer darf die Pausenzeit nicht enthalten. */}
        <button
          onClick={() => setAngehalten((a) => !a)}
          className="rounded bg-slate-600 px-4 py-1 font-bold text-white"
        >
          {angehalten ? 'Weiterlaufen' : 'Anhalten'}
        </button>

        <span className="text-slate-500">
          Stift oder Maustaste zum Zeichnen · Ziffern 1–9 und 0 stellen den Ersatzdruck
        </span>
      </div>

      <div className="min-h-0 flex-1">
        {ergebnis ? (
          <Auswertung ergebnis={ergebnis} onNochmal={neu} />
        ) : (
          <SpielScreen
            key={`${lauf}-${spielId}-${vereinId}-${stufe}-${dauer}`}
            spielId={spielId}
            dauerSek={dauer}
            stufe={stufe}
            verein={verein}
            name="Ben"
            angehalten={angehalten}
            onFertig={setErgebnis}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Zeigt das rohe `SpielErgebnis`. Im Kindmodus wäre das ein A2-Verstoß — hier ist es der
 * ganze Zweck: nur so sieht man, was ein Spiel tatsächlich an die Auswertung meldet.
 */
export function Auswertung({
  ergebnis,
  onNochmal,
}: {
  ergebnis: SpielErgebnis
  onNochmal: () => void
}) {
  return (
    <div className="h-full overflow-auto p-8 text-slate-200">
      <h1 className="mb-4 text-2xl font-bold">SpielErgebnis</h1>
      <pre className="mb-6 overflow-x-auto rounded bg-slate-800 p-4 text-sm">
        {JSON.stringify(ergebnis, null, 2)}
      </pre>
      <button
        onClick={onNochmal}
        className="rounded bg-emerald-600 px-6 py-2 font-bold text-white"
      >
        Nochmal
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Probe />
  </StrictMode>,
)
