import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { aktualisiere, ergebnis, neueWelt, ziehe, type Welt } from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Linie malen" (B2, Grafomotorik — gerade Striche).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung steht in
 * `welt.ts`, das Bild in `zeichnen.ts`.
 *
 * Beendet wird ausschließlich von der Uhr des SpielScreens. Ist eine Bahn geschafft,
 * kommt die nächste — es gibt weder ein vorzeitiges Ende noch einen Verliererzustand (C2).
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function LinieMalen({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, zeitAus, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Der Verein bringt die Farben mit — ein neuer Verein ist eine Content-Datei.
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

    /** Was `ziehe` meldet, klingt sofort — das ist die Rückmeldung unter 100 ms aus A1. */
    const melde = (ereignis: ReturnType<typeof ziehe>) => {
      if (ereignis) klang[ereignis]()
    }

    /* Stift auf den Rasen — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      w.geraet = geraetVon(e)
      w.zieht = true
      melde(ziehe(w, p.x, p.y, druckVon(e)))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e, cv, sicht)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      if (!w.zieht || pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Genauigkeit.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        melde(ziehe(w, q.x, q.y, druckVon(fein)))
      }
    }

    const hoch = () => {
      w.zieht = false
    }
    const raus = () => {
      w.zeiger.drin = false
      w.zieht = false
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', raus)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)

    const endeSchleife = starteBildschleife((dt) => {
      // Angehalten wird nur gerechnet, nicht gezeichnet.
      if (!pause.current) aktualisiere(w, dt)
      zeichne(g, w, sicht, cv.width, cv.height)
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
    }
  }, [pause, zeitAus, meldeFertig])

  useEffect(() => {
    // Angehalten liegt kein Stift mehr auf; sonst zöge der erste Punkt nach dem
    // Weiterspielen eine Gerade quer über den Platz.
    if (angehalten && weltRef.current) weltRef.current.zieht = false
  }, [angehalten])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
