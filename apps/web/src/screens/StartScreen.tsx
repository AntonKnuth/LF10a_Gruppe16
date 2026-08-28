import { useRef } from 'react'
import { vereine } from '../content'
import { Maskottchen, Pin, Stadion } from '../ui/Figuren'

/** Kartenfläche im SVG. `karte.x/y` eines Vereins sind Prozent davon. */
const KARTE = { x: 110, y: 330, b: 780, h: 380 }
const auf = (k: { x: number; y: number }) => ({
  x: KARTE.x + (k.x / 100) * KARTE.b,
  y: KARTE.y + (k.y / 100) * KARTE.h,
})

type Props = { aktiverVereinIndex: number; onStart: () => void; onTherapeut: () => void }

/**
 * A2 begrenzt den Bildschirm auf wenige Elemente: Titel, Karte, Maskottchen,
 * „Drücke zum Start" und das Menü oben rechts. Sonst nichts.
 *
 * Die Karte ist zugleich die Fortschrittsanzeige aus C4 — besuchte Vereine haben eine
 * farbige Nadel, noch nicht besuchte eine blasse leere.
 */
export function StartScreen({ aktiverVereinIndex, onStart, onTherapeut }: Props) {
  const aktiv = vereine[aktiverVereinIndex]
  const aktivPos = auf(aktiv.karte)

  // 2 s Langdruck, damit Ben nicht versehentlich in den Therapeutenbereich stolpert.
  const langdruck = useRef<number>(0)
  const halten = () => {
    langdruck.current = window.setTimeout(onTherapeut, 2000)
  }
  const loslassen = () => clearTimeout(langdruck.current)

  return (
    <svg
      viewBox="0 0 1000 750"
      className="h-full w-full touch-none"
      preserveAspectRatio="xMidYMid slice"
      onPointerDown={onStart}
    >
      <defs>
        <linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6e9fb" />
          <stop offset="100%" stopColor="#6cbfec" />
        </linearGradient>
        <radialGradient id="leuchten">
          <stop offset="0%" stopColor="#b6ff6a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b6ff6a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1000" height="750" fill="url(#himmel)" />

      <g fill="#fff" opacity="0.92">
        <Wolke x={120} y={150} s={1.1} />
        <Wolke x={840} y={195} s={0.9} />
        <Wolke x={330} y={95} s={0.7} />
        <Wolke x={640} y={120} s={0.6} />
      </g>

      {/* Globus-Andeutung: sehr großer Kreis, von dem nur die obere Wölbung sichtbar ist. */}
      <circle cx="500" cy="1780" r="1470" fill="#f2f6f9" />
      <Europa />

      {/* Nicht besuchte Vereine zuerst, damit der aktive Verein oben liegt. */}
      {vereine.map((v, i) => {
        if (i === aktiverVereinIndex) return null
        const p = auf(v.karte)
        return <Pin key={v.id} x={p.x} y={p.y} />
      })}

      <circle cx={aktivPos.x} cy={aktivPos.y + 44} r="70" fill="url(#leuchten)" />
      <Stadion x={aktivPos.x} y={aktivPos.y + 44} />
      <Pin x={aktivPos.x} y={aktivPos.y} farbe={aktiv.farben.primaer} kuerzel={aktiv.id.toUpperCase().slice(0, 3)} />

      <Titel />
      <Maskottchen x={690} y={268} s={1.15} />

      <text
        x="500"
        y="722"
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

      {/* Menü: eigener Klickbereich, darf den Start nicht auslösen. */}
      <g
        transform="translate(918 42)"
        onPointerDown={(e) => {
          e.stopPropagation()
          halten()
        }}
        onPointerUp={loslassen}
        onPointerLeave={loslassen}
        onPointerCancel={loslassen}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-label="Menü, zwei Sekunden gedrückt halten"
      >
        <rect x="-26" y="-26" width="52" height="52" rx="16" fill="#fff" opacity="0.75" />
        <g stroke="#3b7ea8" strokeWidth="5" strokeLinecap="round">
          <line x1="-12" y1="-9" x2="12" y2="-9" />
          <line x1="-12" y1="0" x2="12" y2="0" />
          <line x1="-12" y1="9" x2="12" y2="9" />
        </g>
      </g>
    </svg>
  )
}

function Wolke({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="54" ry="26" />
      <ellipse cx="-38" cy="8" rx="34" ry="19" />
      <ellipse cx="36" cy="7" rx="38" ry="21" />
      <ellipse cx="-6" cy="-18" rx="32" ry="22" />
    </g>
  )
}

/**
 * Vereinfachter Umriss. ponytail: bewusst grob gehalten — die Nadeln tragen die
 * Funktion (C4), die Kartengrafik ist Deko. Gegen ein echtes Europa-SVG austauschen,
 * ohne die Koordinatenrechnung oben anzufassen.
 */
function Europa() {
  return (
    <g fill="#ccd5dd" stroke="#b9c3cd" strokeWidth="2">
      <path d="M176 606 L170 565 L205 548 L258 542 L300 548 L330 540 L322 512 L300 492 L318 468 L352 452 L392 444 L420 458 L452 446 L490 438 L530 442 L578 432 L626 438 L680 428 L728 440 L786 452 L830 478 L848 516 L820 548 L772 556 L726 548 L690 566 L662 596 L630 610 L604 592 L566 576 L540 596 L528 636 L506 672 L482 690 L470 672 L492 634 L500 592 L486 566 L452 556 L414 566 L380 580 L344 578 L330 600 L300 626 L252 646 L206 638 Z" />
      <path d="M300 428 L288 398 L300 372 L318 362 L330 382 L344 392 L338 414 L322 432 L310 442 Z" />
      <path d="M262 410 L256 392 L268 382 L284 388 L286 408 L272 418 Z" />
      <path d="M470 420 L456 392 L452 356 L470 330 L496 336 L512 362 L528 352 L546 368 L538 398 L516 418 L494 426 Z" />
      <path d="M546 368 L556 336 L580 330 L596 352 L588 388 L562 398 Z" />
    </g>
  )
}

function Titel() {
  return (
    <text
      x="500"
      y="150"
      textAnchor="middle"
      fontSize="104"
      fontWeight="900"
      fontFamily="system-ui"
      stroke="#fff"
      strokeWidth="14"
      paintOrder="stroke"
      letterSpacing="-2"
    >
      <tspan fill="#5aa832">Travel</tspan>
      <tspan fill="#f6b81c">Kickers</tspan>
    </text>
  )
}
