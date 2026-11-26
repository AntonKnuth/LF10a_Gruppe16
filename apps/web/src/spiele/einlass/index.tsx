import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon, tastenDruckLauscher } from '../../eingabe'
import {
  aktualisiere, beginneSchluss, bewege, ergebnis, hebeAb, istFertig, legeZurueck, neueWelt,
  setzeAuf, stelleDruck, type Ereignis, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Einlasskontrolle" (B2, Pinzettengriff und Kraftdosierung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Die Regel steht in
 * `welt.ts`, das Bild in `zeichnen.ts`.
 *
 * Taschen kommen, bis die Uhr des SpielScreens abläuft. Ein Griff, der dann gerade läuft, darf
 * zu Ende gehen — erst danach meldet das Spiel sein Ergebnis.
 */
export function Einlasskontrolle({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Der Verein bringt Farben, Kader und Sprüche mit — ein neuer Verein ist eine Content-Datei.
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

    const melde = (ereignis: Ereignis) => {
      if (ereignis) klang[ereignis]()
    }

    /* Stift auf ein Ding — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      if (pause.current) return
      const p = zuLogisch(e, cv, sicht)
      melde(setzeAuf(w, p.x, p.y, druckVon(e), geraetVon(e)))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Druckkurve.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        melde(bewege(w, q.x, q.y, druckVon(fein)))
      }
    }

    const hoch = () => melde(hebeAb(w))
    // Bricht das System die Berührung ab, hat Ben nicht losgelassen.
    const abgebrochen = () => legeZurueck(w)

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', abgebrochen)
    addEventListener('blur', abgebrochen)
    // Zifferntaste ändert den Ersatzdruck sofort, auch wenn die Maus stillsteht.
    const abTasten = tastenDruckLauscher((d) => stelleDruck(w, d))

    const endeSchleife = starteBildschleife((dt) => {
      // Angehalten wird nur gezeichnet, nicht gerechnet.
      if (!pause.current) {
        melde(aktualisiere(w, dt))
        if (istFertig(w)) meldeFertig(() => ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
      }
      zeichne(g, w, sicht, cv.width, cv.height)
    })

    return () => {
      endeSchleife()
      endeBeobachten()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', abgebrochen)
      removeEventListener('blur', abgebrochen)
      abTasten()
    }
  }, [pause, meldeFertig])

  /* Beim Anhalten kommt ein gehaltenes Ding zurück in die Tasche. Sonst flöge es beim
     Weiterspielen mit dem ersten Punkt quer über den Tisch. */
  useEffect(() => {
    if (angehalten && weltRef.current) legeZurueck(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen && weltRef.current) beginneSchluss(weltRef.current)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
