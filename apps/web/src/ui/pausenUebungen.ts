/**
 * Die Pausenübungen und die Figur, die sie vormacht (B3: Lockerungsübung).
 *
 * Warum eine Figur und nicht nur der Satz: Ben ist sieben und übt gerade erst das Schreiben.
 * „Hampelmänner" versteht er nicht aus dem Wort, sondern aus der Bewegung. Der Text bleibt
 * trotzdem stehen und wird vorgelesen (A5) — die Figur ersetzt ihn nicht, sie erklärt ihn.
 *
 * **Der Therapeut speichert weiterhin einen freien Text.** Es gibt keine neue Spalte und keine
 * Migration: die Übung wird über Stichwörter aus dem Text erkannt. Dadurch funktioniert auch,
 * was längst in der Datenbank steht („Hand locker ausschütteln", „10 Hampelmänner"), und ein
 * Therapeut, der etwas Eigenes hineinschreibt, bekommt weiterhin genau seinen Satz — dann eben
 * ohne Figur.
 */

export type PausenUebung = {
  id: string
  /** Was die Therapeuten-App als Vorlage anbietet und was vorgelesen wird. */
  titel: string
  /** Kleingeschrieben. Kommt eines davon im Text vor, gilt die Übung als erkannt. */
  schluessel: string[]
}

export const PAUSEN_UEBUNGEN: PausenUebung[] = [
  { id: 'hampelmann', titel: 'Hampelmänner machen', schluessel: ['hampel'] },
  { id: 'schuetteln', titel: 'Hände ausschütteln', schluessel: ['schüttel', 'schuettel', 'locker'] },
  { id: 'faust', titel: 'Faust auf, Faust zu', schluessel: ['faust', 'hand öffnen', 'finger spreiz'] },
  { id: 'schultern', titel: 'Schultern kreisen', schluessel: ['schulter'] },
  { id: 'strecken', titel: 'Zum Himmel strecken', schluessel: ['streck', 'himmel', 'reck'] },
  { id: 'atmen', titel: 'Tief durchatmen', schluessel: ['atmen', 'atem', 'luft hol'] },
]

/**
 * Sucht die Übung zum Text des Therapeuten. `null`, wenn nichts passt — dann zeigt der
 * Pausenbildschirm nur den Satz, so wie bisher.
 */
export function uebungZu(inhalt: string): PausenUebung | null {
  const text = inhalt.toLowerCase()
  return PAUSEN_UEBUNGEN.find((u) => u.schluessel.some((s) => text.includes(s))) ?? null
}
