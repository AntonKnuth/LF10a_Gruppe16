import { useEffect, useRef } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { vorlesen } from '../../ui/vorlesen'
import { klang, schliesseKlang, weckeKlang } from './klang'
import {
  abheben, aktualisiere, aufsetzen, beginneAbpfiff, ergebnis, neueWelt, verwirf, ziehe, type Welt,
} from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'

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
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest die Werte über diese Referenzen.
  const pause = useRef(angehalten)
  const beiFertig = useRef(onFertig)
  // Der Verein bringt Torwart, Farben und Rufe mit — ein neuer Verein ist eine Content-Datei.
  weltRef.current ??= neueWelt(stufe, verein, regler)

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
      w.massstab = sicht.s / dpr
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
      if (pause.current) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      const p = zuLogisch(e)
      if (!aufsetzen(w, p.x, p.y, druckVon(e), geraetVon(e), e.timeStamp)) return
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (!w.stiftUnten || pause.current) return
      // Volle Abtastrate des Pencils, jeder Punkt mit seiner eigenen Zeit. Der Schuss fällt hier
      // und nicht in der Bildschleife: der Ton kommt mit dem Ereignis (A1).
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein)
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

    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt

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

      if (!fertig.current && w.fertig) {
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
      removeEventListener('pointerup', hoch)
      removeEventListener('pointercancel', weg)
      removeEventListener('blur', weg)
    }
  }, [])

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  useEffect(() => {
    pause.current = angehalten
    // Angehalten liegt kein Stift mehr auf; sonst zählte die Pause in die Strichdauer.
    if (angehalten && weltRef.current) verwirf(weltRef.current)
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen && weltRef.current) beginneAbpfiff(weltRef.current)
  }, [zeitAbgelaufen])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}
