import { useEffect, useState } from 'react'
import { SPIELE, type SpielProps } from '../spiele'
import type { SpielErgebnis } from '../engine/segmente'
import type { Verein } from '../content/typen'
import { useVorlesen } from '../ui/vorlesen'

/**
 * Rahmen um jedes Minispiel: Anweisung (A5) und sichtbarer Timer (A3).
 * Das Spiel selbst bekommt die volle Fläche darunter und meldet, wann es fertig ist.
 */
export function SpielScreen({
  spielId,
  dauerSek,
  stufe,
  verein,
  name,
  onFertig,
}: {
  spielId: string
  dauerSek: number
  stufe: number
  verein: Verein
  name: string
  onFertig: (ergebnis: SpielErgebnis) => void
}) {
  const spiel = SPIELE[spielId]
  const [rest, setRest] = useState(dauerSek)
  useVorlesen(spiel?.anweisung ?? '')

  useEffect(() => {
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  if (!spiel) return <p className="p-8 text-2xl">Unbekanntes Spiel: {spielId}</p>

  const props: SpielProps = { stufe, verein, name, zeitAbgelaufen: rest === 0, onFertig }
  const min = Math.floor(rest / 60)
  const sek = String(rest % 60).padStart(2, '0')

  return (
    <div className="flex h-full flex-col bg-himmel-hell">
      <header className="flex items-center gap-6 bg-white/70 px-8 py-4">
        <p className="flex-1 text-2xl font-bold text-slate-800">{spiel.anweisung}</p>
        <div className="flex items-center gap-3">
          <div className="h-3 w-40 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-rasen transition-[width] duration-1000 ease-linear"
              style={{ width: `${dauerSek > 0 ? (rest / dauerSek) * 100 : 0}%` }}
            />
          </div>
          <span className="w-20 text-right font-mono text-2xl font-bold text-slate-600 tabular-nums">
            {min}:{sek}
          </span>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <spiel.Komponente {...props} />
      </main>
    </div>
  )
}
