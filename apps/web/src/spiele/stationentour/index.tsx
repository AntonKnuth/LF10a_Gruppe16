import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { vorlesen } from '../../ui/vorlesen'
import {
  HILFE_TEXT, LOCKER_TEXT, SCHLUSS_TEXT, aktualisiere, beende, ergebnis, faktVon, hebeAb, neueWelt,
  schreibe, setzeAn, type Ereignis, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Stadionführung" (B2, Grafomotorik + Kraftdosierung: gleichmäßiges Tempo und gleichmäßiger Druck).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Die Regeln stehen in `welt.ts`,
 * das Bild in `zeichnen.ts`, die Buchstaben in `../schrift.ts`.
 *
 * Beendet wird von der Uhr des SpielScreens, aber erst bei abgehobenem Stift: dann leuchtet der
 * Rest des Wortes von selbst auf, und die Besucher bedanken sich (C2).
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf, den Handballen hält er auch fern; hier steht
 * keine Zeile dafür. Deshalb auch kein Knopf im Bild: jeder Tipp wäre ein Strich in den Rohdaten.
 */
export function Stadionfuehrung({
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

    /** Klang sofort (A1), Stimme nur bei eingeschaltetem Ton — das prüft `vorlesen` selbst (A4). */
    const melde = (ereignis: Ereignis | undefined) => {
      if (ereignis === 'strich') klang.strich()
      // Gemeldet wird das fertige Zeichen, da steht die Welt schon beim nächsten.
      if (ereignis === 'zeichen') klang.zeichen(w.zeichenNr - 1)
      if (ereignis === 'wort') {
        klang.wort()
        vorlesen(faktVon(w).text)
      }
      if (ereignis === 'schluss') {
        klang.schluss()
        vorlesen(SCHLUSS_TEXT)
      }
      if (ereignis === 'hilfe') vorlesen(HILFE_TEXT)
      if (ereignis === 'locker') vorlesen(LOCKER_TEXT)
    }

    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      w.geraet = geraetVon(e)
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
      // Angehalten wird nur gerechnet, nicht gezeichnet.
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
