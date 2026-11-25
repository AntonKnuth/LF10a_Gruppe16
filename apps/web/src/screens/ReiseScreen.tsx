import { useState } from 'react'
import { vereine } from '../content'
import type { Verein } from '../content/typen'
import type { Fortschritt } from '../profil'
import { Maskottchen, Stadion } from '../ui/Figuren'
import { AndereNadeln, Erde, Himmel, VereinsPin, kartenpunkt } from '../ui/Karte'
import { useVorlesen } from '../ui/vorlesen'

/** So weit ist die Karte hier höchstens vergrößert. */
const MAX_ZOOM = 4
/** So lang soll der Weg auf dem Bildschirm höchstens sein, damit beide Nadeln zu sehen sind. */
const MAX_WEG = 420
/** Abstand, in dem das Maskottchen neben der neuen Nadel stehen bleibt. */
const DANEBEN = 88
/** Größe des Maskottchens; seine Füße liegen 74 Einheiten unter der Mitte. */
const GROESSE = 0.85

/**
 * C6: Das Maskottchen reist vom alten zum neuen Verein.
 *
 * Reine Anzeige: kein Segment und nicht im Upload, der neue Fortschritt ist schon gespeichert.
 * Wird mitten in der Reise neu geladen, erscheint der Startbildschirm beim neuen Verein.
 *
 * A2: Karte, ein Satz, ein Knopf. Der Knopf kommt erst bei der Ankunft.
 */
export function ReiseScreen({
  vonIndex,
  fortschritt,
  text,
  angehalten,
  onWeiter,
}: {
  vonIndex: number
  /** Der neue Stand: `vereinIndex` ist das Ziel. */
  fortschritt: Fortschritt
  /** Ein Satz, `{name}` ist schon ersetzt. */
  text: string
  /** Das Pausenmenü ist offen — dann bleibt das Maskottchen stehen. */
  angehalten: boolean
  onWeiter: () => void
}) {
  const [angekommen, setAngekommen] = useState(false)
  useVorlesen(text)

  const ziel = vereine[fortschritt.vereinIndex]
  const a = kartenpunkt(vereine[vonIndex].karte)
  const b = kartenpunkt(ziel.karte)

  // Köln und Amsterdam trennen auf der Europakarte keine 50 Einheiten. Deshalb rückt die Karte
  // näher heran: die Mitte des Weges kommt in die Bildmitte, alles drumherum wird gestreckt.
  // Die Nadeln behalten ihre Größe, sonst verdeckten sie einander wieder.
  const zoom = Math.min(MAX_ZOOM, MAX_WEG / Math.hypot(b.x - a.x, b.y - a.y))
  const mitte = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const nah = (p: { x: number; y: number }) => ({
    x: 500 + (p.x - mitte.x) * zoom,
    y: 430 + (p.y - mitte.y) * zoom,
  })
  const ort = (v: Verein) => nah(kartenpunkt(v.karte))

  const von = nah(a)
  const nach = nah(b)
  // Das Maskottchen hält auf der Seite, von der es kommt, sonst stünde es vor der neuen Nadel.
  const halt = { x: nach.x + (nach.x > von.x ? -DANEBEN : DANEBEN), y: nach.y }
  const weg = {
    '--weg-x': `${halt.x - von.x}px`,
    '--weg-y': `${halt.y - von.y}px`,
  } as React.CSSProperties

  return (
    <div className="relative h-full overflow-hidden">
      <svg
        viewBox="0 0 1000 750"
        className={`h-full w-full ${angehalten ? 'r-angehalten' : ''}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <Himmel />
        <g transform={`translate(500 430) scale(${zoom}) translate(${-mitte.x} ${-mitte.y})`}>
          <Erde />
        </g>

        {angekommen && (
          <g className="r-ankunft">
            <Stadion x={nach.x} y={nach.y + 6} s={1.2} />
          </g>
        )}
        <path
          d={`M${von.x} ${von.y} L${halt.x} ${halt.y}`}
          stroke="#e8952a"
          strokeWidth="7"
          strokeDasharray="4 18"
          strokeLinecap="round"
        />
        <AndereNadeln fortschritt={fortschritt} ausser={angekommen ? fortschritt.vereinIndex : -1} ort={ort} />
        {angekommen && (
          <g className="r-ankunft">
            <VereinsPin {...nach} verein={ziel} besucht s={1.5} />
          </g>
        )}

        {/* Die Ankunft meldet die Animation selbst. Eine eigene Uhr müsste im Pausenmenü
            mitangehalten werden und könnte von der Bewegung abweichen. Das Hüpfen innen meldet
            sich ebenfalls, deshalb der Vergleich mit `currentTarget`. */}
        <g
          className="r-figur"
          style={weg}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setAngekommen(true)
          }}
        >
          <g className="r-huepft">
            <Maskottchen x={von.x} y={von.y - 74 * GROESSE} s={GROESSE} />
          </g>
        </g>
      </svg>

      <p className="absolute top-8 left-1/2 w-max max-w-[75%] -translate-x-1/2 rounded-3xl bg-white px-10 py-5 text-center text-4xl font-bold text-slate-800 shadow-lg">
        {text}
      </p>

      {angekommen && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <button
            onClick={onWeiter}
            className="taste auftritt bg-rasen text-white shadow-lg active:scale-95"
            autoFocus
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  )
}
