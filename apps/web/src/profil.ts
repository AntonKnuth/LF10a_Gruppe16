import { vereine } from './content'

/**
 * D4: Nur Vorname und Jahrgang, ausschließlich lokal.
 *
 * ponytail: localStorage statt Dexie, solange nur ein Profil existiert und keine
 * Rohdaten anfallen. Umstellen, sobald die Minispiele Punktfolgen speichern —
 * dann kommt ohnehin eine IndexedDB mit `client_id`, Session-Events und Outbox.
 */
export type Profil = {
  vorname: string
  jahrgang?: number
  /** Der mit dem Stift geschriebene Name als PNG-DataURL. */
  nameBild?: string
}

export type Fortschritt = { vereinIndex: number; tag: number }

const P = 'tk.profil'
const F = 'tk.fortschritt'

const lies = <T,>(key: string): T | null => {
  const roh = localStorage.getItem(key)
  return roh ? (JSON.parse(roh) as T) : null
}

export const ladeProfil = () => lies<Profil>(P)
export const speichereProfil = (p: Profil) => localStorage.setItem(P, JSON.stringify(p))

export const ladeFortschritt = (): Fortschritt =>
  lies<Fortschritt>(F) ?? { vereinIndex: 0, tag: 1 }

/** Nach einer abgeschlossenen Einheit: nächster Tag, nach 5 Tagen der nächste Verein. */
export function naechsteEinheit(f: Fortschritt): Fortschritt {
  if (f.tag < 5) return { ...f, tag: f.tag + 1 }
  return { vereinIndex: (f.vereinIndex + 1) % vereine.length, tag: 1 }
}

export const speichereFortschritt = (f: Fortschritt) => localStorage.setItem(F, JSON.stringify(f))

/** D4 / Art. 17 DSGVO: Profil vollständig löschbar. */
export function loescheProfil() {
  localStorage.removeItem(P)
  localStorage.removeItem(F)
}
