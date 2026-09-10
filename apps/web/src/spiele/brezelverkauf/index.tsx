import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { klang, schliesseKlang, weckeKlang } from './klang'
import { aktualisiere, beginne, ergebnis, hebeAb, neueWelt, ziehe, type Welt } from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'

/**
 * „Brezelverkauf" (B2, Grafomotorik — Ecken und Richtungswechsel; dazu Hand-Auge).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung steht in
 * `welt.ts`, das Bild in `zeichnen.ts`, die Töne in `klang.ts`.
 *
 * Beendet wird ausschließlich von der Uhr des SpielScreens: es gibt keine feste Zahl
 * Bestellungen, sondern so viele, wie in der eingestellten Zeit anfallen. Damit gibt es auch
 * kein vorzeitiges Ende und keinen Verliererzustand (C2).
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function Brezelverkauf({ stufe, verein, zeitAbgelaufen, angehalten, onFertig }: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest die Werte über diese Referenzen.
  const pause = useRef(angehalten)
  const zeitAus = useRef(false)
  const beiFertig = useRef(onFertig)
  // Der Verein bringt die Farben mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    let sicht: Sicht = { s: 1, dx: 0, dy: 0 }

    const passeAn = () => {
      const r = cv.getBoundingClientRect()
      if (!r.width || !r.height) return
      const dpr = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      sicht = berechneSicht(cv.width, cv.height)
    }
    passeAn()
    const beobachter = new ResizeObserver(passeAn)
    beobachter.observe(cv)

    const zuLogisch = (e: { clientX: number; clientY: number }) => {
      const r = cv.getBoundingClientRect()
      return {
        x: ((e.clientX - r.left) * (cv.width / r.width) - sicht.dx) / sicht.s,
        y: ((e.clientY - r.top) * (cv.height / r.height) - sicht.dy) / sicht.s,
      }
    }

    /* Stift auf die Tribüne — bei der Maus tut das die gedrückte Maustaste. Ein Weg beginnt
       nur beim Verkäufer; daneben aufgesetzt passiert nichts. */
    const runter = (e: PointerEvent) => {
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e)
      w.geraet = geraetVon(e)
      beginne(w, p.x, p.y)
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (!w.zieht || pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Genauigkeit.
      for (const fein of feinEreignisse(e)) {
        const p = zuLogisch(fein)
        ziehe(w, p.x, p.y, druckVon(fein))
      }
    }

    const hoch = () => hebeAb(w)

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', hoch)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)

    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt

      // Angehalten wird nur gerechnet, nicht gezeichnet.
      if (!pause.current) {
        const ereignis = aktualisiere(w, dt)
        if (ereignis) {
          klang[ereignis]()
          // Der Rempler ist auch zu spüren — auf iPadOS allerdings nicht: Safari kennt die
          // Vibration API nicht. Deshalb optionaler Aufruf und kein zweiter Weg dafür; auf
          // dem Zielgerät bleiben Wackeln und Klang die Rückmeldung.
          if (ereignis === 'stoss') navigator.vibrate?.(120)
        }
      }

      zeichne(g, w, sicht, cv.width, cv.height)

      if (!fertig.current && zeitAus.current) {
        fertig.current = true
        beiFertig.current(ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
      }
      raf = requestAnimationFrame(bild)
    })

    return () => {
      cancelAnimationFrame(raf)
      beobachter.disconnect()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      cv.removeEventListener('pointerleave', hoch)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', hoch)
    }
  }, [])

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  useEffect(() => {
    pause.current = angehalten
    // Angehalten liegt kein Stift mehr auf; sonst zöge der erste Punkt nach dem
    // Weiterspielen eine Gerade quer über die Tribüne.
    if (angehalten && weltRef.current) hebeAb(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen) zeitAus.current = true
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
