import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon, tastenDruckLauscher } from '../../eingabe'
import {
  aktualisiere, beginneSchluss, bewege, ergebnis, hebeAb, istFertig, legeZurueck, neueWelt,
  setzeAuf, stelleDruck, type Ereignis, type Welt,
} from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'
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
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest den Wert über diese Referenz.
  const pause = useRef(angehalten)
  // Die Bildschleife läuft in einem Effekt ohne Abhängigkeiten und sieht `onFertig`
  // deshalb nur über diese Referenz.
  const beiFertig = useRef(onFertig)
  // Der Verein bringt Farben, Kader und Sprüche mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein, regler)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    const w = weltRef.current
    if (!cv || !g || !w) return

    w.wenigerBewegung =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

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

    const melde = (ereignis: Ereignis) => {
      if (ereignis) klang[ereignis]()
    }

    /* Stift auf ein Ding — bei der Maus tut das die gedrückte Maustaste. */
    const runter = (e: PointerEvent) => {
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      if (pause.current) return
      const p = zuLogisch(e)
      melde(setzeAuf(w, p.x, p.y, druckVon(e), geraetVon(e)))
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (pause.current) return
      // Volle Abtastrate des Pencils: jeder Zwischenwert zählt für die Druckkurve.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein)
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

    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt
      // Angehalten wird nur gezeichnet, nicht gerechnet.
      if (!pause.current) {
        melde(aktualisiere(w, dt))
        if (!fertig.current && istFertig(w)) {
          fertig.current = true
          beiFertig.current(ergebnis(w, Math.round(w.zeitGesamt * 1000), false))
        }
      }
      zeichne(g, w, sicht, cv.width, cv.height)
      raf = requestAnimationFrame(bild)
    })

    return () => {
      cancelAnimationFrame(raf)
      beobachter.disconnect()
      schliesseKlang()
      cv.removeEventListener('pointerdown', runter)
      cv.removeEventListener('pointermove', bewegen)
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', abgebrochen)
      removeEventListener('blur', abgebrochen)
      abTasten()
    }
  }, [])

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  /* Beim Anhalten kommt ein gehaltenes Ding zurück in die Tasche. Sonst flöge es beim
     Weiterspielen mit dem ersten Punkt quer über den Tisch. */
  useEffect(() => {
    pause.current = angehalten
    if (angehalten && weltRef.current) legeZurueck(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen && weltRef.current) beginneSchluss(weltRef.current)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
