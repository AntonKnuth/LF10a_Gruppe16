import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import {
  aktualisiere, beginneSchluss, ergebnis, hebeAb, istFertig, male, neueWelt, setzeAuf,
  verwirfStrich, type Ereignis, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, wenigerBewegung, zuLogisch,
} from '../leinwand'
import { klang, schliesseKlang, weckeKlang } from './klang'

/**
 * „Platz aufräumen" (B2, Wellen und Hand-Auge).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Die Regel steht in
 * `welt.ts`, das Bild in `zeichnen.ts`, die Töne in `klang.ts`.
 *
 * Abschnitte kommen, bis die Uhr des SpielScreens abläuft. Ein angefangener Kreis und die
 * Kamerafahrten danach dürfen zu Ende gehen — erst dann meldet das Spiel sein Ergebnis.
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function PlatzAufraeumen({
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

    /** Was die Welt meldet, klingt sofort — das ist die Rückmeldung unter 100 ms aus A1. */
    const melde = (ereignis: Ereignis) => {
      if (ereignis) klang[ereignis]()
    }

    /* Stift auf den Rasen — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      if (pause.current) return
      const p = zuLogisch(e, cv, sicht)
      setzeAuf(w, p.x, p.y, druckVon(e), geraetVon(e))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (pause.current || !w.strich) return
      // Volle Abtastrate des Pencils: der Strich folgt jedem Zwischenpunkt.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein, cv, sicht)
        melde(male(w, q.x, q.y, druckVon(fein)))
      }
    }

    const hoch = () => hebeAb(w)
    // Bricht das System die Berührung ab, hat Ben nicht abgesetzt — der Strich zählt nicht.
    const abgebrochen = () => verwirfStrich(w)

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', abgebrochen)
    addEventListener('blur', abgebrochen)

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
    }
  }, [pause, meldeFertig])

  /* Angehalten liegt kein Stift mehr auf; der halbe Kreis verfällt. Sonst zöge der erste Punkt
     nach dem Weiterspielen eine Gerade quer über den Platz. */
  useEffect(() => {
    if (angehalten && weltRef.current) verwirfStrich(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen && weltRef.current) beginneSchluss(weltRef.current)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
