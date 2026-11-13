import type { Verein } from '../content/typen'
import { ProfiFigur, Wappen } from '../ui/Figuren'
import { useVorlesen } from '../ui/vorlesen'

/**
 * Das Lob des Profis nach einer Übung (C5).
 *
 * Eigener Bildschirm statt des allgemeinen `DialogScreen`, weil hier zwei Dinge erkennbar sein
 * müssen, die sonst nirgends stehen: **wer** lobt und **wo** Ben gerade trainiert. Deshalb die
 * Stadionkulisse in den Vereinsfarben, das Wappen und das Namensschild des Profis — dieselbe
 * Bildsprache wie in „Ball hochhalten", damit das Lob zum Spiel gehört und nicht wie ein
 * Systemdialog aussieht.
 *
 * **Ohne Sterne und ohne Zahl.** Vorher standen hier ein bis drei Sterne aus der groben
 * Browser-Genauigkeit. Die ist im ganzen Projekt als *unmaßgeblich* markiert und darf nicht
 * einmal in einen Bericht — als Note für ein Kind taugt sie erst recht nicht. „Ein Stern" liest
 * sich außerdem wie ein Scheitern (C2), und eine sichtbare Bewertung direkt nach der
 * Selbsteinschätzung lehrt Ben, seine Antwort am Urteil auszurichten statt an seinem Gefühl (C3).
 * Fortschritt zeigt die Landkarte, die Bestleistung sagt der Profi (C4, C5).
 *
 * A2: fünf Dinge auf dem Bildschirm — Kulisse, Wappen, Profi mit Schild, Sprechblase, Knopf.
 */
