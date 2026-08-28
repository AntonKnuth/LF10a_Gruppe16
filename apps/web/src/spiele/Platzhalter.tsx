import { useEffect } from 'react'
import type { SpielProps } from './index'

/**
 * Steht für jedes noch nicht gebaute Minispiel und hält die Segment-Engine lauffähig.
 * Ersetzen heißt: eine Datei danebenlegen und in `SPIELE` das `Komponente`-Feld tauschen.
 *
 * Liefert absichtlich Nullwerte statt erfundener Zahlen — ein Platzhalter darf keine
 * Messwerte in den Verlauf schreiben.
 */
export function Platzhalter({ stufe, zeitAbgelaufen, onFertig }: SpielProps) {
  const fertig = (abgebrochen: boolean) =>
    onFertig({
      spielId: 'platzhalter',
      dauerMs: 0,
      vollstaendigkeit: 0,
      genauigkeit: 0,
      druckMittel: 0,
      druckStreuung: 0,
      eingabegeraet: 'mouse',
      synthetischerDruck: true,
      stufe,
      abgebrochen,
      extra: { platzhalter: true },
    })

  useEffect(() => {
    if (zeitAbgelaufen) fertig(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zeitAbgelaufen])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <p className="text-2xl text-slate-400">Dieses Minispiel wird noch gebaut.</p>
      <button
        onClick={() => fertig(false)}
        className="taste bg-rasen text-white shadow-lg active:scale-95"
      >
        Fertig
      </button>
    </div>
  )
}
