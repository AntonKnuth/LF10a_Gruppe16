import { vereine } from '../content'
import type { Fortschritt } from '../profil'
import { Maskottchen, Stadion } from '../ui/Figuren'
import { AndereNadeln, Erde, Himmel, VereinsPin, kartenpunkt } from '../ui/Karte'

type Props = { fortschritt: Fortschritt; onStart: () => void }

/**
 * A2 begrenzt den Bildschirm auf wenige Elemente: Titel, Karte, Maskottchen und
 * „Drücke zum Start". Sonst nichts — der Anhalte-Knopf oben rechts liegt darüber und
 * gehört nicht zu diesem Bildschirm.
 *
 * Die Karte ist zugleich die Fortschrittsanzeige aus C4 — besuchte Vereine haben eine
 * farbige Nadel, noch nicht besuchte eine blasse leere.
 */
export function StartScreen({ fortschritt, onStart }: Props) {
  const aktiv = vereine[fortschritt.vereinIndex]
  const aktivPos = kartenpunkt(aktiv.karte)

  return (
    <svg
      viewBox="0 0 1000 750"
      className="h-full w-full touch-none"
      preserveAspectRatio="xMidYMid slice"
      onPointerDown={onStart}
    >
      <defs>
        <radialGradient id="leuchten">
          <stop offset="0%" stopColor="#b6ff6a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b6ff6a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Himmel />
      <Erde />

      {/* Leuchten und Stadion liegen unter allen Nadeln, die Nadel des aktiven Vereins ganz
          oben: die drei Städte liegen dicht beieinander und dürfen sich nicht verdecken. */}
      <circle
        className="s-leuchten"
        style={{ transformOrigin: `${aktivPos.x}px ${aktivPos.y}px` }}
        cx={aktivPos.x}
        cy={aktivPos.y}
        r="64"
        fill="url(#leuchten)"
      />
      <Stadion x={aktivPos.x} y={aktivPos.y + 6} s={0.8} />
      <AndereNadeln
        fortschritt={fortschritt}
        ausser={fortschritt.vereinIndex}
        ort={(v) => kartenpunkt(v.karte)}
      />
      <VereinsPin {...aktivPos} verein={aktiv} besucht s={1.2} />

      <Titel />
      <g className="s-schwebt">
        <Maskottchen x={700} y={238} s={1.15} />
      </g>

      <text
        x="500"
        y="708"
        textAnchor="middle"
        fontSize="40"
        fontWeight="900"
        fill="#fff"
        stroke="#2f7d33"
        strokeWidth="7"
        paintOrder="stroke"
        className="pulsiert"
        fontFamily="system-ui"
      >
        Drücke zum Start
      </text>
    </svg>
  )
}

/**
 * Jeder Buchstabe hat seine eigene Mitte. Nur so sitzen Feldlinien und Ball auf dem T, dem l und
 * dem i, egal welche Systemschrift das Gerät hat: auf dem iPad ist es eine andere als am PC.
 */
const TRAVEL = { text: 'Travel', x: [158, 218, 275, 339, 404, 454] }
/** Mit „ı" ohne Punkt: den i-Punkt ersetzt der Ball. */
const KICKERS = { text: 'Kıckers', x: [511, 568, 614, 676, 741, 797, 850] }
/** Leichter Bogen wie im Mockup: zu den Rändern hin tiefer. */
const bogen = (x: number) => 150 + ((x - 500) / 350) ** 2 * 22

function Titel() {
  // Erst der weiße Rand beider Wörter, dann die Farben — sonst schnitte der Rand jedes
  // Buchstabens in den vorherigen.
  const wort = (w: typeof TRAVEL, fill: string) => (
    <text x={w.x.join(' ')} y={w.x.map(bogen).join(' ')} fill={fill} stroke={fill === '#fff' ? fill : 'none'}>
      {w.text}
    </text>
  )
  const [tX, lX, iX] = [TRAVEL.x[0], TRAVEL.x[5], KICKERS.x[1]]

  return (
    <g className="s-titel" role="img" aria-label="TravelKickers">
      <defs>
        {/* Gemähter Rasen: helle und dunkle Streifen. */}
        <pattern id="rasen" width="36" height="36" patternUnits="userSpaceOnUse">
          <rect width="36" height="36" fill="#5aa832" />
          <rect width="18" height="36" fill="#4a9629" />
        </pattern>
      </defs>
      <g
        textAnchor="middle"
        fontSize="104"
        fontWeight="900"
        fontFamily="system-ui"
        strokeWidth="18"
        strokeLinejoin="round"
      >
        {wort(TRAVEL, '#fff')}
        {wort(KICKERS, '#fff')}
        {wort(TRAVEL, 'url(#rasen)')}
        {wort(KICKERS, '#f6b81c')}
      </g>
      <Feldlinie x={tX} oben={-48} />
      <Feldlinie x={lX} oben={-68} />
      <Ball x={iX} y={bogen(iX) - 74} />
    </g>
  )
}

/** Mittellinie mit Anstoßkreis, auf dem Stamm eines Buchstabens. */
function Feldlinie({ x, oben }: { x: number; oben: number }) {
  return (
    <g transform={`translate(${x} ${bogen(x)})`} stroke="#fff" strokeWidth="2.5" fill="none">
      <path d={`M0 ${oben} V-6`} />
      <circle cy={oben / 2 - 3} r="6" />
    </g>
  )
}

function Ball({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="17" fill="#fff" />
      <circle r="13.5" fill="#fff" stroke="#2b2b2b" strokeWidth="2.5" />
      <path d="M0 -6.5 L6.2 -2 L3.8 5.3 L-3.8 5.3 L-6.2 -2Z" fill="#2b2b2b" />
      <path
        d="M0 -6 V-9 M6 -2 L9 -3 M3.8 5 L5.5 7.5 M-3.8 5 L-5.5 7.5 M-6 -2 L-9 -3"
        stroke="#2b2b2b"
        strokeWidth="2"
      />
      {/* Am Rand angeschnittene Flecken, sonst liest sich das Fünfeck allein als Rad. */}
      <path
        d="M-4 -13 L0 -9 L4 -13Z M11 -8 L9 -3 L13.5 0Z M9 10 L5.5 7.5 L5 13Z M-9 10 L-5.5 7.5 L-5 13Z M-11 -8 L-9 -3 L-13.5 0Z"
        fill="#2b2b2b"
      />
    </g>
  )
}
