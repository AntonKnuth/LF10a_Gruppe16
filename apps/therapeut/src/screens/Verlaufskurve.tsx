import { useState } from 'react'
import { DRIBBELN_ID, reglerAbweichung, zeitpunkt, type VerlaufPunkt } from '../api'

/**
 * Liniendiagramm einer Übung (C4). Reines SVG, keine Bibliothek.
 *
 * Die Stufe wird nicht herausgerechnet, sondern sichtbar gemacht: Farbe und Zahl im Punkt, dazu
 * eine senkrechte Linie bei jedem Wechsel. Sonst sähe eine vom Therapeuten erhöhte Anforderung
 * wie eine Verschlechterung aus. Für die Regler gilt dasselbe.
 */

/** Eine wählbare Kennzahl. `wert` gibt `null`, wenn es sie bei dieser Übung nicht gibt — der
 *  Punkt fällt dann aus der Kurve und wird als ausgelassen gezählt. */
type Kennzahl = {
  name: string
  titel: string
  achse: string
  stellen: number
  wert: (p: VerlaufPunkt) => number | null
}

/** Gibt es bei jeder Übung mit Rohdaten. */
const KENNZAHLEN: Kennzahl[] = [
  { name: 'zittern', titel: 'Zittern', achse: 'Zittern (Grad)', stellen: 1,
    wert: (p) => p.kennzahlen?.zittern ?? null },
  { name: 'tempoMittel', titel: 'Tempo', achse: 'Tempo (Bildpunkte je Sekunde)', stellen: 1,
    wert: (p) => p.kennzahlen?.tempoMittel ?? null },
  { name: 'druckMittel', titel: 'Druck', achse: 'Druck (0 bis 1)', stellen: 2,
    wert: (p) => p.kennzahlen?.druckMittel ?? null },
  { name: 'druckStreuung', titel: 'Druck-Streuung', achse: 'Druck-Streuung', stellen: 2,
    wert: (p) => p.kennzahlen?.druckStreuung ?? null },
  { name: 'absetzer', titel: 'Absetzer', achse: 'Absetzer (Anzahl)', stellen: 0,
    wert: (p) => p.kennzahlen?.absetzer ?? null },
]

/** Nur bei „Dribbeln mit Pfiff". Sie stehen dort vorn, weil um sie es in dem Spiel geht. */
const INHIBITION_KENNZAHLEN: Kennzahl[] = [
  { name: 'reaktion', titel: 'Reaktionszeit', achse: 'Reaktionszeit, Median (ms)', stellen: 0,
    wert: (p) => p.inhibition?.reaktionMedianMs ?? null },
  { name: 'reaktionStreuung', titel: 'Reaktion-Streuung', achse: 'Streuung der Reaktionszeit (ms)',
    stellen: 0, wert: (p) => p.inhibition?.reaktionStreuungMs ?? null },
  // Prozent nur hier im Therapeutenbereich (C4).
  { name: 'stoppQuote', titel: 'Saubere Stopps', achse: 'Saubere Stopps (%)', stellen: 0,
    wert: (p) => (p.inhibition ? p.inhibition.stoppQuote * 100 : null) },
  { name: 'fehlstarts', titel: 'Fehlstarts', achse: 'Fehlstarts (Anzahl)', stellen: 0,
    wert: (p) => p.inhibition?.fehlstarts ?? null },
  { name: 'abheber', titel: 'Abgehoben', achse: 'Beim Stopp abgehoben (Anzahl)', stellen: 0,
    wert: (p) => p.inhibition?.abheber ?? null },
]

const kennzahlenFuer = (spielId: string) =>
  spielId === DRIBBELN_ID ? [...INHIBITION_KENNZAHLEN, ...KENNZAHLEN] : KENNZAHLEN

/** Von hell nach dunkel: eine höhere Stufe ist auch ohne Farbensehen dunkler. */
const STUFEN_FARBE = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b']
const farbe = (stufe: number) => STUFEN_FARBE[stufe - 1] ?? '#64748b'
const schriftfarbe = (stufe: number) => (stufe <= 2 ? '#0f172a' : '#ffffff')

const F = { text: '#475569', gitter: '#e2e8f0', linie: '#94a3b8', regler: '#9333ea', abbruch: '#b91c1c' }

/** So breit ist der Inhalt auf dem iPad quer. Auf größeren Bildschirmen wächst das Bild mit. */
const BREITE = 720
const HOEHE = 310
const RAND = { links: 60, rechts: 20, oben: 46, unten: 48 }
const RADIUS = 9
/** Schmaler darf ein Platz nicht werden, sonst verdecken sich die Punkte. Dann scrollt das Bild. */
const PLATZ_MIN = 2 * RADIUS + 4

