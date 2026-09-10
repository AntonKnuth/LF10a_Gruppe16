import { describe, expect, it } from 'vitest'
import { aktuellesSegment, session, starteSession } from './session'
import {
  hatUebung, spieleDesTages, standardEinstellungen, tagesplan, type Einstellungen,
} from './tagesplan'
import { KATALOG, spieleMitRolle } from '../spiele/katalog'
import type { SpielErgebnis } from './segmente'

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

const E: Einstellungen = standardEinstellungen

const arten = (tag = 1, erster = false) => tagesplan('hsv', tag, E, erster).map((s) => s.art)

const spieleVon = (segmente: ReturnType<typeof tagesplan>) =>
  segmente.flatMap((s) => (s.art === 'spiel' ? [s.spielId] : []))

/** Nur diese Spiele sind aktiv — alle anderen fallen aus dem Topf. */
const nur = (ids: string[]): Einstellungen => ({
  ...standardEinstellungen,
  spiele: Object.fromEntries(
    Object.keys(KATALOG).map((id) => [
      id,
      {
        stufe: 3, dauerSek: 210, toleranz: 1, zielgeschwindigkeit: 1,
        mindesttrefferquote: 0.5, aktiv: ids.includes(id), reihenfolge: 0,
      },
    ]),
  ),
})

describe('tagesplan', () => {
  it('fragt die Selbsteinschätzung vor dem Lob (C3)', () => {
    const a = arten()
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== 'spiel') continue
      expect([a[i + 1], a[i + 2]]).toEqual(['selbsteinschaetzung', 'lob'])
    }
  })

  it('zeigt Ankommen nur an Tag 1, Namenseingabe nur beim allerersten Start', () => {
    expect(arten(1)).toContain('ankommen')
    expect(arten(2)).not.toContain('ankommen')
    expect(arten(1, true)[0]).toBe('namenseingabe')
    expect(arten(1, false)).not.toContain('namenseingabe')
  })

  it('setzt Pausen zwischen die Spiele, aber nicht hinter das letzte', () => {
    const segmente = tagesplan('hsv', 1, E, false)
    const a = segmente.map((s) => s.art)
    expect(a.filter((x) => x === 'pause')).toHaveLength(spieleVon(segmente).length - 1)
    expect(a.at(-1)).toBe('fragebogen')
    expect(a.at(-2)).toBe('lob')
  })

  it('hält sich an die eingestellte Anzahl je Rolle', () => {
    const ids = spieleVon(tagesplan('hsv', 1, E, false))
    expect(ids).toHaveLength(E.anzahlAufwaermen + E.anzahlUebungen)
    expect(KATALOG[ids[0]].rolle).toBe('aufwaermen')
    expect(ids.slice(1).every((id) => KATALOG[id].rolle === 'normal')).toBe(true)
  })

  it('setzt das Sonderspiel nur an Tag 5 und dort als letztes', () => {
    for (const tag of [1, 2, 3, 4]) {
      expect(spieleVon(tagesplan('hsv', tag, E, false)).some((id) => KATALOG[id].rolle === 'sonder'))
        .toBe(false)
    }
    const letzterTag = spieleVon(tagesplan('hsv', 5, E, false))
    expect(KATALOG[letzterTag.at(-1)!].rolle).toBe('sonder')
    expect(letzterTag.filter((id) => KATALOG[id].rolle === 'sonder')).toHaveLength(1)
  })

  it('lässt abgewählte Spiele weg (B1)', () => {
    const ohneLinie = nur(Object.keys(KATALOG).filter((id) => id !== 'linie'))
    for (const tag of [1, 2, 3, 4, 5]) {
      expect(spieleVon(tagesplan('hsv', tag, ohneLinie, false))).not.toContain('linie')
    }
  })
})

