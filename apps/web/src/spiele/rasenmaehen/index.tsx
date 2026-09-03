import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon, tastenDruckLauscher } from '../../eingabe'
import { aktualisiere, ergebnis, maehe, neueWelt, type Welt } from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'

/**
 * „Platzwart" (B2, Kraftdosierung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Bewertung steht in
 * `welt.ts`, das Bild in `zeichnen.ts`.
 *
 * Das Spiel endet auf zwei Wegen, beide regulär (C2): der Platz ist fertig gemäht, oder
 * die Uhr des SpielScreens läuft ab. Einen Verliererzustand gibt es nicht.
 */
export function Platzwart({ stufe, verein, zeitAbgelaufen, onFertig }: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const fertig = useRef(false)
  const zeitAus = useRef(false)
  // Die Bildschleife läuft in einem Effekt ohne Abhängigkeiten und sieht `onFertig`
  // deshalb nur über diese Referenz.
  const beiFertig = useRef(onFertig)
  // Der Verein bringt die Farben der Bande mit — ein neuer Verein ist eine Content-Datei.
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

    /* Letzter gemähter Punkt — die Strecke dorthin wird beim nächsten Ereignis
       mitgemäht, damit eine schnelle Bewegung keine Streifen stehen lässt. */
    let letzter = { x: 0, y: 0 }

    /* Stift auf den Rasen — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      const p = zuLogisch(e)
      w.maeher = { x: p.x, y: p.y, drin: true }
      w.geraet = geraetVon(e)
      w.druck = druckVon(e)
      w.maeht = true
      letzter = p
      // Auch ein Tippen ohne Bewegung mäht die Stelle unter dem Mäher.
      if (!w.fertig) maehe(w, p.x, p.y, p.x, p.y, w.druck)
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e)
      w.maeher = { x: p.x, y: p.y, drin: true }
      if (!w.maeht || w.fertig) {
        w.druck = druckVon(e)
        return
      }
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Druckkurve.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein)
        const d = druckVon(fein)
        maehe(w, letzter.x, letzter.y, q.x, q.y, d)
        letzter = q
        w.druck = d
      }
    }

    const hoch = () => {
      w.maeht = false
    }
    const raus = () => {
      w.maeher.drin = false
      w.maeht = false
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', raus)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)
    // Zifferntaste ändert den Ersatzdruck sofort, auch wenn die Maus stillsteht.
    const abTasten = tastenDruckLauscher((d) => {
      w.druck = d
    })

    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt
      aktualisiere(w, dt)
      zeichne(g, w, sicht, cv.width, cv.height)
      // Fertig gemäht oder Zeit um — in beiden Fällen ein regulärer Abschluss.
      if (!fertig.current && (w.fertig || zeitAus.current)) {
        fertig.current = true
        beiFertig.current(ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
      }
      raf = requestAnimationFrame(bild)
    })

    return () => {
      cancelAnimationFrame(raf)
      beobachter.disconnect()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      cv.removeEventListener('pointerleave', raus)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', hoch)
      abTasten()
    }
  }, [])

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  useEffect(() => {
    if (zeitAbgelaufen) zeitAus.current = true
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
