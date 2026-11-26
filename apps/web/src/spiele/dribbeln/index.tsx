import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { tonLautstaerke } from '../../bedienung'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { vorlesen } from '../../ui/vorlesen'
import { klang, schliesseKlang, weckeKlang } from './klang'
import {
  HILFE_TEXT, aktualisiere, beendePause, beginnePause, darfEnden, ergebnis, hebeAb, neueWelt,
  setzeAuf, ziehe, type Ereignis, type Welt,
} from './welt'
import { berechneSicht, zeichne } from './zeichnen'
import {
  LEERE_SICHT, beobachteLeinwand, starteBildschleife, useSpielSteuerung, zuLogisch,
} from '../leinwand'

/**
 * „Dribbeln mit Pfiff" (B2, Impulskontrolle; die Wellen sind Nebenaufgabe).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung und Pfiffplan stehen
 * in `welt.ts`, das Bild in `zeichnen.ts`, die Töne in `klang.ts`.
 *
 * Beendet wird von der Uhr des SpielScreens, aber nie mitten in einem Pfiff.
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function DribbelnMitPfiff({
  stufe, regler, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const { pause, zeitAus, meldeFertig } = useSpielSteuerung(angehalten, zeitAbgelaufen, onFertig)
  // Die Uhr der Rohdaten beginnt, wenn der SpielScreen das Spiel zeigt — also mit diesem
  // Mount, auf wenige Millisekunden genau. Darauf liegen alle Zeiten im `extra`.
  const beginn = useRef(performance.now())
  // Die Saat ist der einzige Zufall und steht im `extra`: jedes Spiel hat andere Pfiffe, sonst
  // lernte Ben sie auswendig, und trotzdem lässt sich jeder Plan nachrechnen.
  weltRef.current ??= neueWelt(stufe, verein, regler, Math.floor(Math.random() * 1_000_000))

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    let sicht = LEERE_SICHT
    const endeBeobachten = beobachteLeinwand(cv, (dpr) => {
      sicht = berechneSicht(cv.width, cv.height)
      w.cssPxProBuehnenPx = sicht.s / dpr
    })

    const zeitVon = (e: Event) => e.timeStamp - beginn.current

    /** Was die Welt meldet, klingt sofort — das ist die Rückmeldung unter 100 ms aus A1. */
    const melde = (ereignisse: Ereignis[]) => {
      for (const e of ereignisse) {
        if (e === 'hilfe') vorlesen(HILFE_TEXT)
        else klang[e]()
      }
    }

    /* Stift auf den Rasen — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e, cv, sicht)
      w.geraet = geraetVon(e)
      melde(setzeAuf(w, p.x, p.y, druckVon(e), zeitVon(e)))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (!w.zieht || pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für den Stillstand.
      for (const fein of feinEreignisse(e)) {
        const p = zuLogisch(fein, cv, sicht)
        melde(ziehe(w, p.x, p.y, druckVon(fein), zeitVon(fein)))
      }
    }

    const hoch = (e: Event) => melde(hebeAb(w, zeitVon(e)))

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', hoch)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)

    const endeSchleife = starteBildschleife((dtBegrenzt, jetzt) => {
      // Nie 0: der erste Zeitstempel kann vor dem Start der Schleife liegen, und das Tempo teilt
      // durch dt. Nur dieses Spiel teilt durch dt, deshalb steht die Untergrenze hier.
      const dt = Math.max(0.001, dtBegrenzt)
      // Angehalten wird nur gezeichnet: Ball, Jubel und Pfiff-Uhr stehen.
      if (!pause.current) {
        w.tonAn = tonLautstaerke() > 0
        melde(aktualisiere(w, dt, jetzt - beginn.current))
      }
      zeichne(g, w, sicht, cv.width, cv.height)
      if (zeitAus.current && darfEnden(w)) {
        meldeFertig(() => ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
      }
    })

    return () => {
      endeSchleife()
      endeBeobachten()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      cv.removeEventListener('pointerleave', hoch)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', hoch)
    }
  }, [pause, zeitAus, meldeFertig])

  useEffect(() => {
    const w = weltRef.current
    if (!w) return
    const tMs = performance.now() - beginn.current
    // Die Rohdaten-Uhr läuft in der Pause weiter; die Auswertung muss wissen, von wann bis wann.
    if (angehalten) beginnePause(w, tMs)
    else beendePause(w, tMs)
  }, [angehalten])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
