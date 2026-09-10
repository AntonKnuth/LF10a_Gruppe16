import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { aktualisiere, ergebnis, hebeAb, neueWelt, schreibe, setzeAn, type Welt } from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'

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
  stufe, verein, zeitAbgelaufen, angehalten, onFertig,
}: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest den Wert über diese Referenz.
  const pause = useRef(angehalten)
  const zeitAus = useRef(false)
  const beiFertig = useRef(onFertig)
  // Der Verein bringt Farben und Kader mit — ein neuer Verein ist eine Content-Datei.
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

    /* Stift aufs Trikot — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      if (pause.current) return
      const p = zuLogisch(e)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      w.geraet = geraetVon(e)
      setzeAn(w)
      schreibe(w, p.x, p.y, druckVon(e))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      if (!w.schreibt || pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Strecke.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein)
        schreibe(w, q.x, q.y, druckVon(fein))
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

    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt
      // Angehalten wird nur gerechnet, nicht gezeichnet.
      if (!pause.current) aktualisiere(w, dt)
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
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      cv.removeEventListener('pointerleave', raus)
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
    // Weiterspielen einen Strich quer über das Trikot.
    if (angehalten && weltRef.current) hebeAb(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen) zeitAus.current = true
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
