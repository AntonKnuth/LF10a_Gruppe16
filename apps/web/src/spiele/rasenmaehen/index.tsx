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
 * Beendet wird ausschließlich von der Uhr des SpielScreens. Ist ein Platz geschafft,
 * kommt der nächste — es gibt weder ein vorzeitiges Ende noch einen Verliererzustand (C2).
 */
export function Platzwart({ stufe, verein, zeitAbgelaufen, angehalten, onFertig }: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest den Wert über diese Referenz.
  const pause = useRef(angehalten)
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
      maehe(w, p.x, p.y, p.x, p.y, w.druck)
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e)
      w.maeher = { x: p.x, y: p.y, drin: true }
      if (!w.maeht) {
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
      // Angehalten wird nur gerechnet, nicht gezeichnet.
      if (!pause.current) aktualisiere(w, dt)
      zeichne(g, w, sicht, cv.width, cv.height)
      // Nur die Uhr beendet das Spiel: ein geschaffter Platz wird gefeiert, dann kommt
      // der nächste. Kein Verliererzustand und kein vorzeitiges Ende (C2).
      if (!fertig.current && zeitAus.current) {
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
    pause.current = angehalten
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen) zeitAus.current = true
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
