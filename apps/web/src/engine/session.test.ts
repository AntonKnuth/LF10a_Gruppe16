import { describe, expect, it } from 'vitest'
import { aktuellesSegment, session, starteSession } from './session'
import { standardEinstellungen, tagesplan } from './tagesplan'
import type { SpielErgebnis } from './segmente'
import { hsv } from '../content/vereine/hsv'

const ergebnis: SpielErgebnis = {
  spielId: 'linie',
  dauerMs: 1000,
  vollstaendigkeit: 1,
  genauigkeit: 0.8,
  druckMittel: 0.5,
  druckStreuung: 0.1,
  eingabegeraet: 'mouse',
  synthetischerDruck: true,
  stufe: 3,
  abgebrochen: false,
  extra: {},
}

const arten = (v = hsv, tag = 1, erster = false) =>
  tagesplan(v, tag, standardEinstellungen, erster).map((s) => s.art)

describe('tagesplan', () => {
  it('fragt die Selbsteinschätzung vor dem Lob (C3)', () => {
    const a = arten()
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== 'spiel') continue
      expect([a[i + 1], a[i + 2]]).toEqual(['selbsteinschaetzung', 'lob'])
    }
  })

  it('zeigt Ankommen nur an Tag 1, Namenseingabe nur beim allerersten Start', () => {
    expect(arten(hsv, 1)).toContain('ankommen')
    expect(arten(hsv, 2)).not.toContain('ankommen')
    expect(arten(hsv, 1, true)[0]).toBe('namenseingabe')
    expect(arten(hsv, 1, false)).not.toContain('namenseingabe')
  })

  it('setzt Pausen zwischen die Spiele, aber nicht hinter das letzte', () => {
    const a = arten()
    expect(a.filter((x) => x === 'pause')).toHaveLength(hsv.tage[0].spiele.length - 1)
    expect(a.at(-1)).toBe('fragebogen')
    expect(a.at(-2)).toBe('lob')
  })

  it('lässt vom Therapeuten abgewählte Spiele weg (B1)', () => {
    const e = {
      ...standardEinstellungen,
      spiele: {
        linie: {
          stufe: 3, dauerSek: 210, toleranz: 1, zielgeschwindigkeit: 1,
          mindesttrefferquote: 0.5, aktiv: false, reihenfolge: 0,
        },
      },
    }
    const ids = tagesplan(hsv, 1, e, false).flatMap((s) => (s.art === 'spiel' ? [s.spielId] : []))
    expect(ids).not.toContain('linie')
    expect(ids.length).toBe(hsv.tage[0].spiele.length - 1)
  })
})

describe('session', () => {
  const start = () => starteSession('hsv', 1, tagesplan(hsv, 1, standardEinstellungen, false))

  it('läuft die Segmente der Reihe nach ab und endet als fertig', () => {
    let s = start()
    expect(aktuellesSegment(s)?.art).toBe('ankommen')
    while (s.status === 'laeuft') s = session(s, { art: 'weiter' })
    expect(s.status).toBe('fertig')
    expect(aktuellesSegment(s)).toBeUndefined()
  })

  it('ignoriert Aktionen nach dem Ende — ein Doppelklick überspringt kein Segment', () => {
    let s = start()
    const vorher = s.index
    s = session(s, { art: 'weiter' })
    expect(s.index).toBe(vorher + 1)

    let ende = start()
    while (ende.status === 'laeuft') ende = session(ende, { art: 'weiter' })
    expect(session(ende, { art: 'weiter' })).toBe(ende)
  })

  it('sammelt Ergebnisse und Einschätzungen paarweise', () => {
    let s = start()
    s = session(s, { art: 'weiter' }) // Ankommen
    s = session(s, { art: 'weiter' }) // Ansage
    expect(aktuellesSegment(s)?.art).toBe('spiel')
    s = session(s, { art: 'spiel_fertig', ergebnis })
    s = session(s, { art: 'selbsteinschaetzung', wert: 2 })
    expect(s.ergebnisse).toEqual([ergebnis])
    expect(s.einschaetzungen).toEqual([2])
    expect(aktuellesSegment(s)?.art).toBe('lob')
  })

  it('protokolliert einen Abbruch, statt die Session wegzuwerfen', () => {
    let s = session(start(), { art: 'abbrechen' })
    expect(s.status).toBe('abgebrochen')
    expect(s.events.at(-1)).toMatchObject({ art: 'abbruch', index: 0 })
    // Nach dem Abbruch bleibt der Stand unverändert erhalten.
    expect(session(s, { art: 'weiter' })).toBe(s)
  })

  it('ergänzt das Ereignisprotokoll nur, statt Einträge zu ändern (append-only)', () => {
    const s = start()
    const vorher = s.events
    const nachher = session(s, { art: 'weiter' }).events
    expect(vorher[0].art).toBe('session_start')
    expect(nachher.slice(0, vorher.length)).toEqual(vorher)
    expect(nachher.length).toBeGreaterThan(vorher.length)
  })
})
