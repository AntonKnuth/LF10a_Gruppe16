import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { vorlesen } from '../../ui/vorlesen'
import {
  ERMUTIGUNG_TEXT, HILFE_TEXT, aktualisiere, beende, ergebnis, hebeAb, merkeMassstab, neueWelt,
  schreibe, setzeAn, sprecherText, type Ereignis, type Massstab, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Startelf" (B2, Grafomotorik: Buchstabenform und Bewegungsrichtung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Die Regeln stehen in `welt.ts`,
 * das Bild in `zeichnen.ts`, die Buchstaben in `../schrift.ts`.
 *
 * Beendet wird von der Uhr des SpielScreens, aber erst bei abgehobenem Stift: dann hängt der Profi
 * die restlichen Magnete auf, und Ben sieht eine fertige Aufstellung (C2).
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf, den Handballen hält er auch fern; hier steht
 * keine Zeile dafür.
 */
export function Startelf({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  weltRef.current ??= neueWelt(stufe, verein, regler)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    // Wer weniger Bewegung wünscht, bekommt keine Funken und kein Pulsieren.
    w.wenigerBewegung = wenigerBewegung()

    let sicht = LEERE_SICHT
    const endeBeobachten = beobachteLeinwand(cv, () => {
      sicht = berechneSicht(cv.width, cv.height)
    })

    /** Bühne in den Koordinaten der Rohdaten: CSS-Pixel relativ zur Fläche des SpielScreens. */
    const massstab = (): Massstab => {
      const r = cv.getBoundingClientRect()
      const f = (cv.closest('main') ?? cv).getBoundingClientRect()
      const k = r.width / cv.width // CSS-Pixel je Canvas-Pixel
      return { s: sicht.s * k, dx: r.left - f.left + sicht.dx * k, dy: r.top - f.top + sicht.dy * k }
    }

    /** Klang sofort (A1), Stimme nur bei eingeschaltetem Ton — das prüft `vorlesen` selbst (A4). */
    const melde = (ereignis: Ereignis | undefined) => {
      if (!ereignis) return
      if (ereignis === 'hilfe') return vorlesen(HILFE_TEXT)
      if (ereignis === 'ermutigung') return vorlesen(ERMUTIGUNG_TEXT)
      klang[ereignis]()
      if (ereignis === 'spieler') vorlesen(sprecherText(w))
    }

    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      w.geraet = geraetVon(e)
      merkeMassstab(w, massstab())
      melde(setzeAn(w, p.x, p.y))
      melde(schreibe(w, p.x, p.y, druckVon(e)))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (!w.schreibt || pause.current) return
      // Volle Abtastrate des Pencils: der Strich soll so fein sein wie die Hand.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        melde(schreibe(w, q.x, q.y, druckVon(fein)))
      }
    }

    const hoch = () => hebeAb(w)

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)

    const endeSchleife = starteBildschleife((dt) => {
      // Angehalten wird nur gezeichnet, nicht gerechnet: das Bild steht still.
      if (!pause.current) melde(aktualisiere(w, dt))
      zeichne(g, w, sicht, cv.width, cv.height)
      if (w.phase === 'fertig') meldeFertig(() => ergebnis(w))
    })

    return () => {
      endeSchleife()
      endeBeobachten()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', hoch)
    }
  }, [pause, meldeFertig])

  useEffect(() => {
    // Angehalten liegt kein Stift mehr auf; sonst zöge der erste Punkt nach dem
    // Weiterspielen einen Strich quer über die Tafel.
    if (angehalten && weltRef.current) hebeAb(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen && weltRef.current) beende(weltRef.current)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
