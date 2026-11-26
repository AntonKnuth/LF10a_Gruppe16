import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { aktualisiere, ergebnis, hebeAb, neueWelt, schreibe, setzeAn, type Welt } from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Autogrammstunde" (B2, Grafomotorik + Pinzettengriff).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung steht in
 * `welt.ts`, das Bild in `zeichnen.ts`.
 *
 * Beendet wird ausschließlich von der Uhr des SpielScreens. Ist ein Trikot signiert,
 * kommt der nächste Fan — weder vorzeitiges Ende noch Verliererzustand (C2).
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function Autogrammstunde({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, zeitAus, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Der Verein bringt Farben und Kader mit — ein neuer Verein ist eine Content-Datei.
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

    /** Was `schreibe` meldet, klingt sofort — das ist die Rückmeldung unter 100 ms aus A1. */
    const melde = (ereignis: ReturnType<typeof schreibe>) => {
      if (ereignis) klang[ereignis]()
    }

    /* Stift aufs Trikot — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      w.geraet = geraetVon(e)
      setzeAn(w)
      melde(schreibe(w, p.x, p.y, druckVon(e)))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e, cv, sicht)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      if (!w.schreibt || pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Strecke.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        melde(schreibe(w, q.x, q.y, druckVon(fein)))
      }
    }

    const hoch = () => hebeAb(w)
    const raus = () => {
      w.zeiger.drin = false
      hebeAb(w)
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', raus)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)

    const endeSchleife = starteBildschleife((dt) => {
      // Angehalten wird nur gezeichnet, nicht gerechnet: das Bild steht still.
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
    // Weiterspielen einen Strich quer über das Trikot.
    if (angehalten && weltRef.current) hebeAb(weltRef.current)
  }, [angehalten])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
