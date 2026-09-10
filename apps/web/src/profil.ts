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
const B = 'tk.bestwerte'
const G = 'tk.gesehen'
const TAG = 'tk.heute'

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

/**
 * C5: persönliche Bestleistung je Übung.
 *
 * Verglichen wird die grobe Genauigkeit aus dem Browser. Für einen Bericht taugt sie nicht —
 * dafür rechnet C# aus den Rohdaten — für ein „das war deine beste Runde" reicht sie genau:
 * es ist dieselbe Zahl, aus der auch die Sterne kommen.
 *
 * Beim allerersten Mal gibt es nichts zu übertreffen. Der Wert wird gemerkt, gelobt wird nicht:
 * sonst wäre jede erste Übung eine Bestleistung und das Lob wertlos.
 */
export function pruefeBestwert(spielId: string, wert: number): boolean {
  const alle = lies<Record<string, number>>(B) ?? {}
  const alt = alle[spielId]
  if (alt !== undefined && wert <= alt) return false
  localStorage.setItem(B, JSON.stringify({ ...alle, [spielId]: wert }))
  return alt !== undefined
}

/** Onboarding: erklärt wird jedes Spiel genau einmal, beim ersten Mal (C2 — Hilfe statt Abbruch). */
export const schonGesehen = (spielId: string) => (lies<string[]>(G) ?? []).includes(spielId)

export function merkeGesehen(spielId: string) {
  const alle = lies<string[]>(G) ?? []
  if (!alle.includes(spielId)) localStorage.setItem(G, JSON.stringify([...alle, spielId]))
}

/**
 * B3: eine Einheit pro Tag.
 *
 * Verkrampfungsprävention wirkt nicht, wenn Ben die Zwangspause damit überschreibt, sofort die
 * nächste Einheit zu starten. Wie lang eine Einheit ist, stellt Thomas ohnehin über Anzahl und
 * Dauer der Übungen ein — die Obergrenze ist deshalb eine feste Zahl und keine weitere
 * Einstellung.
 */
export const EINHEITEN_PRO_TAG = 1

type Tageszaehler = { datum: string; anzahl: number; freigabe?: string | null }

/** Zählt nur, was zu Ende gespielt wurde. Ein Abbruch nach 90 Sekunden war kein Training. */
export const einheitenHeute = (): number => {
  const z = lies<Tageszaehler>(TAG)
  return z?.datum === heute() ? z.anzahl : 0
}

export const zaehleEinheit = () => schreibeZaehler(einheitenHeute() + 1, freigabeStand())

/**
 * B3: Der Therapeut kann für heute eine weitere Einheit freigeben, wenn etwas schiefgegangen
 * ist — abgestürzt, versehentlich abgebrochen, falsches Kind am Gerät.
 *
 * Zurückgesetzt wird nur bei einem **anderen** Zeitpunkt als dem zuletzt beachteten. Ohne diesen
 * Vergleich setzte jeder Start den Zähler zurück, sobald einmal freigegeben wurde — die
 * Obergrenze gäbe es dann nicht mehr. Rückgabe sagt, ob tatsächlich zurückgesetzt wurde.
 */
export function beachteFreigabe(freigabeAm: string | null | undefined): boolean {
  if (!freigabeAm || freigabeAm === freigabeStand()) return false
  schreibeZaehler(0, freigabeAm)
  return true
}

const heute = () => new Date().toDateString()

const freigabeStand = () => lies<Tageszaehler>(TAG)?.freigabe ?? null

const schreibeZaehler = (anzahl: number, freigabe: string | null) =>
  localStorage.setItem(TAG, JSON.stringify({ datum: heute(), anzahl, freigabe }))

/** D4 / Art. 17 DSGVO: Profil vollständig löschbar. */
export function loescheProfil() {
  for (const key of [P, F, B, G, TAG]) localStorage.removeItem(key)
}
