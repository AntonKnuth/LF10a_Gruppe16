import type { PausenUebung } from './pausenUebungen'

/**
 * Ein Strichmännchen, das die Übung vormacht.
 *
 * Bewegt wird ausschließlich über CSS-Keyframes (`index.css`, Abschnitt „Pausenübungen"):
 * kein Bildschleifen-Code, kein Canvas, nichts, was angehalten werden müsste. Bei
 * `prefers-reduced-motion` steht die Figur still — die Anweisung steht ja daneben.
 */
export function PausenFigur({ uebung }: { uebung: PausenUebung }) {
  return (
    <svg viewBox="0 0 200 250" className={`h-full w-full u-${uebung.id}`} aria-hidden="true">
      <ellipse cx="100" cy="238" rx="46" ry="7" fill="#000" opacity="0.1" />

      <g className="p-koerper">
        {/* Beine */}
        <g className="p-bein-l">
          <path d="M92 148 v58" stroke="#3b4a5a" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M86 210 h14" stroke="#2b2b2b" strokeWidth="11" strokeLinecap="round" />
        </g>
        <g className="p-bein-r">
          <path d="M108 148 v58" stroke="#3b4a5a" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M100 210 h14" stroke="#2b2b2b" strokeWidth="11" strokeLinecap="round" />
        </g>

        <g className="p-oben">
          {/* Rumpf */}
          <path d="M78 82 h44 a10 10 0 0 1 10 10 v50 a10 10 0 0 1 -10 10 h-44 a10 10 0 0 1 -10 -10 v-50 a10 10 0 0 1 10 -10z" fill="#4caf50" />

          {/* Arme, aus der Schulter gedreht */}
          <g className="p-arm-l">
            <path d="M80 92 v52" stroke="#4caf50" strokeWidth="13" strokeLinecap="round" fill="none" />
            <circle className="p-hand-l" cx="80" cy="150" r="9" fill="#f0c9a4" />
          </g>
          <g className="p-arm-r">
            <path d="M120 92 v52" stroke="#4caf50" strokeWidth="13" strokeLinecap="round" fill="none" />
            <circle className="p-hand-r" cx="120" cy="150" r="9" fill="#f0c9a4" />
          </g>

          {/* Kopf */}
          <circle cx="100" cy="48" r="27" fill="#f0c9a4" />
          <path d="M73 44 a27 27 0 0 1 54 0 q-27 -13 -54 0z" fill="#5a3b23" />
          <circle cx="91" cy="48" r="3.2" fill="#2b2b2b" />
          <circle cx="109" cy="48" r="3.2" fill="#2b2b2b" />
          <path d="M91 58 q9 7 18 0" stroke="#2b2b2b" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Nur beim Atmen: der Ring geht mit dem Atem auf und zu. */}
      {uebung.id === 'atmen' && (
        <circle className="p-atemring" cx="100" cy="120" r="88" fill="none" stroke="#4caf50" strokeWidth="4" />
      )}
    </svg>
  )
}
