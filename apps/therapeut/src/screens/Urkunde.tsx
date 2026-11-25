import { useEffect, useState } from 'react'
import { api, zeitpunkt, type KlientDetail, type UrkundeAntwort, type UrkundeExtra } from '../api'

/**
 * Die Urkunde zum Ansehen und Drucken (Ticket #10). Ben nimmt den Ausdruck mit nach Hause.
 *
 * Es gibt kein gespeichertes Bild: Bens Unterschrift wird hier aus den Rohdaten gezeichnet.
 * Das Blatt benutzt dieselben Koordinaten wie das Spiel auf dem Tablet
 * (`apps/web/src/spiele/abschiedsgeschenk/zeichnen.ts`), dadurch stimmt der Aufbau überein.
 *
 * Gedruckt wird wie beim Wochenbericht mit `@media print` (siehe index.css).
 */

/** Das Blatt auf der Bühne der Kind-App, mit etwas Rand im Seitenverhältnis von A4 quer. */
const BLATT = { x: 45, y: 3.6, breite: 810, hoehe: 572.7 }

/** Der Rahmen der Urkunde, gleich wie `URKUNDE` in der Kind-App. */
const RAHMEN = { x: 60, y: 16, breite: 780, hoehe: 548 }
const MITTE = 450

/** Die Unterschriftsfläche: linkes Ende, Breite und Grundlinie wie auf dem Tablet. */
const FLAECHE = { x: 200, breite: 460, grundlinie: 440 }
const PROFI = { x: 700, breite: 110 }

const F = {
  papier: '#fffdf5',
  schrift: '#334155',
  leise: '#64748b',
  hilfslinie: '#93c5fd',
  tinte: '#1e3a8a',
}

export function Urkunde({
  klient,
  ergebnisId,
  onZurueck,
}: {
  klient: KlientDetail
  ergebnisId: string
  onZurueck: () => void
}) {
  const [antwort, setAntwort] = useState<UrkundeAntwort | null>(null)

  useEffect(() => {
    setAntwort(null)
    void api.urkunde(klient.id, ergebnisId).then(setAntwort)
  }, [klient, ergebnisId])

  if (!antwort) return <p className="text-slate-500">Wird geladen…</p>

  const extra = liesExtra(antwort.extra)

  return (
    <div className="space-y-4">
      {/* Nur solange die Urkunde offen ist, druckt der Browser quer. Ohne Rand, damit er auch
          seine Kopf- und Fußzeile (Adresse, Datum) weglässt. */}
      <style>{'@page { size: A4 landscape; margin: 0 }'}</style>

      <div className="kein-druck flex flex-wrap items-center gap-4">
        <button
          onClick={onZurueck}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
        >
          Zurück zum Verlauf
        </button>
        {extra && (
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-slate-800 px-6 py-2 font-bold text-white"
          >
            Drucken
          </button>
        )}
        <p className="text-sm text-slate-500">
          {zeitpunkt(antwort.datum).toLocaleDateString('de-DE')} · Stufe {antwort.stufe}
        </p>
      </div>

      {extra ? (
        <Blatt antwort={antwort} extra={extra} />
      ) : (
        <p className="text-slate-500">Zu dieser Übung wurde keine Urkunde gespeichert.</p>
      )}
    </div>
  )
}

/** Ältere Ergebnisse (noch mit dem Platzhalter gespielt) haben keine Urkunde im `extra`. */
function liesExtra(text: string | null): UrkundeExtra | null {
  try {
    const extra = JSON.parse(text ?? 'null') as UrkundeExtra | null
    return extra?.urkunde ? extra : null
  } catch {
    return null
  }
}

/* ── Bens Striche aus den Rohdaten ─────────────────────────────────────── */

type Strich = { punkte: { x: number; y: number }[]; druck: number[] }

/**
 * Liest den Blob: little-endian, vier Float32 je Abtastung (`t`, `x`, `y`, `druck`).
 * Druck 0 heißt abgesetzt und beendet einen Strich. Es zählt nur der letzte Versuch, also die
 * Abtastungen ab dem letzten Neustart — wie auf dem Server (`Auswertung/Unterschrift.cs`).
 */
