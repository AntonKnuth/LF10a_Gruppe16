import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { vorlesen } from '../../ui/vorlesen'
import { klang, schliesseKlang, weckeKlang } from './klang'
import {
  abheben, aktualisiere, aufsetzen, beginneAbpfiff, ergebnis, neueWelt, verwirf, ziehe, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'

/**
 * „Elfmeter" (B2, Hand-Auge und Druckdosierung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung steht in `welt.ts`,
 * das Bild in `zeichnen.ts`, die Töne in `klang.ts`.
 *
 * Endbedingung ist die Uhr des SpielScreens. Ein Ball, der dann noch fliegt, fliegt zu Ende.
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function Elfmeter({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Der Verein bringt Torwart, Farben und Rufe mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein, regler)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    w.wenigerBewegung = wenigerBewegung()
    let sicht = LEERE_SICHT
    const endeBeobachten = beobachteLeinwand(cv, (dpr) => {
      sicht = berechneSicht(cv.width, cv.height)
      w.massstab = sicht.s / dpr
    })

    /* Stift auf den Ball — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      if (!aufsetzen(w, p.x, p.y, druckVon(e), geraetVon(e), e.timeStamp)) return
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (!w.stiftUnten || pause.current) return
      // Volle Abtastrate des Pencils, jeder Punkt mit seiner eigenen Zeit. Der Schuss fällt hier
      // und nicht in der Bildschleife: der Ton kommt mit dem Ereignis (A1).
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        const ereignis = ziehe(w, q.x, q.y, druckVon(fein), fein.timeStamp)
        if (ereignis) klang[ereignis]()
      }
    }

    const hoch = () => abheben(w)
    const weg = () => verwirf(w)

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', weg)
    addEventListener('blur', weg)

    const endeSchleife = starteBildschleife((dt) => {

      // Angehalten wird nur gerechnet, nicht gezeichnet.
      if (!pause.current) {
        const ereignis = aktualisiere(w, dt)
        if (ereignis) klang[ereignis]()
        // Ben liest noch unsicher: was der Torwart sagt, ist auch zu hören (A5).
        if (w.ansage) {
          vorlesen(w.ansage)
          w.ansage = ''
        }
      }

      zeichne(g, w, sicht, cv.width, cv.height)

      if (w.fertig) meldeFertig(() => ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
    })

    return () => {
      endeSchleife()
      endeBeobachten()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', weg)
      removeEventListener('blur', weg)
    }
  }, [pause, meldeFertig])

  useEffect(() => {
    // Angehalten liegt kein Stift mehr auf; sonst zählte die Pause in die Strichdauer.
    if (angehalten && weltRef.current) verwirf(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen && weltRef.current) beginneAbpfiff(weltRef.current)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