export function LobScreen({
  verein,
  text,
  onWeiter,
}: {
  verein: Verein
  text: string
  onWeiter: () => void
}) {
  useVorlesen(text)

  return (
    <div className="relative h-full overflow-hidden">
      <Kulisse verein={verein} />

      <div className="relative flex h-full flex-col items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3 rounded-2xl bg-white/85 px-5 py-2 shadow-lg">
          <div className="h-12 w-10">
            <Wappen farben={verein.farben} kuerzel={verein.id.toUpperCase().slice(0, 3)} />
          </div>
          <span className="text-xl font-black text-slate-700">{verein.name}</span>
        </div>

        <div className="flex w-full max-w-5xl items-center justify-center gap-4">
          {/* Der Profi steht groß und im Scheinwerferlicht: C5 verlangt, dass das Lob von der
              Spielfigur kommt — dann muss man sie auch sehen. */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 -m-6 rounded-full blur-xl"
              style={{ background: 'radial-gradient(circle, rgba(255,252,214,.75), transparent 70%)' }}
              aria-hidden="true"
            />
            <div className="relative h-80 w-64 sm:h-96 sm:w-72">
              <ProfiFigur farben={verein.farben} />
            </div>
            <div
              className="relative -mt-2 rounded-full px-5 py-1 text-center text-lg font-black text-white shadow-md"
              style={{ backgroundColor: verein.farben.primaer }}
            >
              {verein.profi.name}
            </div>
          </div>

          {/* Breite begrenzt: ohne das schiebt ein langer Lobtext — Ajax spricht zwei Zeilen —
              den Profi aus dem Bild. */}
          <div className="auftritt relative max-w-md rounded-3xl bg-white px-8 py-6 shadow-xl sm:max-w-lg">
            <div
              className="absolute top-1/2 -left-4 h-8 w-8 -translate-y-1/2 rotate-45 bg-white"
              aria-hidden="true"
            />
            <p className="text-3xl leading-snug font-bold text-slate-800 sm:text-4xl">{text}</p>
          </div>
        </div>

        <button
          onClick={onWeiter}
          className="taste bg-rasen text-white shadow-lg active:scale-95"
          autoFocus
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

/**
 * Stadionkulisse in den Vereinsfarben.
 *
 * Alle Farben kommen aus dem Vereinspaket, aufgehellt und abgedunkelt nur über Deckkraft —
 * dadurch braucht diese Datei keine Farbrechnung und ein neuer Verein keine Codeänderung.
 * Bewusst **ohne Animation**: Ben hat ADHS, der Bildschirm soll festlich wirken und nicht flackern
 * (A2). Bewegung gibt es nur einmalig beim Erscheinen der Sprechblase.
 */
function Kulisse({ verein }: { verein: Verein }) {
  const { primaer, sekundaer } = verein.farben

  return (
    <svg
      viewBox="0 0 900 640"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lob-himmel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ecdfb" />
          <stop offset="1" stopColor="#dff3ff" />
        </linearGradient>
        <radialGradient id="lob-schein">
          <stop offset="0" stopColor="#fffcd6" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fffcd6" stopOpacity="0" />
        </radialGradient>
        {/* Sitzschalen als Muster statt als hunderte Rechtecke. */}
        <pattern id="lob-sitze" width="26" height="18" patternUnits="userSpaceOnUse">
          <rect x="1" y="1" width="11" height="7" rx="2" fill="#fff" opacity="0.18" />
          <rect x="14" y="1" width="11" height="7" rx="2" fill="#fff" opacity="0.07" />
          <rect x="1" y="10" width="11" height="7" rx="2" fill="#fff" opacity="0.07" />
          <rect x="14" y="10" width="11" height="7" rx="2" fill="#fff" opacity="0.18" />
        </pattern>
      </defs>

      <rect width="900" height="130" fill="url(#lob-himmel)" />

      {[180, 720].map((x) => (
        <g key={x}>
          <circle cx={x} cy="52" r="86" fill="url(#lob-schein)" />
          <path d={`M${x} 130 V 64`} stroke="#9aa7b4" strokeWidth="9" strokeLinecap="round" />
          <rect x={x - 38} y="30" width="76" height="28" rx="6" fill="#8d9aa8" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={x - 27 + i * 18} cy="44" r="6" fill="#fffad6" opacity="0.95" />
          ))}
        </g>
      ))}

      {/* Zwei Ränge in der Vereinsfarbe, getrennt vom dunklen Umlauf. */}
      <rect y="120" width="900" height="16" fill="#2b3a4a" opacity="0.85" />
      <rect y="136" width="900" height="104" fill={primaer} />
      <rect y="136" width="900" height="104" fill="url(#lob-sitze)" />
      <rect y="240" width="900" height="20" fill="#000" opacity="0.35" />
      <rect y="260" width="900" height="96" fill={primaer} />
      <rect y="260" width="900" height="96" fill="url(#lob-sitze)" />
      {/* Schleier, damit Profi und Sprechblase davor nicht untergehen. */}
      <rect y="136" width="900" height="220" fill="#0a1018" opacity="0.14" />

      {/* Bande am Spielfeldrand: der Vereinsname, wie im Stadion. */}
      <rect y="356" width="900" height="36" fill={sekundaer} />
      <rect y="356" width="900" height="36" fill="#000" opacity="0.06" />
      {/* Der Name steht schon oben auf dem Banner; hier ist er Kulisse und nimmt sich
          entsprechend zurück. */}
      <text
        x="450"
        y="381"
        textAnchor="middle"
        fontSize="20"
        fontWeight="900"
        fill={primaer}
        fontFamily="system-ui"
        letterSpacing="8"
        opacity="0.45"
      >
        {verein.name.toUpperCase()}
      </text>

      {/* Rasen mit Mähstreifen — dieselbe Bildsprache wie in den Minispielen. */}
      <rect y="392" width="900" height="248" fill="#3f9d1e" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={i * 150} y="392" width="75" height="248" fill="#4cb327" />
      ))}
      <ellipse cx="450" cy="408" rx="300" ry="26" fill="#fff" opacity="0.12" />

      {/* Konfetti, gefallen und liegengeblieben: festlich, aber ruhig. */}
      {KONFETTI.map((k, i) => (
        <rect
          key={i}
          x={k.x}
          y={k.y}
          width="14"
          height="8"
          rx="2"
          transform={`rotate(${k.w} ${k.x + 7} ${k.y + 4})`}
          fill={[primaer, sekundaer, '#f6b81c'][i % 3]}
          opacity="0.9"
        />
      ))}
    </svg>
  )
}

/** Feste Streuung statt Zufall: der Bildschirm soll bei jedem Lob gleich aussehen. */
const KONFETTI = [
  { x: 70, y: 96 }, { x: 168, y: 42 }, { x: 262, y: 118 }, { x: 344, y: 30 },
  { x: 436, y: 86 }, { x: 520, y: 128 }, { x: 604, y: 52 }, { x: 690, y: 108 },
  { x: 786, y: 38 }, { x: 846, y: 122 }, { x: 118, y: 520 }, { x: 300, y: 572 },
  { x: 600, y: 528 }, { x: 800, y: 580 },
].map((k, i) => ({ ...k, w: (i * 47) % 360 }))
