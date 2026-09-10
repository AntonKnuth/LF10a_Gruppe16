import karteBild from '../assets/karte.png'
import { vereine } from '../content'
import { Maskottchen, Pin, Stadion } from '../ui/Figuren'

/**
 * Kartenfläche im SVG. `karte.x/y` eines Vereins sind Prozent davon.
 *
 * Deckungsgleich mit dem Kartenbild: dadurch sind die Prozentwerte im Content zugleich die
 * Position auf der Zeichnung, und ein neuer Verein braucht nur zwei Zahlen.
 */
const KARTE = { x: 0, y: 262, b: 1000, h: 480 }
const auf = (k: { x: number; y: number }) => ({
  x: KARTE.x + (k.x / 100) * KARTE.b,
  y: KARTE.y + (k.y / 100) * KARTE.h,
})

type Props = { aktiverVereinIndex: number; onStart: () => void }

/**
 * A2 begrenzt den Bildschirm auf wenige Elemente: Titel, Karte, Maskottchen und
 * „Drücke zum Start". Sonst nichts — der Anhalte-Knopf oben rechts liegt darüber und
 * gehört nicht zu diesem Bildschirm.
 *
 * Die Karte ist zugleich die Fortschrittsanzeige aus C4 — besuchte Vereine haben eine
 * farbige Nadel, noch nicht besuchte eine blasse leere.
 */
export function StartScreen({ aktiverVereinIndex, onStart }: Props) {
  const aktiv = vereine[aktiverVereinIndex]
  const aktivPos = auf(aktiv.karte)

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

      {/* Jede Wolke in einer eigenen Hülle mit eigenem Tempo — sonst schwebt der ganze
          Himmel im Gleichschritt und sieht aus wie ein Fehler. */}
      <g fill="#fff" opacity="0.92">
        <g className="s-wolke" style={{ animationDuration: '24s' }}>
          <Wolke x={120} y={150} s={1.1} />
        </g>
        <g className="s-wolke" style={{ animationDuration: '31s', animationDirection: 'reverse' }}>
          <Wolke x={840} y={195} s={0.9} />
        </g>
        <g className="s-wolke" style={{ animationDuration: '38s' }}>
          <Wolke x={330} y={95} s={0.7} />
        </g>
        <g className="s-wolke" style={{ animationDuration: '27s', animationDirection: 'reverse' }}>
          <Wolke x={640} y={120} s={0.6} />
        </g>
      </g>

      {/* Der Globus ist jetzt eine Zeichnung. Der weiße Himmel darüber ist freigestellt,
          deshalb liegt sie einfach über dem Himmelsverlauf. */}
      <image
        href={karteBild}
        x={KARTE.x}
        y={KARTE.y}
        width={KARTE.b}
        height={KARTE.h}
        preserveAspectRatio="none"
      />

      {/* Nicht besuchte Vereine zuerst, damit der aktive Verein oben liegt. */}
      {vereine.map((v, i) => {
        if (i === aktiverVereinIndex) return null
        const p = auf(v.karte)
        return <Pin key={v.id} x={p.x} y={p.y} />
      })}

      <circle
        className="s-leuchten"
        style={{ transformOrigin: `${aktivPos.x}px ${aktivPos.y + 44}px` }}
        cx={aktivPos.x}
        cy={aktivPos.y + 44}
        r="70"
        fill="url(#leuchten)"
      />
      <Stadion x={aktivPos.x} y={aktivPos.y + 44} />
      <Pin x={aktivPos.x} y={aktivPos.y} farbe={aktiv.farben.primaer} kuerzel={aktiv.id.toUpperCase().slice(0, 3)} />

      <Titel />
      <g className="s-schwebt">
        <Maskottchen x={690} y={268} s={1.15} />
      </g>

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

function Titel() {
  return (
    <text
      className="s-titel"
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
