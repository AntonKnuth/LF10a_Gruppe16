import { describe, expect, it } from 'vitest'
import { PAUSEN_UEBUNGEN, uebungZu } from './pausenUebungen'

/**
 * Die Übung wird aus dem freien Text des Therapeuten erkannt — genau deshalb braucht es
 * keine neue Spalte und keine Migration. Dann muss die Erkennung aber das treffen, was
 * bereits in der Datenbank steht.
 */
describe('Übung aus dem Pausentext erkennen', () => {
  it('erkennt die Vorgaben, die heute schon gespeichert sind', () => {
    // Vorgabe der Kind-App und Vorgabe der Datenbank.
    expect(uebungZu('10 Hampelmänner')?.id).toBe('hampelmann')
    expect(uebungZu('Hand locker ausschütteln')?.id).toBe('schuetteln')
  })

  it('findet jede Vorlage über ihren eigenen Titel wieder', () => {
    // Die Therapeuten-App schreibt genau diese Titel in das Textfeld.
    for (const u of PAUSEN_UEBUNGEN) expect(uebungZu(u.titel)?.id).toBe(u.id)
  })

  it('achtet nicht auf Groß- und Kleinschreibung', () => {
    expect(uebungZu('SCHULTERN KREISEN')?.id).toBe('schultern')
  })

  it('lässt eigenen Text eigener Text bleiben', () => {
    // Kein Treffer heißt: nur der Satz, ohne Figur. Eine falsch geratene Übung wäre
    // schlimmer als gar keine — dann macht Ben etwas anderes als abgesprochen.
    expect(uebungZu('Einmal um den Küchentisch laufen')).toBe(null)
    expect(uebungZu('')).toBe(null)
  })
})
