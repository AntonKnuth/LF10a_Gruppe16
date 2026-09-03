import type { SessionState } from './engine/session'

/**
 * Schnappschuss der laufenden Einheit.
 *
 * Gegen den Fall, dass Ben mitten im Training die App neu lädt oder das Tablet abstürzt.
 * Bewusst **lokal** und nicht über den Server: der Zustand enthält die Segmentliste, und würde
 * man ihn beim Neustart aus Content und Einstellungen neu bauen, käme nach einer Änderung des
 * Therapeuten eine *andere* Liste heraus — der Index zeigte dann woanders hin und Ben
 * übersprünge oder wiederholte ein Spiel, ohne dass es jemand merkt.
 *
 * Der zweite Grund ist einfacher: der Fall, gegen den man sich absichert, ist genau der, in dem
 * das Netz weg ist.
 */
const SCHLUESSEL = 'tk.lauf'

export type Schnappschuss = {
  lauf: SessionState
  gespeichertAm: number
  /** Erst `true`, wenn der Server den Upload bestätigt hat. */
  gesendet: boolean
}

export function merke(lauf: SessionState, gesendet = false) {
  const s: Schnappschuss = { lauf, gespeichertAm: Date.now(), gesendet }
  localStorage.setItem(SCHLUESSEL, JSON.stringify(s))
}

export function hole(): Schnappschuss | null {
  const roh = localStorage.getItem(SCHLUESSEL)
  if (!roh) return null
  try {
    return JSON.parse(roh) as Schnappschuss
  } catch {
    // Kaputter Eintrag darf den Start nicht blockieren — Ben soll spielen können.
    localStorage.removeItem(SCHLUESSEL)
    return null
  }
}

/**
 * Nur nach bestätigtem Upload aufrufen, nie bloß deshalb, weil der Zustand im Speicher auf
 * `null` gesetzt wurde. Sonst wirft man die einzige Kopie weg, bevor der Server sie hat.
 */
export const vergiss = () => localStorage.removeItem(SCHLUESSEL)

export const gleicherTag = (zeitpunkt: number) =>
  new Date(zeitpunkt).toDateString() === new Date().toDateString()
