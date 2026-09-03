import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon, tastenDruckLauscher } from '../../eingabe'
import { schliesseKlang, weckeKlang } from './klang'
import {
  aktualisiere, beginneAbpfiff, beginneLaden, ergebnis, loslassen, neueWelt, stelleDruck,
  zieleLaden, type Welt,
} from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'

/**
 * „Ball hochhalten" (B2, Hand-Auge + Kraftdosierung).
 *
 * Diese Datei hält nur Canvas, Eingabe und Bildschleife zusammen. Physik und Bewertung
 * stehen in `welt.ts`, das Bild in `zeichnen.ts`, der Ton in `klang.ts`.
 *
 * Der sichtbare Timer aus A3 gehört dem SpielScreen — das Spiel selbst endet nicht von
 * allein, es läuft, bis `zeitAbgelaufen` gesetzt wird. Kein Verliererzustand (C2).
 */
export function BallHochhalten({ stufe, verein, zeitAbgelaufen, angehalten, onFertig }: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest den Wert über diese Referenz.
  const pause = useRef(angehalten)
  // Die Bildschleife läuft in einem Effekt ohne Abhängigkeiten und sieht `onFertig`
  // deshalb nur über diese Referenz.
  const beiFertig = useRef(onFertig)
  // Der Verein bringt Kulisse und Jubelrufe mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    w.wenigerBewegung = matchMedia('(prefers-reduced-motion: reduce)').matches
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

    /* Stift auf den Ball — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      weckeKlang()
      const p = zuLogisch(e)
      if (!beginneLaden(w, p.x, p.y, druckVon(e), geraetVon(e))) return
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      const p = zuLogisch(e)
      w.zeiger = { x: p.x, y: p.y, drin: true }
      if (!w.laden.an) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Druckkurve.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein)
        zieleLaden(w, q.x, q.y, druckVon(fein))
      }
    }

    const hoch = () => loslassen(w)
    const raus = () => {
      w.zeiger.drin = false
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    cv.addEventListener('pointerleave', raus)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', hoch)
    // Zifferntaste ändert den Ersatzdruck sofort, auch wenn die Maus stillsteht.
    const abTasten = tastenDruckLauscher((d) => stelleDruck(w, d))

    let letzte = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzte) / 1000)
      letzte = jetzt
      // Angehalten wird nur gerechnet, nicht gezeichnet: das Bild bleibt stehen, die Uhr des
      // Spiels läuft nicht weiter.
      if (!pause.current) aktualisiere(w, dt)
      zeichne(g, w, sicht, cv.width, cv.height)
      // Erst wenn der Schlussjubel durch ist, geht das Ergebnis weiter.
      if (w.abpfiff && w.abpfiffUhr <= 0 && !fertig.current) {
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
      schliesseKlang()
    }
  }, [])

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  useEffect(() => {
    pause.current = angehalten
  }, [angehalten])

  /* Zeit um: erst pfeift der Schiedsrichter ab und das Stadion jubelt, dann meldet
     die Bildschleife das Ergebnis. */
  useEffect(() => {
    const w = weltRef.current
    if (zeitAbgelaufen && w) beginneAbpfiff(w)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
