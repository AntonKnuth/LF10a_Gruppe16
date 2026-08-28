import type { Segment, Smiley, SpielErgebnis } from './segmente'

/**
 * Append-only Ereignisliste. Wird nie geändert, nur ergänzt — das ist der Teil, der
 * später Sync ermöglicht (zusammen mit der client-generierten sessionId).
 */
export type SessionEvent = { t: number } & (
  | { art: 'session_start'; vereinId: string; tag: number }
  | { art: 'segment_start'; index: number; segmentArt: Segment['art'] }
  | { art: 'segment_ende'; index: number }
  | { art: 'spiel_ergebnis'; ergebnis: SpielErgebnis }
  | { art: 'selbsteinschaetzung'; wert: Smiley }
  | { art: 'abbruch'; index: number }
  | { art: 'session_ende' }
)

export type SessionState = {
  /** Client-generiert, damit der spätere Server nichts vergeben muss. */
  sessionId: string
  vereinId: string
  tag: number
  segmente: Segment[]
  index: number
  ergebnisse: SpielErgebnis[]
  /** Selbsteinschätzung je Spiel, gleiche Reihenfolge wie `ergebnisse`. */
  einschaetzungen: Smiley[]
  events: SessionEvent[]
  status: 'laeuft' | 'fertig' | 'abgebrochen'
}

export type SessionAction =
  | { art: 'weiter' }
  | { art: 'spiel_fertig'; ergebnis: SpielErgebnis }
  | { art: 'selbsteinschaetzung'; wert: Smiley }
  | { art: 'abbrechen' }

export function starteSession(vereinId: string, tag: number, segmente: Segment[]): SessionState {
  const t = Date.now()
  const events: SessionEvent[] = [{ t, art: 'session_start', vereinId, tag }]
  if (segmente.length > 0) {
    events.push({ t, art: 'segment_start', index: 0, segmentArt: segmente[0].art })
  }
  return {
    sessionId: crypto.randomUUID(),
    vereinId,
    tag,
    segmente,
    index: 0,
    ergebnisse: [],
    einschaetzungen: [],
    events,
    status: segmente.length > 0 ? 'laeuft' : 'fertig',
  }
}

export function aktuellesSegment(s: SessionState): Segment | undefined {
  return s.status === 'laeuft' ? s.segmente[s.index] : undefined
}

/** Nächstes Segment, oder Ende. Erzeugt die passenden Ereignisse. */
function weiterZu(s: SessionState, neueEvents: SessionEvent[]): SessionState {
  const t = Date.now()
  const index = s.index + 1
  const events = [...s.events, ...neueEvents, { t, art: 'segment_ende' as const, index: s.index }]
  const fertig = index >= s.segmente.length
  events.push(
    fertig
      ? { t, art: 'session_ende' }
      : { t, art: 'segment_start', index, segmentArt: s.segmente[index].art },
  )
  return { ...s, index, events, status: fertig ? 'fertig' : 'laeuft' }
}

export function session(s: SessionState, a: SessionAction): SessionState {
  // Nach Ende oder Abbruch ändert sich nichts mehr. Ein doppelt ausgelöster Knopf
  // darf nicht zwei Segmente überspringen.
  if (s.status !== 'laeuft') return s

  switch (a.art) {
    case 'weiter':
      return weiterZu(s, [])

    case 'spiel_fertig':
      return weiterZu({ ...s, ergebnisse: [...s.ergebnisse, a.ergebnis] }, [
        { t: Date.now(), art: 'spiel_ergebnis', ergebnis: a.ergebnis },
      ])

    case 'selbsteinschaetzung':
      return weiterZu({ ...s, einschaetzungen: [...s.einschaetzungen, a.wert] }, [
        { t: Date.now(), art: 'selbsteinschaetzung', wert: a.wert },
      ])

    case 'abbrechen':
      // Nicht wegwerfen: ein Abbruch nach 90 Sekunden ist für Thomas ein Befund.
      return {
        ...s,
        status: 'abgebrochen',
        events: [...s.events, { t: Date.now(), art: 'abbruch', index: s.index }],
      }
  }
}
