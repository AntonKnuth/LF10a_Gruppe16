import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon, tastenDruckLauscher } from '../../eingabe'
import { aktualisiere, ergebnis, maehe, neueWelt, type Welt } from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Platzwart" (B2, Kraftdosierung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung steht in
 * `welt.ts`, das Bild in `zeichnen.ts`.
 *
 * Beendet wird ausschließlich von der Uhr des SpielScreens. Ist ein Platz geschafft,
 * kommt der nächste — es gibt weder ein vorzeitiges Ende noch einen Verliererzustand (C2).
 */
export function Platzwart({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, zeitAus, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Der Verein bringt die Farben der Bande mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein, regler)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    // Wer weniger Bewegung wünscht, bekommt keine Funken.
    w.wenigerBewegung = wenigerBewegung()

    let sicht = LEERE_SICHT
    const endeBeobachten = beobachteLeinwand(cv, () => {
      sicht = berechneSicht(cv.width, cv.height)
    })

    /* Letzter gemähter Punkt — die Strecke dorthin wird beim nächsten Ereignis
       mitgemäht, damit eine schnelle Bewegung keine Streifen stehen lässt. */
    let letzter = { x: 0, y: 0 }

    /* Beim Mähen trifft fast jedes Ereignis eine neue Zelle. Ein Tick je Ereignis wäre
       ein Dauerton (A4), deshalb höchstens alle 120 ms; der Fertig-Ton kommt immer. */
    let letzterTick = 0
    const melde = (ereignis: ReturnType<typeof maehe>) => {
      if (!ereignis) return
      const jetzt = performance.now()
      if (ereignis === 'schnitt' && jetzt - letzterTick < 120) return
      letzterTick = jetzt
      klang[ereignis]()
    }

    /* Stift auf den Rasen — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      w.maeher = { x: p.x, y: p.y, drin: true }
      w.geraet = geraetVon(e)
      w.druck = druckVon(e)
      w.maeht = true
      letzter = p
      // Auch ein Tippen ohne Bewegung mäht die Stelle unter dem Mäher.
      melde(maehe(w, p.x, p.y, p.x, p.y, w.druck))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e, cv, sicht)
      w.maeher = { x: p.x, y: p.y, drin: true }
      if (!w.maeht) {
        w.druck = druckVon(e)
        return
      }
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Druckkurve.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        const d = druckVon(fein)
        melde(maehe(w, letzter.x, letzter.y, q.x, q.y, d))
        letzter = q
        w.druck = d
      }
    }

    const hoch = () => {
      w.maeht = false
    }
    const raus = () => {
      w.maeher.drin = false
      w.maeht = false
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', raus)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)
    // Zifferntaste ändert den Ersatzdruck sofort, auch wenn die Maus stillsteht.
    const abTasten = tastenDruckLauscher((d) => {
      w.druck = d
    })

    const endeSchleife = starteBildschleife((dt) => {
      // Angehalten wird nur gezeichnet, nicht gerechnet: das Bild steht still.
      if (!pause.current) melde(aktualisiere(w, dt))
      zeichne(g, w, sicht, cv.width, cv.height)
      // Nur die Uhr beendet das Spiel: ein geschaffter Platz wird gefeiert, dann kommt
      // der nächste. Kein Verliererzustand und kein vorzeitiges Ende (C2).
      if (zeitAus.current) meldeFertig(() => ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
    })

    return () => {
      endeSchleife()
      endeBeobachten()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      cv.removeEventListener('pointerleave', raus)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', hoch)
      abTasten()
    }
  }, [pause, zeitAus, meldeFertig])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
