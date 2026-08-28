import type { Verein } from './typen'
import { hsv } from './vereine/hsv'
import { ajax } from './vereine/ajax'

/** Reisereihenfolge. Neuer Verein = eine Datei plus ein Eintrag hier. */
export const vereine: Verein[] = [hsv, ajax]

export const EINHEITEN_PRO_VEREIN = 5

export function vereinNach(id: string): Verein {
  const v = vereine.find((v) => v.id === id)
  if (!v) throw new Error(`Unbekannter Verein: ${id}`)
  return v
}