export function Verlaufskurve({ spielId, punkte }: { spielId: string; punkte: VerlaufPunkt[] }) {
  const auswahl = kennzahlenFuer(spielId)
  const [name, setName] = useState(auswahl[0].name)
  const kennzahl = auswahl.find((k) => k.name === name) ?? auswahl[0]

  const mitWerten = punkte.filter((p) => kennzahl.wert(p) !== null)
  const ausgelassen = punkte.length - mitWerten.length

  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="kennzahl" className="text-sm font-semibold text-slate-600">Kennzahl</label>
        <select
          id="kennzahl"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {auswahl.map((k) => (
            <option key={k.name} value={k.name}>{k.titel}</option>
          ))}
        </select>
        {ausgelassen > 0 && (
          <span className="text-xs text-slate-500">
            {/* Bei der Impulskontrolle auch, wenn es weniger als fünf gewertete Pfiffe gab. */}
            {ausgelassen} ohne Wert für diese Kennzahl ausgelassen
          </span>
        )}
      </div>

      {mitWerten.length === 0 ? (
        <p className="text-sm text-slate-500">Zu dieser Übung gibt es noch keine Messwerte.</p>
      ) : (
        <>
          <Kurve punkte={mitWerten} kennzahl={kennzahl} />
          <Legende stufen={[...new Set(mitWerten.map((p) => p.stufe))].sort()} />
        </>
      )}
    </section>
  )
}

type Stelle = { p: VerlaufPunkt; wert: number; x: number; y: number }

