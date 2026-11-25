import { useEffect, useRef, useState } from 'react'
import type { Verein } from '../content/typen'
import type { SpielErgebnis } from '../engine/segmente'
import { abschnitt, unterschriftAusRohdaten } from '../spiele/abschiedsgeschenk/abschied'
import { klang, schliesseKlang } from '../spiele/abschiedsgeschenk/klang'
import { bandFuer } from '../spiele/abschiedsgeschenk/welt'
import {
  berechneSicht, zeichneProfiUnterschrift, zeichneUrkunde, type Sicht, type UrkundenBild,
} from '../spiele/abschiedsgeschenk/zeichnen'
import { useVorlesen } from '../ui/vorlesen'

/**
 * Das Lob nach der Urkunde (#8): statt des Standardlobs zeigt der Profi die Urkunde mit Bens
 * Unterschrift, unterschreibt daneben, stempelt und verabschiedet sich mit Bens Spielnamen.
 * Gilt nur für Spiele der Rolle `sonder`; alle anderen behalten den `LobScreen`.
 *
 * Bens Striche kommen aus den Rohdaten des Ergebnisses (`unterschriftAusRohdaten`), die Urkunde
 * zeichnet dieselbe Funktion wie das Spiel. Keine Sterne, keine Zahl (C3): die Smiley-Frage
 * lag davor.
 *
 * A2: Urkunde, Sprechblase, Knopf. Die Blase und „Weiter" erscheinen erst nach dem Stempel.
 */
export function AbschiedScreen({
  verein, name, ergebnis, text, angehalten, onWeiter,
}: {
  verein: Verein
  name: string
  ergebnis: SpielErgebnis
  /** Der Abschiedstext, `{name}` ist schon ersetzt. */
  text: string
  angehalten: boolean
  onWeiter: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Die Bildschleife liegt außerhalb von React und liest das Anhalten über die Referenz.
  const pause = useRef(angehalten)
  const [textDa, setTextDa] = useState(false)
  // Erst wenn der Text erscheint, wird er auch vorgelesen.
  useVorlesen(textDa ? text : '')

  useEffect(() => {
    pause.current = angehalten
  }, [angehalten])

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    if (!cv || !g) return

    // Alles, was auf dem Blatt steht. Das Band in Bühnenmaßen kennt `bandFuer`.
    const { band, lineatur } = bandFuer(ergebnis.stufe)
    const bild: UrkundenBild = {
      urkunde: ergebnis.extra.urkunde as UrkundenBild['urkunde'],
      wort: verein.urkunde,
      name,
      band,
      lineatur,
      vorlage: 'keine',
      schrift: unterschriftAusRohdaten(ergebnis),
    }

    let sicht: Sicht = { s: 1, dx: 0, dy: 0 }
    const passeAn = () => {
      const r = cv.getBoundingClientRect()
      if (!r.width || !r.height) return
      const dpr = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      sicht = berechneSicht(cv.width, cv.height)
    }
    passeAn()
    const beobachter = new ResizeObserver(passeAn)
    beobachter.observe(cv)

    // Angehalten steht die Uhr, und damit die Animation.
    let uhr = 0
    let stempelGehoert = false
    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function zeichne(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt
      if (!pause.current) uhr += dt
      const a = abschnitt(uhr)

      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, cv.width, cv.height)
      g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
      zeichneUrkunde(g, bild)
      zeichneProfiUnterschrift(g, bild, a.profiAnteil, a.stempel)

      if (a.stempel && !stempelGehoert) {
        stempelGehoert = true
        klang.stempel()
      }
      if (a.text) setTextDa(true)
      raf = requestAnimationFrame(zeichne)
    })

    return () => {
      cancelAnimationFrame(raf)
      beobachter.disconnect()
      schliesseKlang()
    }
  }, [verein, name, ergebnis])

  return (
    <div className="flex h-full flex-col gap-3 bg-himmel-hell p-4">
      <canvas ref={canvasRef} className="block min-h-0 w-full flex-1" />

      <div className="flex min-h-24 items-center justify-center gap-6">
        {textDa && (
          <>
            <p className="auftritt max-w-3xl rounded-3xl bg-white px-6 py-3 text-2xl leading-snug font-bold text-slate-800 shadow-xl sm:text-3xl">
              {text}
            </p>
            <button
              onClick={onWeiter}
              className="taste bg-rasen text-white shadow-lg active:scale-95"
              autoFocus
            >
              Weiter
            </button>
          </>
        )}
      </div>
    </div>
  )
}
