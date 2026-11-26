import { describe, expect, it } from 'vitest'
import { aktuellesSegment, session, starteSession } from './session'
import {
  ansageText, hatUebung, spieleDesTages, standardEinstellungen, tagesplan, vorfuehrPlan,
  NICHT_IN_VORFUEHRUNG, VORFUEHR_PAUSE_SEK, VORFUEHR_SPIEL_SEK, type Einstellungen,
} from './tagesplan'
import { KATALOG, spieleMitRolle } from '../spiele/katalog'
import { vereine } from '../content'
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

  it('gibt die Regler je Übung ins Segment (B1)', () => {
    const e = nur(['linie'])
    e.spiele.linie = { ...e.spiele.linie, toleranz: 2, zielgeschwindigkeit: 0.5, mindesttrefferquote: 0.8 }
    const segment = tagesplan('hsv', 1, e, false).find((s) => s.art === 'spiel')
    expect(segment).toMatchObject({
      spielId: 'linie',
      regler: { toleranz: 2, zielgeschwindigkeit: 0.5, mindesttrefferquote: 0.8 },
    })
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
    const nachher = spieleDesTages('hsv', 1, nur(['aufwaermen', 'linie', 'autogramme', 'brezelverkauf']))
    expect(nachher).not.toEqual(vorher)
  })

  it('vermeidet gleiche Fähigkeitsbereiche hintereinander, wo es geht', () => {
    // Topf mit klar getrennten Bereichen: hier darf sich nichts überschneiden.
    const e: Einstellungen = {
      ...nur(['aufwaermen', 'linie', 'autogramme', 'rasenmaehen']),
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
      ...nur(['linie', 'autogramme']),
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

describe('ansageText', () => {
  const ansage = (uebungen: number) =>
    ansageText(tagesplan('hsv', 1, { ...E, anzahlAufwaermen: 0, anzahlUebungen: uebungen }, false))

  it('sagt „1 Pause" und nicht „1 Pausen" (A5: der Satz wird vorgelesen)', () => {
    expect(ansage(2)).toContain('2 Übungen mit 1 Pause ')
    expect(ansage(3)).toContain('3 Übungen mit 2 Pausen ')
  })

  it('sagt „1 Übung" bei einer einzigen Übung', () => {
    expect(ansage(1)).toContain('1 Übung mit 0 Pausen ')
  })
})

describe('vorfuehrPlan', () => {
  // Bewusst nur ein Spiel aktiv und die Vorgabe-Anzahlen: beides darf keine Rolle spielen.
  const e = nur(['elfmeter'])
  e.spiele.elfmeter = { ...e.spiele.elfmeter, stufe: 2, toleranz: 1.7 }

  const spielbar = Object.keys(KATALOG).filter(
    (id) => !KATALOG[id].inArbeit && !NICHT_IN_VORFUEHRUNG.includes(id),
  )

  it('lässt die ausgenommenen Spiele weg, der normale Tagesplan behält sie', () => {
    const vorfuehrung = spieleVon(vorfuehrPlan(1, e, false))
    for (const id of NICHT_IN_VORFUEHRUNG) expect(vorfuehrung).not.toContain(id)

    const normal = new Set(
      vereine.flatMap((v) => [1, 2, 3, 4, 5].flatMap((t) => spieleDesTages(v.id, t, E))),
    )
    for (const id of NICHT_IN_VORFUEHRUNG) expect(normal).toContain(id)
  })

  it('zeigt jedes übrige Spiel genau einmal: Aufwärmen, Übungen, Urkunde zuletzt', () => {
    const plan = vorfuehrPlan(2, e, false)
    expect(spieleVon(plan)).toEqual([
      ...spielbar.filter((id) => KATALOG[id].rolle === 'aufwaermen'),
      ...spielbar.filter((id) => KATALOG[id].rolle === 'normal'),
      'abschiedsgeschenk',
    ])
    expect(new Set(spieleVon(plan)).size).toBe(spielbar.length)
  })

  it('läuft je Spiel 30 s und je Pause 5 s, mit Stufe und Reglern aus den Einstellungen', () => {
    const plan = vorfuehrPlan(1, e, false)
    for (const s of plan) {
      if (s.art === 'spiel') expect(s.dauerSek).toBe(VORFUEHR_SPIEL_SEK)
      if (s.art === 'pause') expect(s.dauerSek).toBe(VORFUEHR_PAUSE_SEK)
    }
    expect([VORFUEHR_SPIEL_SEK, VORFUEHR_PAUSE_SEK]).toEqual([30, 5])
    const elfmeter = plan.find((s) => s.art === 'spiel' && s.spielId === 'elfmeter')
    expect(elfmeter).toMatchObject({ stufe: 2, regler: { toleranz: 1.7 } })
  })

  it('behält den Ablauf: Selbsteinschätzung vor Lob (C3), Fragebogen am Ende', () => {
    const a = vorfuehrPlan(1, e, true).map((s) => s.art)
    expect(a.slice(0, 3)).toEqual(['namenseingabe', 'ankommen', 'ansage'])
    expect(a.at(-1)).toBe('fragebogen')
    a.forEach((art, i) => {
      if (art === 'spiel') expect([a[i + 1], a[i + 2]]).toEqual(['selbsteinschaetzung', 'lob'])
    })
  })

  it('markiert die Einheit als Vorführung, ein normaler Start nicht', () => {
    expect(starteSession('koeln', 1, vorfuehrPlan(1, e, false), true).vorfuehrung).toBe(true)
    expect(starteSession('koeln', 1, tagesplan('koeln', 1, E, false)).vorfuehrung).toBe(false)
  })
})
