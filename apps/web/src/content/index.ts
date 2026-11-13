import type { Verein } from './typen'
import { koeln } from './vereine/koeln'
import { hsv } from './vereine/hsv'
import { ajax } from './vereine/ajax'

/**
 * Reisereihenfolge. Neuer Verein = eine Datei plus ein Eintrag hier.
 *
 * Die Reihenfolge ist die Reise: Ben startet beim ersten Eintrag und zieht nach fünf Einheiten
 * weiter. Sie hier zu ändern verschiebt den Fortschritt bereits gekoppelter Geräte — der liegt
 * als Index in `tk.fortschritt`. Auf einem Gerät, das schon trainiert hat, `tk.fortschritt`
 * einmal löschen; sonst steht Ben plötzlich bei einem anderen Verein.
 */
export const vereine: Verein[] = [koeln, hsv, ajax]

export const EINHEITEN_PRO_VEREIN = 5

export function vereinNach(id: string): Verein {
  const v = vereine.find((v) => v.id === id)
  if (!v) throw new Error(`Unbekannter Verein: ${id}`)
  return v
}
