/**
 * Kleine Rechen- und Zeichenhelfer, die fast jedes Minispiel braucht.
 *
 * Sie standen vorher wortgleich in jedem Spiel. Hier stehen sie einmal, damit ein Fehler auch nur
 * einmal behoben werden muss — und damit jedes Spiel in seinen eigenen Dateien nur noch das
 * enthält, was es von den anderen unterscheidet.
 */

/** Begrenzt `v` auf den Bereich `min`…`max`. Erwartet `min <= max`. */
export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Legt einen Kreis als Pfad an, gefüllt oder umrandet wird danach. So entscheidet der Aufrufer
 * selbst, ob er `fill()`, `stroke()` oder beides braucht.
 */
export function kreis(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
}

/** Sichtfenster: Maßstab und Rand, damit die Bühne eines Spiels mittig ins Canvas passt. */
export type Sicht = { s: number; dx: number; dy: number }

/**
 * Jedes Spiel rechnet in festen Bühnenmaßen (z. B. 900×640). Das Canvas hat aber die Größe des
 * Tablets. Der Maßstab ist so gewählt, dass die ganze Bühne sichtbar bleibt — nichts wird
 * abgeschnitten; der übrige Platz wird links/rechts oder oben/unten gleich verteilt.
 */
export function berechneSicht(breite: number, hoehe: number, buehneB: number, buehneH: number): Sicht {
  const s = Math.min(breite / buehneB, hoehe / buehneH)
  return { s, dx: (breite - buehneB * s) / 2, dy: (hoehe - buehneH * s) / 2 }
}