function Kurve({ punkte, kennzahl }: { punkte: VerlaufPunkt[]; kennzahl: Kennzahl }) {
  const breite = Math.max(BREITE, RAND.links + RAND.rechts + punkte.length * PLATZ_MIN)
  const platz = (breite - RAND.links - RAND.rechts) / punkte.length
  const unten = HOEHE - RAND.unten

  // Die Skala beginnt bei 0: ein abgeschnittener Anfang ließe kleine Schwankungen groß aussehen.
  // Punkte ohne Wert hat der Aufrufer schon herausgefiltert.
  const werte = punkte.map((p) => kennzahl.wert(p)!)
  const schritt = schrittweite(Math.max(...werte), kennzahl.stellen)
  const oberkante = schritt * Math.max(1, Math.ceil(Math.max(...werte) / schritt))
  const yVon = (wert: number) => unten - (wert / oberkante) * (unten - RAND.oben)

  // Jede Übung bekommt einen gleich breiten Platz, in zeitlicher Reihenfolge. Nach echter Uhrzeit
  // verteilt fielen zwei Durchgänge aus derselben Einheit aufeinander.
  const stellen: Stelle[] = punkte.map((p, i) => ({
    p,
    wert: werte[i],
    x: RAND.links + (i + 0.5) * platz,
    y: yVon(werte[i]),
  }))

  // Zwei getrennte Linien: echter Pencil-Druck und Ersatzdruck werden nie verbunden.
  const linie = (synthetisch: boolean) =>
    stellen
      .filter((s) => s.p.synthetischerDruck === synthetisch)
      .map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`)
      .join(' ')

  const striche = []
  for (let wert = 0; wert <= oberkante + schritt / 2; wert += schritt) striche.push(wert)

  // Höchstens so viele Datumsangaben, wie nebeneinander passen.
  const jedes = Math.ceil(70 / platz)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${breite} ${HOEHE}`}
        // Viele Übungen: lieber scrollen als die Schrift verkleinern.
        style={{ width: '100%', minWidth: breite > BREITE ? breite : undefined }}
        fontFamily="system-ui, sans-serif"
        fontSize={12}
        role="img"
        aria-label={`${kennzahl.titel} über ${punkte.length} Übungen`}
      >
        {/* Achsen */}
        {striche.map((wert) => (
          <g key={wert}>
            <line
              x1={RAND.links} x2={breite - RAND.rechts} y1={yVon(wert)} y2={yVon(wert)}
              stroke={F.gitter}
            />
            <text x={RAND.links - 8} y={yVon(wert) + 4} textAnchor="end" fill={F.text}>
              {wert.toFixed(schritt < 1 ? 2 : 0)}
            </text>
          </g>
        ))}
        <text
          transform={`translate(14 ${(RAND.oben + unten) / 2}) rotate(-90)`}
          textAnchor="middle" fill={F.text}
        >
          {kennzahl.achse}
        </text>
        {stellen.map((s, i) => i % jedes === 0 && (
          <text key={s.p.ergebnisId} x={s.x} y={unten + 18} textAnchor="middle" fill={F.text}>
            {zeitpunkt(s.p.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
          </text>
        ))}
        <text x={(RAND.links + breite) / 2} y={HOEHE - 8} textAnchor="middle" fill={F.text}>
          Datum der Übung (jede Übung ein Platz, Abstände sind keine Tage)
        </text>

        {/* Wechsel von Stufe und Reglern: senkrechte Linie zwischen zwei Punkten */}
        {stellen.map((s, i) => {
          if (i === 0) return null
          const vorher = stellen[i - 1].p
          const x = s.x - platz / 2
          const reglerVorher = reglerAbweichung(vorher) || 'Vorgabe'
          const reglerJetzt = reglerAbweichung(s.p) || 'Vorgabe'
          return (
            <g key={s.p.ergebnisId} textAnchor="middle">
              {vorher.stufe !== s.p.stufe && (
                <>
                  <line
                    x1={x} x2={x} y1={16} y2={unten}
                    stroke={F.text} strokeWidth={1.5} strokeDasharray="6 4"
                  />
                  <text x={x} y={12} fill={F.text} fontWeight={600}>
                    Stufe {vorher.stufe} → {s.p.stufe}
                  </text>
                </>
              )}
              {reglerVorher !== reglerJetzt && (
                <>
                  <title>{`Regler: ${reglerVorher} → ${reglerJetzt}`}</title>
                  {/* Etwas versetzt, damit beide Linien zu sehen sind, wenn alles auf einmal wechselt. */}
                  <line
                    x1={x + 3} x2={x + 3} y1={32} y2={unten}
                    stroke={F.regler} strokeWidth={1.5} strokeDasharray="2 3"
                  />
                  <text
                    x={x + 3} y={28} fill={F.regler} fontWeight={600}
                    stroke="white" strokeWidth={3} paintOrder="stroke"
                  >
                    Regler
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* Werte */}
        <polyline points={linie(false)} fill="none" stroke={F.linie} strokeWidth={2} />
        <polyline
          points={linie(true)} fill="none" stroke={F.linie} strokeWidth={2} strokeDasharray="5 4"
        />
        {stellen.map((s) => (
          <g key={s.p.ergebnisId} transform={`translate(${s.x} ${s.y})`}>
            <title>
              {`${zeitpunkt(s.p.datum).toLocaleDateString('de-DE')}: ${s.wert.toFixed(kennzahl.stellen)}, ` +
                `Stufe ${s.p.stufe}` +
                (s.p.synthetischerDruck ? ', synthetischer Druck' : '') +
                (s.p.abgebrochen ? ', abgebrochen' : '')}
            </title>
            <Marke stufe={s.p.stufe} synthetisch={s.p.synthetischerDruck} />
            {s.p.abgebrochen && <Abbruchkreuz />}
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Kreis: echter Druck. Raute: synthetischer. Die Zahl ist die Stufe. */
function Marke({ stufe, synthetisch }: { stufe: number; synthetisch: boolean }) {
  return (
    <>
      {synthetisch ? (
        <path
          d={`M 0 ${-RADIUS - 3} L ${RADIUS + 3} 0 L 0 ${RADIUS + 3} L ${-RADIUS - 3} 0 Z`}
          fill={farbe(stufe)} stroke="white" strokeWidth={2}
        />
      ) : (
        <circle r={RADIUS} fill={farbe(stufe)} stroke="white" strokeWidth={2} />
      )}
      <text
        textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={700} fill={schriftfarbe(stufe)}
      >
        {stufe}
      </text>
    </>
  )
}

/** Über dem Punkt, damit die Zahl der Stufe lesbar bleibt. */
function Abbruchkreuz() {
  return (
    <path
      d={`M -4 ${-RADIUS - 12} l 8 8 m 0 -8 l -8 8`}
      stroke={F.abbruch} strokeWidth={2.5} strokeLinecap="round"
    />
  )
}

function Legende({ stufen }: { stufen: number[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {stufen.map((stufe) => (
        <Eintrag key={stufe} text={`Stufe ${stufe}`}>
          <Marke stufe={stufe} synthetisch={false} />
        </Eintrag>
      ))}
      <Eintrag text="echter Druck (Stift)">
        <line x1={-14} x2={14} stroke={F.linie} strokeWidth={2} />
        <circle r={5} fill={F.text} />
      </Eintrag>
      <Eintrag text="synthetischer Druck (Maus, Finger)">
        <line x1={-14} x2={14} stroke={F.linie} strokeWidth={2} strokeDasharray="5 4" />
        <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" fill={F.text} />
      </Eintrag>
      <Eintrag text="abgebrochen">
        <g transform={`translate(0 ${RADIUS + 8})`}><Abbruchkreuz /></g>
      </Eintrag>
      <Eintrag text="Stufenwechsel">
        <line y1={-11} y2={11} stroke={F.text} strokeWidth={1.5} strokeDasharray="6 4" />
      </Eintrag>
      <Eintrag text="Regler geändert">
        <line y1={-11} y2={11} stroke={F.regler} strokeWidth={1.5} strokeDasharray="2 3" />
      </Eintrag>
    </ul>
  )
}

function Eintrag({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1">
      <svg viewBox="-15 -12 30 24" width={30} height={24} aria-hidden="true">{children}</svg>
      {text}
    </li>
  )
}

/** Abstand der Gitterlinien: etwa vier Linien, und immer 1, 2, 5 oder 10 mal eine Zehnerpotenz. */
function schrittweite(groesster: number, stellen: number): number {
  const kleinster = stellen === 0 ? 1 : 0.01
  const grob = Math.max(groesster / 4, kleinster)
  const zehner = 10 ** Math.floor(Math.log10(grob))
  return [1, 2, 5, 10].map((n) => n * zehner).find((s) => s >= grob)!
}