describe('geordneter Zufall', () => {
  it('ergibt für denselben Tag denselben Plan', () => {
    expect(spieleDesTages('hsv', 2, E)).toEqual(spieleDesTages('hsv', 2, E))
  })

  it('ergibt für verschiedene Tage verschiedene Pläne', () => {
    const tage = [1, 2, 3, 4].map((t) => spieleDesTages('hsv', t, E).join())
    expect(new Set(tage).size).toBeGreaterThan(1)
  })

  it('ergibt bei verschiedenen Vereinen verschiedene Pläne', () => {
    const paare = ['hsv', 'ajax'].map((v) => spieleDesTages(v, 1, E).join())
    expect(new Set(paare).size).toBe(2)
  })

  it('wählt andere Spiele, sobald der Therapeut den Topf ändert', () => {
    const vorher = spieleDesTages('hsv', 1, E)
    const nachher = spieleDesTages('hsv', 1, nur(['aufwaermen', 'linie', 'startelf', 'elfmeter']))
    expect(nachher).not.toEqual(vorher)
  })

  it('vermeidet gleiche Fähigkeitsbereiche hintereinander, wo es geht', () => {
    // Topf mit klar getrennten Bereichen: hier darf sich nichts überschneiden.
    const e: Einstellungen = {
      ...nur(['aufwaermen', 'linie', 'startelf', 'rasenmaehen']),
      anzahlAufwaermen: 0,
      anzahlUebungen: 3,
      anzahlSonder: 0,
    }
    const ids = spieleDesTages('hsv', 1, e)
    for (let i = 1; i < ids.length; i++) {
      const gemeinsam = KATALOG[ids[i]].tags.filter((t) => KATALOG[ids[i - 1]].tags.includes(t))
      expect(gemeinsam).toHaveLength(0)
    }
  })

  it('wiederholt dasselbe Spiel nie dreimal hintereinander', () => {
    // Zwei Spiele im Topf, fünf Plätze — wiederholen muss es sich, aber abwechselnd.
    const e: Einstellungen = {
      ...nur(['linie', 'startelf']),
      anzahlAufwaermen: 0,
      anzahlUebungen: 5,
      anzahlSonder: 0,
    }
    const ids = spieleDesTages('hsv', 1, e)
    expect(ids).toHaveLength(5)
    for (let i = 2; i < ids.length; i++) {
      expect(ids[i] === ids[i - 1] && ids[i] === ids[i - 2]).toBe(false)
    }
  })

  /**
   * Der eine Fall, in dem die Regel nicht gelten *kann*. Steht hier, damit niemand sie später
   * für gebrochen hält: bei einem einzigen Spiel im Topf gibt es nichts abzuwechseln.
   * Erreichbar ist das nur, wenn jemand die Prüfung des Servers umgeht — sie lehnt eine
   * Einstellung ab, bei der weniger Spiele aktiv sind als Plätze eingestellt.
   */
  it('kann bei nur einem aktiven Spiel nicht abwechseln', () => {
    const e: Einstellungen = {
      ...nur(['linie']),
      anzahlAufwaermen: 0,
      anzahlUebungen: 3,
      anzahlSonder: 0,
    }
    expect(spieleDesTages('hsv', 1, e)).toEqual(['linie', 'linie', 'linie'])
  })

  it('lässt die führende Übung über die Tage variieren', () => {
    const erste = [1, 2, 3, 4, 5].map((t) => spieleDesTages('hsv', t, E)[0])
    expect(new Set(erste).size).toBeGreaterThan(0)
    expect(spieleMitRolle('aufwaermen')).toContain(erste[0])
  })
})

describe('session', () => {
  const start = () => starteSession('hsv', 1, tagesplan('hsv', 1, standardEinstellungen, false))

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

describe('leerer Tagesplan', () => {
  it('erkennt einen Tag ohne Übung, wenn alles abgewählt ist', () => {
    expect(hatUebung(tagesplan('hsv', 1, nur([]), false))).toBe(false)
  })

  it('erkennt einen Tag mit mindestens einer Übung', () => {
    expect(hatUebung(tagesplan('hsv', 1, nur(['linie']), false))).toBe(true)
  })
})
