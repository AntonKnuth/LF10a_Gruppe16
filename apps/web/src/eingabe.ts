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

export const ZEIGER_EREIGNISSE = [
  'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave',
] as const

/**
 * Handballen und zweite Zeiger aussortieren. Je Spiel ein eigener Filter; er sagt zu jedem
 * Zeigerereignis, ob es durchdarf. Zwei Regeln:
 *
 * 1. **Hat in diesem Spiel einmal ein Stift aufgesetzt, zählt keine Berührung mehr** — auch nicht
 *    zwischen zwei Strichen, denn genau dann liegt der Handballen weiter auf. Im nächsten Spiel
 *    darf es wieder der Finger sein; sonst ginge ohne Stift gar nichts mehr.
 * 2. **Es schreibt immer nur ein Zeiger.** Ein weiterer bleibt draußen, bis der erste abhebt.
 *    Nur der Stift übernimmt sofort: liegt der Handballen zuerst auf, ist er von einem Finger
 *    nicht zu unterscheiden. Auch ein primärer Zeiger übernimmt — er heißt, dass kein anderer
 *    Finger aufliegt; sonst sperrte ein verlorenes Abheben den Finger bis zum Spielende aus.
 */
export function neuerZeigerfilter() {
  let aktiv: number | null = null
  let stiftGesehen = false

  return (e: Pick<PointerEvent, 'type' | 'pointerId' | 'pointerType' | 'isPrimary'>): boolean => {
    const stift = e.pointerType === 'pen'
    if (stift && e.type === 'pointerdown') stiftGesehen = true
    if (stiftGesehen && e.pointerType === 'touch') return false

    if (e.type === 'pointerdown' && (aktiv === null || stift || e.isPrimary)) aktiv = e.pointerId
    if (aktiv !== null && aktiv !== e.pointerId) return false
    if (e.type === 'pointerup' || e.type === 'pointercancel') aktiv = null
    return true
  }
}

/** Mittel und Streuung der gesammelten Druckwerte für das SpielErgebnis. */
export function druckKennzahlen(werte: number[]): { mittel: number; streuung: number } {
  if (werte.length === 0) return { mittel: 0, streuung: 0 }
  const mittel = werte.reduce((s, v) => s + v, 0) / werte.length
  const varianz = werte.reduce((s, v) => s + (v - mittel) ** 2, 0) / werte.length
  return { mittel, streuung: Math.sqrt(varianz) }
}
