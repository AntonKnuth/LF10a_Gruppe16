import { useCallback, useEffect, useRef, useState } from 'react'
import { SPIELE, type SpielProps } from '../spiele'
import type { SpielErgebnis } from '../engine/segmente'
import type { Verein } from '../content/typen'
import { druckVon, feinEreignisse } from '../eingabe'
import { neueAufzeichnung } from '../rohdaten'
import { useVorlesen } from '../ui/vorlesen'

/**
 * Rahmen um jedes Minispiel: Anweisung (A5), sichtbarer Timer (A3) — und die
 * Rohdatenaufzeichnung (B4).
 *
 * Die Aufzeichnung sitzt bewusst **hier** und nicht in den Spielen: die Zeigerereignisse steigen
 * aus dem Canvas hierher auf, also zeichnet jedes Minispiel auf, ohne eine Zeile dafür zu
 * enthalten. Wer ein neues Spiel baut, muss an B4 nicht denken.
 *
 * Aufgezeichnet wird in den Bildschirmkoordinaten dieses Bereichs, nicht in den logischen
 * Koordinaten des jeweiligen Spiels — die maßgeblichen Kennzahlen (Zittern, Tempo,
 * Druckstabilität) beschreiben die Handbewegung, nicht die Spielmechanik.
 */
export function SpielScreen({
  spielId,
  dauerSek,
  stufe,
  verein,
  name,
  angehalten,
  onFertig,
}: {
  spielId: string
  dauerSek: number
  stufe: number
  verein: Verein
  name: string
  /** Das Pausenmenü ist offen. */
  angehalten: boolean
  onFertig: (ergebnis: SpielErgebnis) => void
}) {
  const spiel = SPIELE[spielId]
  const [rest, setRest] = useState(dauerSek)
  useVorlesen(spiel?.anweisung ?? '')

  const flaeche = useRef<HTMLElement>(null)
  const aufzeichnung = useRef(neueAufzeichnung())
  const beginn = useRef(performance.now())
  const unten = useRef(false)

  // Angehalten steht auch die Uhr. Sonst kostet eine Pause Ben Spielzeit — A3 verlangt
  // 3 bis 5 Minuten Übung, nicht 3 bis 5 Minuten Bildschirm.
  useEffect(() => {
    if (angehalten) return
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [angehalten])

  const nimmAuf = useCallback((e: React.PointerEvent, druckWert?: number) => {
    const r = flaeche.current?.getBoundingClientRect()
    if (!r) return
    // Volle Abtastrate des Pencils; `rohdaten.ts` dünnt danach auf ~60 Hz aus.
    for (const fein of feinEreignisse(e.nativeEvent)) {
      aufzeichnung.current.punkt(
        fein.timeStamp - beginn.current,
        fein.clientX - r.left,
        fein.clientY - r.top,
        druckWert ?? druckVon(fein).wert,
      )
    }
  }, [])

  const fertig = useCallback(
    (ergebnis: SpielErgebnis) => {
      onFertig({
        ...ergebnis,
        // Vom Gerät vergeben: dadurch ist ein wiederholter Upload ein Upsert.
        id: ergebnis.id ?? crypto.randomUUID(),
        // Maßgeblich ist der Tagesplan, nicht was das Spiel über sich selbst sagt. Der
        // Platzhalter meldet sonst für jede Übung „platzhalter", und im Bericht des
        // Therapeuten steht dann nicht mehr, welche Übung Ben gemacht hat.
        spielId,
        rohdaten: aufzeichnung.current.fertig(),
      })
    },
    [onFertig, spielId],
  )

  if (!spiel) return <p className="p-8 text-2xl">Unbekanntes Spiel: {spielId}</p>

  const props: SpielProps = {
    stufe, verein, name, angehalten, zeitAbgelaufen: rest === 0, onFertig: fertig,
  }
  const min = Math.floor(rest / 60)
  const sek = String(rest % 60).padStart(2, '0')

  return (
    <div className="flex h-full flex-col bg-himmel-hell">
      <header className="flex items-center gap-6 bg-white/70 px-8 py-4">
        <p className="flex-1 text-2xl font-bold text-slate-800">{spiel.anweisung}</p>
        <div className="flex items-center gap-3">
          <div className="h-3 w-40 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-rasen transition-[width] duration-1000 ease-linear"
              style={{ width: `${dauerSek > 0 ? (rest / dauerSek) * 100 : 0}%` }}
            />
          </div>
          <span className="w-20 text-right font-mono text-2xl font-bold text-slate-600 tabular-nums">
            {min}:{sek}
          </span>
        </div>
      </header>

      {/* `…Capture`, damit die Aufzeichnung auch dann läuft, wenn das Spiel das Ereignis
          selbst abfängt. Sie verändert nichts und hält nichts auf. */}
      <main
        ref={flaeche}
        className="min-h-0 flex-1"
        onPointerDownCapture={(e) => {
          if (angehalten) return
          unten.current = true
          nimmAuf(e)
        }}
        onPointerMoveCapture={(e) => !angehalten && unten.current && nimmAuf(e)}
        onPointerUpCapture={(e) => {
          // Druck 0 markiert das Absetzen. Ohne diesen Punkt ließe sich die
          // Absetzhäufigkeit nicht aus der Punktfolge ablesen.
          nimmAuf(e, 0)
          unten.current = false
        }}
        onPointerCancelCapture={() => {
          unten.current = false
        }}
      >
        <spiel.Komponente {...props} />
      </main>
    </div>
  )
}
