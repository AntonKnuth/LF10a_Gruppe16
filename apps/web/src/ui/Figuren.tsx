/** Vorläufige SVG-Figuren. Werden später durch gezeichnete Assets ersetzt. */

/** Maskottchen: Fußball mit Cap. */
export function Maskottchen({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="74" rx="32" ry="6" fill="#000" opacity="0.12" />
      <g stroke="#f0a030" strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M-13 32 v30 M13 32 v30" />
        <path d="M-30 6 l-20 16 M30 6 l20 -12" />
      </g>
      <path d="M-22 68 h18 M4 68 h18" stroke="#3b3b3b" strokeWidth="10" strokeLinecap="round" />
      <circle cx="0" cy="0" r="34" fill="#fff" stroke="#2b2b2b" strokeWidth="3" />
      {/* Flecken nur am Rand — Augen und Mund brauchen die Mitte frei. */}
      <path d="M-34 4 l11 -8 5 14 -9 10z M34 2 l-11 -7 -4 14 9 9z" fill="#2b2b2b" opacity="0.9" />
      <path d="M-10 27 l10 -6 10 6 -4 9 -12 0z" fill="#2b2b2b" />
      <circle cx="-11" cy="2" r="4.5" fill="#2b2b2b" />
      <circle cx="11" cy="2" r="4.5" fill="#2b2b2b" />
      <path d="M-10 12 a10 9 0 0 0 20 0 z" fill="#c1453b" />
      <path d="M-32 -10 a33 33 0 0 1 64 0 z" fill="#f0a030" />
      <path d="M30 -11 h19 a6 6 0 0 1 0 9 h-19z" fill="#e8952a" />
    </g>
  )
}

/** Kartennadel. Ohne `farbe` = blasse, leere Nadel für einen noch nicht besuchten Verein. */
export function Pin({
  x,
  y,
  farbe,
  kuerzel,
}: {
  x: number
  y: number
  farbe?: string
  kuerzel?: string
}) {
  const besucht = Boolean(farbe)
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 0 C-11 -15 -19 -24 -19 -34 A19 19 0 1 1 19 -34 C19 -24 11 -15 0 0 Z"
        fill={besucht ? '#fff' : '#eef2f6'}
        stroke={besucht ? '#8a6a3a' : '#b9c3cd'}
        strokeWidth={besucht ? 3 : 2.5}
      />
      <circle cx="0" cy="-34" r="13" fill={farbe ?? '#dfe5ea'} />
      {kuerzel && (
        <text
          x="0"
          y="-29"
          textAnchor="middle"
          fontSize="12"
          fontWeight="800"
          fill="#fff"
          fontFamily="system-ui"
        >
          {kuerzel}
        </text>
      )}
    </g>
  )
}

/** Stadion unter der Nadel des aktuellen Vereins. */
export function Stadion({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="6" rx="46" ry="20" fill="#8bd44a" opacity="0.85" />
      <ellipse cx="0" cy="0" rx="36" ry="16" fill="#e6ebef" stroke="#b9c3cd" strokeWidth="2" />
      <ellipse cx="0" cy="-1" rx="24" ry="9" fill="#4caf50" />
      <line x1="0" y1="-10" x2="0" y2="8" stroke="#fff" strokeWidth="1.5" />
      <ellipse cx="0" cy="-1" rx="6" ry="3" fill="none" stroke="#fff" strokeWidth="1.5" />
    </g>
  )
}

/**
 * Vereinswappen als Schild mit Kürzel.
 *
 * Setzt wie die Profi-Figur voraus, dass die Primärfarbe die dunklere der beiden ist — die
 * Schrift steht in der Sekundärfarbe darauf. Bei einem Verein mit hellem Primärton müsste hier
 * (und im Trikot) getauscht werden; die beiden vorhandenen Pakete sind dunkel auf weiß.
 */
export function Wappen({
  farben,
  kuerzel,
}: {
  farben: { primaer: string; sekundaer: string }
  kuerzel: string
}) {
  return (
    <svg viewBox="0 0 100 118" className="h-full w-full" aria-hidden="true">
      <path
        d="M8 8 h84 v56 q0 32 -42 46 q-42 -14 -42 -46z"
        fill={farben.primaer}
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path d="M50 11 v97" stroke={farben.sekundaer} strokeWidth="3" opacity="0.25" />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="34"
        fontWeight="900"
        fill={farben.sekundaer}
        fontFamily="system-ui"
      >
        {kuerzel}
      </text>
    </svg>
  )
}

/** Profispieler als Gesprächspartner (C5). Trägt die Vereinsfarben. */
export function ProfiFigur({ farben }: { farben: { primaer: string; sekundaer: string } }) {
  return (
    <svg viewBox="0 0 160 190" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="184" rx="44" ry="6" fill="#000" opacity="0.1" />
      <path d="M62 140 v34 M98 140 v34" stroke="#f0c9a4" strokeWidth="16" strokeLinecap="round" />
      <path d="M54 178 h16 M90 178 h16" stroke="#2b2b2b" strokeWidth="12" strokeLinecap="round" />
      <path d="M46 118 h68 v28 h-24 l-4 -14 -12 0 -4 14 h-24z" fill="#2b2b2b" opacity="0.85" />
      <path d="M42 122 q38 -16 76 0 l6 -50 q-14 -14 -30 -18 h-28 q-16 4 -30 18z" fill={farben.primaer} />
      <path d="M74 56 h12 v18 h-12z" fill={farben.sekundaer} opacity="0.9" />
      <path d="M36 76 l-10 40 15 5 13 -36z M124 76 l10 40 -15 5 -13 -36z" fill={farben.primaer} />
      <circle cx="29" cy="122" r="8" fill="#f0c9a4" />
      <circle cx="131" cy="122" r="8" fill="#f0c9a4" />
      <circle cx="80" cy="36" r="26" fill="#f0c9a4" />
      <path d="M54 32 a26 26 0 0 1 52 0 q-26 -12 -52 0z" fill="#5a3b23" />
      <circle cx="71" cy="36" r="3" fill="#2b2b2b" />
      <circle cx="89" cy="36" r="3" fill="#2b2b2b" />
      <path d="M71 46 q9 7 18 0" stroke="#2b2b2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
