/**
 * Eingabe für alle Minispiele — Zielgerät ist der Apple Pencil.
 *
 * Ersatz zum Testen ohne Stift (CLAUDE.md):
 *   - Maustaste gedrückt = Stift auf Papier
 *   - Ziffern 1–9 = 10 %–90 % Druck, 0 = 100 %, Vorgabe 50 %
 *
 * Ersatzwerte werden als **synthetisch** markiert. Ohne diese Markierung mischen sich
 * echte Pencil-Druckkurven mit Tastaturwerten und die Verlaufskurve lügt.
 */

export type Eingabegeraet = 'pen' | 'mouse' | 'touch'

export type Druck = { wert: number; synthetisch: boolean }

/** Zuletzt per Zifferntaste eingestellter Ersatzdruck. */
let tastenDruck = 0.5

/**
 * Meldet den Ziffern-Lauscher an; Rückgabe wieder abmelden (React-Cleanup).
 *
 * `beiAenderung` ist nicht optional aus Bequemlichkeit: eine Zifferntaste erzeugt kein
 * Zeigerereignis. Ohne diese Meldung merkt ein laufendes Spiel den neuen Ersatzdruck
 * erst, wenn die Maus wieder bewegt wird.
 */
export function tastenDruckLauscher(beiAenderung?: (d: Druck) => void): () => void {
  const bei = (e: KeyboardEvent) => {
    if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
      tastenDruck = e.key === '0' ? 1 : Number(e.key) / 10
      beiAenderung?.({ wert: tastenDruck, synthetisch: true })
    }
  }
  addEventListener('keydown', bei)
  return () => removeEventListener('keydown', bei)
}

export const tastenDruckWert = () => tastenDruck

/**
 * Andruck eines Zeigerereignisses: echt beim Pencil, sonst der Tastaturwert.
 * Maus und Finger melden konstant 0.5 bzw. 0 — das ist keine Messung, sondern eine
 * Vorgabe des Browsers, deshalb gilt dort der eingestellte Ersatzwert.
 */
export function druckVon(e: PointerEvent): Druck {
  if (e.pointerType === 'pen' && e.pressure > 0) return { wert: e.pressure, synthetisch: false }
  return { wert: tastenDruck, synthetisch: true }
}

export const geraetVon = (e: PointerEvent): Eingabegeraet =>
  e.pointerType === 'pen' ? 'pen' : e.pointerType === 'touch' ? 'touch' : 'mouse'

/** Volle Abtastrate des Pencils (bis 120 Hz) statt nur ein Ereignis je Bild. */
export function feinEreignisse(e: PointerEvent): PointerEvent[] {
  const fein = e.getCoalescedEvents?.()
  return fein?.length ? fein : [e]
}

/** Mittel und Streuung der gesammelten Druckwerte für das SpielErgebnis. */
export function druckKennzahlen(werte: number[]): { mittel: number; streuung: number } {
  if (werte.length === 0) return { mittel: 0, streuung: 0 }
  const mittel = werte.reduce((s, v) => s + v, 0) / werte.length
  const varianz = werte.reduce((s, v) => s + (v - mittel) ** 2, 0) / werte.length
  return { mittel, streuung: Math.sqrt(varianz) }
}
