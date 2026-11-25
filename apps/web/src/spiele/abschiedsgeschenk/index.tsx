import { useEffect, useRef, useState } from 'react'
import type { SpielProps } from '../index'
import { druckVon, feinEreignisse, geraetVon } from '../../eingabe'
import { klang, schliesseKlang, weckeKlang } from './klang'
import {
  aktualisiere, ergebnis, gibAb, hebeAb, neueWelt, schreibe, setzeAn,
  type Rechteck, type Schritt, type Welt,
} from './welt'
import { berechneSicht, zeichne, type Sicht } from './zeichnen'

/**
 * „Urkunde" — das Sonderspiel am letzten Tag eines Vereins (Rolle `sonder`, Bereich schreiben).
 *
 * Diese Datei hält nur Canvas, Eingabe, Bildschleife und den „Fertig"-Knopf zusammen. Logik
 * steht in `welt.ts`, das Bild in `zeichnen.ts`, die Töne in `klang.ts`.
 *
 * Endbedingung ist der erschöpfte Inhalt: eine Unterschrift. `zeitAbgelaufen` wird deshalb
 * ignoriert — die Uhr des SpielScreens läuft sichtbar ab und beendet hier nichts.
 *
 * Die Rohdaten für B4 zeichnet der `SpielScreen` auf; hier steht keine Zeile dafür.
 */
export function Urkunde({ stufe, verein, name, angehalten, onFertig }: SpielProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const weltRef = useRef<Welt | null>(null)
  weltRef.current ??= neueWelt(stufe, verein, name)
  const w = weltRef.current
  // Die Uhr der Rohdaten beginnt, wenn der SpielScreen das Spiel zeigt — also mit diesem
  // Mount, auf wenige Millisekunden genau. Darauf liegt `fertigMs`.
  const beginn = useRef(performance.now())
  const fertig = useRef(false)
  // Die Bildschleife liegt außerhalb von React und liest die Werte über diese Referenzen.
  const pause = useRef(angehalten)
  const beiFertig = useRef(onFertig)
  // Nur für den Knopf: React muss wissen, wann „Fertig" erscheint.
  const [schritt, setSchritt] = useState<Schritt>(w.schritt)

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    if (!cv || !g) return

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

    /**
     * Das Band in den Koordinaten der Rohdaten: CSS-Pixel relativ zur Spielfläche des
     * SpielScreens (`main`), nicht zum Canvas. Erst damit lässt sich die aufgezeichnete
     * Punktfolge auf das Band beziehen — auf dem Server wie auf dem Ausdruck.
     */
    const bandAufFlaeche = (): Rechteck => {
      const r = cv.getBoundingClientRect()
      const f = (cv.closest('main') ?? cv).getBoundingClientRect()
      const k = r.width / cv.width // CSS-Pixel je Canvas-Pixel
      const b = w.band
      return {
        x: r.left - f.left + (sicht.dx + b.x * sicht.s) * k,
        y: r.top - f.top + (sicht.dy + b.y * sicht.s) * k,
        breite: b.breite * sicht.s * k,
        hoehe: b.hoehe * sicht.s * k,
      }
    }

    /**
     * Welcher Zeiger gerade schreibt. Nur der Stift bzw. der erste Zeiger malt — sonst
     * zöge ein aufliegender Handballen Striche über die Urkunde. Hat einmal der Stift
     * geschrieben, malt bis zum Ende nur noch er, auch zwischen zwei Strichen.
     */
    let schreiber: number | null = null

    const runter = (e: PointerEvent) => {
      if (pause.current) return
      if (e.pointerType !== 'pen' && (schreiber !== null || w.geraet === 'pen')) return
      // Der Klang braucht eine Nutzergeste, sonst bleibt der Kontext angehalten.
      weckeKlang()
      if (!setzeAn(w, bandAufFlaeche())) return
      schreiber = e.pointerId
      w.geraet = geraetVon(e)
      const p = zuLogisch(e)
      schreibe(w, p.x, p.y, druckVon(e))
      klang.kratzen()
      cv.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const bewegen = (e: PointerEvent) => {
      if (e.pointerId !== schreiber || pause.current) return
      // Volle Abtastrate des Pencils: der Strich soll so fein sein wie die Hand.
      for (const fein of feinEreignisse(e)) {
        const q = zuLogisch(fein)
        schreibe(w, q.x, q.y, druckVon(fein))
      }
    }

    const hoch = (e: PointerEvent) => {
      if (e.pointerId !== schreiber) return
      schreiber = null
      hebeAb(w)
    }
    const weg = () => {
      schreiber = null
      hebeAb(w)
    }

    cv.addEventListener('pointerdown', runter)
    cv.addEventListener('pointermove', bewegen)
    addEventListener('pointerup', hoch)
    addEventListener('pointercancel', hoch)
    addEventListener('blur', weg)

    let gezeigt = w.schritt
    let letzteZeit = performance.now()
    let raf = requestAnimationFrame(function bild(jetzt: number) {
      const dt = Math.min(0.05, (jetzt - letzteZeit) / 1000)
      letzteZeit = jetzt
      // Angehalten stehen Rollen, Leuchten und die Wartezeit bis „Fertig".
      aktualisiere(w, dt, pause.current)
      zeichne(g, w, sicht, cv.width, cv.height)
      if (w.schritt !== gezeigt) {
        gezeigt = w.schritt
        setSchritt(gezeigt)
      }
      if (!fertig.current && w.fertig) {
        fertig.current = true
        beiFertig.current(ergebnis(w, Math.round(w.zeitGesamt * 1000)))
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
      removeEventListener('pointercancel', hoch)
      removeEventListener('blur', weg)
    }
  }, [w])

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  useEffect(() => {
    pause.current = angehalten
    // Angehalten liegt kein Stift mehr auf; sonst zöge der erste Punkt nach dem
    // Weiterspielen einen Strich quer über die Urkunde.
    if (angehalten) hebeAb(w)
  }, [angehalten, w])

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      {schritt === 'pruefen' && (
        <button
          onClick={(e) => {
            if (pause.current || !gibAb(w, e.timeStamp - beginn.current)) return
            klang.rascheln()
            setSchritt('abgabe')
          }}
          className="taste absolute bottom-3 left-1/2 -translate-x-1/2 bg-rasen px-16 text-3xl text-white shadow-lg active:scale-95"
        >
          Fertig
        </button>
      )}
    </div>
  )
}