function liesStriche(werte: string, neustartsMs: number[]): Strich[] {
  const bytes = Uint8Array.from(atob(werte), (zeichen) => zeichen.charCodeAt(0))
  const blob = new DataView(bytes.buffer)
  const ab = Math.max(0, ...neustartsMs)

  const striche: Strich[] = []
  let offen: Strich | null = null

  for (let i = 0; i + 16 <= bytes.length; i += 16) {
    const t = blob.getFloat32(i, true)
    const x = blob.getFloat32(i + 4, true)
    const y = blob.getFloat32(i + 8, true)
    const druck = blob.getFloat32(i + 12, true)

    if (t < ab) continue
    if (druck <= 0) {
      offen = null
      continue
    }
    if (!offen) {
      offen = { punkte: [], druck: [] }
      striche.push(offen)
    }
    offen.punkte.push({ x, y })
    offen.druck.push(druck)
  }
  return striche
}

/* ── Das Blatt ─────────────────────────────────────────────────────────── */

function Blatt({ antwort, extra }: { antwort: UrkundeAntwort; extra: UrkundeExtra }) {
  const { urkunde, band, lineatur } = extra
  const r = RAHMEN

  // Ein Maßstab für beide Richtungen, damit die Schrift nicht verzerrt wird. Die Unterkante des
  // Bands ist die Grundlinie.
  const s = band ? FLAECHE.breite / band.breite : 1
  const bandHoehe = band ? band.hoehe * s : 0
  const striche = band && antwort.werte ? liesStriche(antwort.werte, extra.neustartsMs ?? []) : []

  const hoehenDerHilfslinien =
    lineatur === 'vier' ? [-bandHoehe, -bandHoehe / 2, bandHoehe / 2]
    : lineatur === 'zwei' ? [-bandHoehe / 2]
    : []

  return (
    <svg
      viewBox={`${BLATT.x} ${BLATT.y} ${BLATT.breite} ${BLATT.hoehe}`}
      className="urkundenblatt w-full max-w-5xl bg-white shadow-sm"
      fontFamily="system-ui, sans-serif"
      role="img"
      aria-label={`Urkunde ${urkunde.vereinName}`}
    >
      <rect x={BLATT.x} y={BLATT.y} width={BLATT.breite} height={BLATT.hoehe} fill={F.papier} />

      {/* Doppelter Rahmen und Kopfband in der Vereinsfarbe */}
      <g fill="none" stroke={urkunde.primaer}>
        <rect x={r.x + 14} y={r.y + 14} width={r.breite - 28} height={r.hoehe - 28} strokeWidth={6} />
        <rect x={r.x + 24} y={r.y + 24} width={r.breite - 48} height={r.hoehe - 48} strokeWidth={2} />
      </g>
      <rect x={r.x + 24} y={r.y + 24} width={r.breite - 48} height={42} fill={urkunde.primaer} />

      <g textAnchor="middle" dominantBaseline="central">
        <text x={MITTE} y={r.y + 46} fontSize={18} fontWeight={800} fill={urkunde.sekundaer}>
          PROBETRAINING BESTANDEN
        </text>
        <text x={MITTE} y={r.y + 112} fontSize={48} fontWeight={800} fill={F.schrift}>
          U R K U N D E
        </text>
        <text x={MITTE} y={r.y + 192} fontSize={30} fontWeight={700} fill={F.schrift}>
          Probetraining: {urkunde.vereinName}
        </text>
        <text x={MITTE} y={r.y + 228} fontSize={24} fontWeight={600} fill={F.leise}>
          5 Trainingstage geschafft
        </text>
      </g>

      <Wappen x={132} y={330} primaer={urkunde.primaer} sekundaer={urkunde.sekundaer} />

      {/* Lineatur wie auf dem Tablet, damit Thomas die Schrift darauf beurteilen kann */}
      {hoehenDerHilfslinien.map((h) => (
        <line
          key={h}
          x1={FLAECHE.x} x2={FLAECHE.x + FLAECHE.breite}
          y1={FLAECHE.grundlinie + h} y2={FLAECHE.grundlinie + h}
          stroke={F.hilfslinie} strokeWidth={1.5} strokeDasharray="10 8"
        />
      ))}
      <line
        x1={FLAECHE.x} x2={FLAECHE.x + FLAECHE.breite}
        y1={FLAECHE.grundlinie} y2={FLAECHE.grundlinie}
        stroke={F.schrift} strokeWidth={2.5}
      />
      <line
        x1={PROFI.x} x2={PROFI.x + PROFI.breite}
        y1={FLAECHE.grundlinie} y2={FLAECHE.grundlinie}
        stroke={F.schrift} strokeWidth={2.5}
      />

      <g fontSize={16} fontWeight={600} fill={F.leise}>
        <text x={FLAECHE.x} y={FLAECHE.grundlinie + 90}>Spieler</text>
        <text x={PROFI.x} y={FLAECHE.grundlinie + 90}>Trainer</text>
        {/* Eine Maus-Unterschrift soll niemand neben eine Pencil-Probe legen. */}
        {antwort.eingabegeraet === 'mouse' && striche.length > 0 && (
          <text
            x={FLAECHE.x + FLAECHE.breite} y={FLAECHE.grundlinie + 90}
            textAnchor="end" fontStyle="italic"
          >
            mit Maus geschrieben
          </text>
        )}
      </g>

      {/* Profi-Unterschrift und Stempel. Lange Namen werden kleiner, damit sie auf die Linie passen. */}
      <text
        x={PROFI.x + PROFI.breite / 2} y={FLAECHE.grundlinie - 8}
        textAnchor="middle" fontFamily="cursive" fontStyle="italic"
        fontSize={Math.min(34, 220 / urkunde.profi.length)} fill={F.tinte}
      >
        {urkunde.profi}
      </text>
      <g transform="translate(755 345) rotate(-12)" opacity={0.85}>
        <circle r={50} fill="none" stroke={urkunde.primaer} strokeWidth={5} />
        <circle r={43} fill="none" stroke={urkunde.primaer} strokeWidth={1.5} />
        <g transform="scale(0.6)">
          <Wappen x={0} y={-46} primaer={urkunde.primaer} sekundaer={urkunde.sekundaer} />
        </g>
      </g>

      {/* Bens Unterschrift. Jeder Strich ist eine eigene Linie — zwischen zwei Strichen bleibt
          das Papier leer. Die Breite folgt dem mittleren Druck (2–5 wie auf dem Tablet). */}
      {band && (
        <g fill="none" stroke={F.tinte} strokeLinecap="round" strokeLinejoin="round">
          {striche.map((strich, i) => {
            const punkte = strich.punkte.map((p) => {
              const x = FLAECHE.x + (p.x - band.x) * s
              const y = FLAECHE.grundlinie + (p.y - (band.y + band.hoehe)) * s
              return `${x.toFixed(2)},${y.toFixed(2)}`
            })
            // Ein i-Punkt kann aus einer einzigen Abtastung bestehen. Eine Linie mit nur einem
            // Punkt zeichnet SVG nicht, deshalb steht der erste doppelt.
            const druck = strich.druck.reduce((a, b) => a + b, 0) / strich.druck.length
            return (
              <polyline
                key={i}
                points={[punkte[0], ...punkte].join(' ')}
                strokeWidth={2 + 3 * druck}
              />
            )
          })}
        </g>
      )}
    </svg>
  )
}

/** Schild in Vereinsfarben, 76 × 92. `x` ist die Mitte, `y` die Oberkante. */
function Wappen({ x, y, primaer, sekundaer }: {
  x: number
  y: number
  primaer: string
  sekundaer: string
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M -38 0 H 38 V 41.4 Q 38 78.2 0 92 Q -38 78.2 -38 41.4 Z"
        fill={primaer} stroke={F.schrift} strokeWidth={3}
      />
      {/* Der Querstreifen liegt ganz oben in der Rundung, dort ist das Schild noch fast gerade. */}
      <rect x={-36.5} y={33} width={73} height={16.6} fill={sekundaer} />
    </g>
  )
}
