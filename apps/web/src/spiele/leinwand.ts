import { useCallback, useEffect, useRef } from 'react'
import type { SpielErgebnis } from '../engine/segmente'

/**
 * Das Gerüst, das jedes Minispiel um seinen Canvas braucht — einmal hier statt dreizehnmal.
 *
 * Drei Teile, alle einzeln benutzbar:
 * - `useSpielSteuerung`: die Brücke von den React-Props zur Bildschleife (angehalten, Zeit um,
 *   „fertig" genau einmal melden).
 * - `beobachteLeinwand` und `zuLogisch`: Canvas scharf auf dem Bildschirm, Zeiger in
 *   Spielkoordinaten.
 * - `starteBildschleife`: requestAnimationFrame mit begrenztem Zeitschritt.
 *
 * Was ein Spiel besonders macht — Regeln, Bild, Töne, welche Zeigerereignisse es braucht und
 * wann es enden darf — bleibt in seiner `index.tsx`. Deshalb keine Basisklasse: jedes Spiel ruft
 * nur auf, was es braucht, und weicht ab, wo es abweichen muss.
 */

/** Wie das Spielfeld im Canvas liegt: Maßstab und Verschiebung. Liefert `berechneSicht` je Spiel. */
export type Sicht = { s: number; dx: number; dy: number }

/** Die Sicht, bevor die Größe des Canvas bekannt ist. */
export const LEERE_SICHT: Sicht = { s: 1, dx: 0, dy: 0 }

/**
 * Längster Zeitschritt in Sekunden. Nach einem Ruckler oder einem Tab im Hintergrund kommt
 * sonst ein riesiges dt, und der Ball spränge durch die Wand.
 */
export const MAX_DT = 0.05

/** Millisekunden zwischen zwei Bildern → Zeitschritt in Sekunden, höchstens `MAX_DT`. */
export function begrenzeDt(ms: number): number {
  return Math.min(MAX_DT, ms / 1000)
}

/**
 * Bildschirmpixel je CSS-Pixel, höchstens 2. Mehr sieht man auf dem iPad nicht, aber jede
 * Verdopplung vervierfacht die Pixel, die jedes Bild gezeichnet werden müssen (A1).
 */
export function pixelDichte(dpr: number): number {
  return Math.min(2, dpr || 1)
}

/** Nur was `zuLogisch` vom Canvas braucht — so lässt es sich ohne Browser testen. */
type Flaeche = {
  width: number
  height: number
  getBoundingClientRect(): { left: number; top: number; width: number; height: number }
}

/**
 * Zeiger in Spielkoordinaten. Erst von CSS-Pixeln auf Canvas-Pixel, dann die Sicht
 * herausrechnen — so arbeitet jede `welt.ts` mit festen Spielfeldmaßen, egal wie groß das
 * Tablet ist.
 */
export function zuLogisch(e: { clientX: number; clientY: number }, cv: Flaeche, sicht: Sicht) {
  const r = cv.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) * (cv.width / r.width) - sicht.dx) / sicht.s,
    y: ((e.clientY - r.top) * (cv.height / r.height) - sicht.dy) / sicht.s,
  }
}

/**
 * Hält die Pixelgröße des Canvas passend zu seiner Größe auf dem Bildschirm — einmal sofort und
 * bei jeder Änderung (Drehen, Pausenmenü). Danach ruft es `beiNeuerGroesse` mit der Pixeldichte;
 * dort rechnet das Spiel seine Sicht neu. Ohne Größe (noch nicht im Layout) passiert nichts.
 *
 * Gibt die Aufräumfunktion zurück.
 */
export function beobachteLeinwand(
  cv: HTMLCanvasElement,
  beiNeuerGroesse: (dpr: number) => void,
): () => void {
  const passeAn = () => {
    const r = cv.getBoundingClientRect()
    if (!r.width || !r.height) return
    const dpr = pixelDichte(devicePixelRatio)
    cv.width = Math.round(r.width * dpr)
    cv.height = Math.round(r.height * dpr)
    beiNeuerGroesse(dpr)
  }
  passeAn()
  const beobachter = new ResizeObserver(passeAn)
  beobachter.observe(cv)
  return () => beobachter.disconnect()
}

/** Wünscht das Gerät weniger Bewegung? Dann lassen die Spiele Funken und Pulsieren weg. */
export function wenigerBewegung(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Ruft `bild` vor jedem Bildschirmbild auf, mit dem begrenzten Zeitschritt in Sekunden und dem
 * Zeitstempel von requestAnimationFrame. Was angehalten passiert, entscheidet das Spiel selbst —
 * die meisten zeichnen dann nur noch und rechnen nicht.
 *
 * Gibt die Aufräumfunktion zurück.
 */
export function starteBildschleife(bild: (dt: number, jetzt: number) => void): () => void {
  let letzteZeit = performance.now()
  let raf = requestAnimationFrame(function schritt(jetzt: number) {
    const dt = begrenzeDt(jetzt - letzteZeit)
    letzteZeit = jetzt
    bild(dt, jetzt)
    raf = requestAnimationFrame(schritt)
  })
  return () => cancelAnimationFrame(raf)
}

/**
 * Die Bildschleife läuft außerhalb von React, in einem Effekt, der nur einmal startet. Neue
 * Props sieht sie deshalb nur über Referenzen — die hält dieser Hook aktuell:
 * - `pause.current`: das Pausenmenü ist offen (`angehalten`).
 * - `zeitAus.current`: die Uhr des SpielScreens ist abgelaufen. Bleibt danach wahr.
 * - `meldeFertig(erzeuge)`: gibt das Ergebnis genau **einmal** an `onFertig` weiter, auch wenn
 *   die Ende-Bedingung danach in jedem Bild weiter wahr ist. `erzeuge` wird nur dann
 *   aufgerufen — das Ergebnis wird also nicht in jedem Bild ausgerechnet.
 *
 * Alle drei bleiben über die ganze Lebensdauer des Spiels dasselbe Objekt. In der
 * Abhängigkeitsliste des Bildschleifen-Effekts stehen sie nur der Ordnung halber — einen
 * Neustart der Schleife lösen sie nie aus.
 *
 * Was ein Spiel beim Anhalten oder bei abgelaufener Zeit zusätzlich tut (Stift abheben,
 * Abpfiff), steht in einem eigenen Effekt im Spiel.
 */
export function useSpielSteuerung(
  angehalten: boolean,
  zeitAbgelaufen: boolean,
  onFertig: (ergebnis: SpielErgebnis) => void,
) {
  const pause = useRef(angehalten)
  const zeitAus = useRef(false)
  const beiFertig = useRef(onFertig)
  const fertig = useRef(false)

  useEffect(() => {
    beiFertig.current = onFertig
  }, [onFertig])

  useEffect(() => {
    pause.current = angehalten
  }, [angehalten])

  useEffect(() => {
    if (zeitAbgelaufen) zeitAus.current = true
  }, [zeitAbgelaufen])

  const meldeFertig = useCallback((erzeuge: () => SpielErgebnis) => {
    if (fertig.current) return
    fertig.current = true
    beiFertig.current(erzeuge())
  }, [])

  return { pause, zeitAus, meldeFertig }
}
