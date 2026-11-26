import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon, tastenDruckLauscher } from '../../eingabe'
import { schliesseKlang, weckeKlang } from './klang'
import {
  aktualisiere, beginneAbpfiff, beginneLaden, ergebnis, loslassen, neueWelt, stelleDruck,
  zieleLaden, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'

/**
 * „Ball hochhalten" (B2, Hand-Auge + Kraftdosierung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Physik und Bewertung
 * stehen in `welt.ts`, das Bild in `zeichnen.ts`, der Ton in `klang.ts`.
 *
 * Der sichtbare Timer aus A3 gehört dem SpielScreen — das Spiel selbst endet nicht von
 * allein, es läuft, bis `zeitAbgelaufen` gesetzt wird. Kein Verliererzustand (C2).
 */
export function BallHochhalten({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Der Verein bringt Kulisse und Jubelrufe mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein, regler)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    w.wenigerBewegung = wenigerBewegung()
    let sicht = LEERE_SICHT
    const endeBeobachten = beobachteLeinwand(cv, () => {
      sicht = berechneSicht(cv.width, cv.height)
    })

    /* Stift auf den Ball — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      if (!beginneLaden(w, p.x, p.y, druckVon(e), geraetVon(e))) return
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e, cv, sicht)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      if (!w.laden.an) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Druckkurve.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        zieleLaden(w, q.x, q.y, druckVon(fein))
      }
    }

    const hoch = () => loslassen(w)
    const raus = () => {
      w.zeiger.drin = false
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', raus)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)
    // Zifferntaste ändert den Ersatzdruck sofort, auch wenn die Maus stillsteht.
    const abTasten = tastenDruckLauscher((d) => stelleDruck(w, d))

    const endeSchleife = starteBildschleife((dt) => {
      // Angehalten wird nur gezeichnet, nicht gerechnet: das Bild bleibt stehen, die Uhr des
      // Spiels läuft nicht weiter.
      if (!pause.current) aktualisiere(w, dt)
      zeichne(g, w, sicht, cv.width, cv.height)
      // Erst wenn der Schlussjubel durch ist, geht das Ergebnis weiter.
      if (w.abpfiff && w.abpfiffUhr <= 0) {
        meldeFertig(() => ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
      }
    })

    return () => {
      endeSchleife()
      endeBeobachten()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      cv.removeEventListener('pointerleave', raus)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', hoch)
      abTasten()
      schliesseKlang()
    }
  }, [pause, meldeFertig])

  /* Zeit um: erst pfeift der Schiedsrichter ab und das Stadion jubelt, dann meldet
     die Bildschleife das Ergebnis. */
  useEffect(() => {
    const w = weltRef.current
    if (zeitAbgelaufen && w) beginneAbpfiff(w)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
