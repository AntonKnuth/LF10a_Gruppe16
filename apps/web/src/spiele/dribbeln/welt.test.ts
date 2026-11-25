import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import { VORGABE_REGLER, type Regler } from '../regler'
import {
  BLOCK, FANG_R, JUBEL_SEK, KULLERN_PX, PFIFF_BIS, WEGROLLEN_PX, abstand, aktualisiere, bahnPunkte,
  ballPunkt, beendePause, beginnePause, darfEnden, ergebnis, haltedauer, hebeAb, kuendigtAn,
  neueWelt, parameter, punktAuf, setzeAuf, vorperiode, ziehe, type Ereignis, type Pfiff, type Welt,
} from './welt'

const d: Druck = { wert: 0.5, synthetisch: true }
const BILD = 1000 / 60
const regler = (r: Partial<Regler>): Regler => ({ ...VORGABE_REGLER, ...r })

/** Ein Bild weiter, auf beiden Uhren. */
const bild = (w: Welt): Ereignis[] => aktualisiere(w, 1 / 60, w.tMs + BILD)

/** Der Stift liegt still (oder gar nicht auf). */
const laufe = (w: Welt, sekunden: number): Ereignis[] =>
  Array.from({ length: Math.round(sekunden * 60) }, () => bild(w)).flat()

const setzeAnBall = (w: Welt) => {
  const p = ballPunkt(w)
  return setzeAuf(w, p.x, p.y, d, w.tMs)
}

/** Dribbelt mit 150 px/s; am Gassenende wird neu aufgesetzt. Hält, sobald `bis` zutrifft. */
function dribble(w: Welt, bis: () => boolean, sekunden = 60): Ereignis[] {
  const alle: Ereignis[] = []
  for (let i = 0; i < sekunden * 60 && !bis(); i++) {
    if (w.jubelUhr <= 0 && !w.zieht) alle.push(...setzeAnBall(w))
    if (w.jubelUhr > 0) alle.push(...hebeAb(w, w.tMs))
    else {
      const p = punktAuf(w.bahn, w.fortschritt + 150 / 60 / 650)
      alle.push(...ziehe(w, p.x, p.y, d, w.tMs))
    }
    alle.push(...bild(w))
  }
  return alle
}

const bisPfiff = (w: Welt) => dribble(w, () => w.phase === 'stopp')

const letzter = (w: Welt): Pfiff => w.pfiffe[w.pfiffe.length - 1]

/** Bis zum Pfiff dribbeln und still liegen lassen, bis weitergepfiffen wird. */
const saubererDurchgang = (w: Welt) => {
  bisPfiff(w)
  laufe(w, 5)
}

/** Beim Pfiff abheben und den Ball wieder holen. */
const abheber = (w: Welt) => {
  bisPfiff(w)
  const e = hebeAb(w, w.tMs)
  laufe(w, 1)
  setzeAnBall(w)
  bild(w)
  return e
}

/** Nach dem ersten Pfiff, der nur vorführt. */
const nachProbe = (stufe = 3, r = VORGABE_REGLER, saat = 1) => {
  const w = neueWelt(stufe, undefined, r, saat)
  saubererDurchgang(w)
  return w
}

/** Weit vom Ruhepunkt weg, aber noch auf dem Rasen. */
const wandere = (w: Welt, px = 40) => ziehe(w, w.zeiger.x, w.zeiger.y + px, d, w.tMs)

describe('Stufe und Regler (B1)', () => {
  it('wird mit der Stufe strenger', () => {
    const leicht = parameter(1, VORGABE_REGLER)
    const schwer = parameter(5, VORGABE_REGLER)
    expect(schwer.stillRadius).toBeLessThan(leicht.stillRadius)
    expect(schwer.fristMs).toBeLessThan(leicht.fristMs)
    expect(schwer.korridor).toBeLessThan(leicht.korridor)
    expect(schwer.vMin).toBeGreaterThan(leicht.vMin)
  })

  it('bleibt während des Spiels fest', () => {
    const w = neueWelt(3)
    const vorher = { ...w.p }
    abheber(w)
    abheber(w)
    expect(w.p).toEqual(vorher)
  })

  it('macht mit der Toleranz Gasse und Stillstand großzügiger', () => {
    const p = parameter(3, regler({ toleranz: 2 }))
    expect(p.korridor).toBe(88)
    expect(p.stillRadius).toBe(12)
  })

  it('lässt den Fehlstartradius bei jeder Toleranz über dem Stillradius', () => {
    for (const stufe of [1, 2, 3, 4, 5]) {
      for (const toleranz of [0.1, 1, 3]) {
        const p = parameter(stufe, regler({ toleranz }))
        expect(p.fehlstartRadius).toBeGreaterThan(p.stillRadius)
      }
    }
  })

  it('verlangt mit dem Zieltempo schnelleres Dribbeln, bevor gepfiffen wird', () => {
    const w = neueWelt(3, undefined, regler({ zielgeschwindigkeit: 3 })) // 240 px/s nötig
    dribble(w, () => false, 20) // 150 px/s
    expect(w.pfiffe).toHaveLength(0)
  })

  it('legt unter der Mindesttrefferquote dieselbe Gasse genau einmal noch aus', () => {
    const w = nachProbe(3, regler({ mindesttrefferquote: 0.9 }))
    abheber(w)
    const gasse = w.gasse
    const bisPass = () => {
      const vorher = w.paesse
      while (w.paesse === vorher) {
        dribble(w, () => w.phase === 'stopp' || w.paesse > vorher)
        if (w.phase === 'stopp') {
          hebeAb(w, w.tMs)
          laufe(w, 1)
          setzeAnBall(w)
          bild(w)
        }
      }
      laufe(w, JUBEL_SEK + 0.2)
    }
    bisPass()
    expect([w.gasse, w.wiederholung]).toEqual([gasse, true])
    expect(w.hinweise.length).toBeGreaterThan(0)
    bisPass()
    expect([w.gasse, w.wiederholung]).toEqual([gasse + 1, false])
  })

  it('wiederholt bei der Vorgabe nichts', () => {
    const w = neueWelt(3)
    dribble(w, () => w.gasse > 2 || w.phase === 'stopp')
    for (let i = 0; i < 12; i++) abheber(w)
    expect(w.wiederholungen).toBe(0)
    expect(w.gasse).toBe(w.paesse)
  })
})

describe('Plan der Pfiffe', () => {
  const block = (f: typeof vorperiode, stufe: number, saat: number, ab = 0) =>
    Array.from({ length: BLOCK }, (_, i) => f(stufe, saat, ab + i))
  const sortiert = (l: number[]) => [...l].sort((a, b) => a - b)

  it('ist bei gleicher Saat derselbe, bei anderer Saat ein anderer', () => {
    expect(block(vorperiode, 3, 7)).toEqual(block(vorperiode, 3, 7))
    expect(block(vorperiode, 3, 7)).not.toEqual(block(vorperiode, 3, 8))
  })

  it('nutzt in jedem Block dieselben Werte, nur anders gemischt', () => {
    const erster = block(vorperiode, 3, 42)
    const zweiter = block(vorperiode, 3, 42, BLOCK)
    expect(zweiter).not.toEqual(erster)
    expect(sortiert(zweiter)).toEqual(sortiert(erster))
    sortiert(erster).forEach((v, i) => expect(v).toBeCloseTo([1.5, 2, 2, 2.5, 3, 3.5, 4.5, 6][i]))
  })

  it('hält die Haltedauer im Bereich der Stufe und mischt sie unabhängig', () => {
    const dauern = block(haltedauer, 3, 42)
    expect(Math.min(...dauern)).toBeCloseTo(1.5)
    expect(Math.max(...dauern)).toBeCloseTo(3)
    const rang = (l: number[]) => l.map((v) => sortiert(l).indexOf(v))
    expect(rang(dauern)).not.toEqual(rang(block(vorperiode, 3, 42)))
  })

  it('pfeift erst nach der geplanten Dribbelzeit', () => {
    const w = neueWelt(3, undefined, VORGABE_REGLER, 5)
    const soll = vorperiode(3, 5, 0)
    dribble(w, () => false, soll - 0.1)
    expect(w.phase).toBe('dribbeln')
    expect(bisPfiff(w)).toContain('pfiff')
  })

  it('pfeift nie, wenn der Stift ruht oder gar nicht liegt', () => {
    const w = neueWelt(3)
    laufe(w, 20)
    setzeAnBall(w)
    laufe(w, 20)
    expect(w.pfiffe).toHaveLength(0)
  })

  it('pfeift nie in den letzten zehn Prozent der Gasse', () => {
    const w = neueWelt(1)
    for (let i = 0; i < 25; i++) {
      bisPfiff(w)
      expect(w.fortschritt).toBeLessThan(PFIFF_BIS)
      expect(w.jubelUhr).toBeLessThanOrEqual(0)
      laufe(w, 5)
    }
  })

  it('kündigt nur den ersten Pfiff an, und nur der ist eine Probe', () => {
    const w = neueWelt(3)
    dribble(w, () => kuendigtAn(w))
    expect(w.phase).toBe('dribbeln')
    saubererDurchgang(w)
    dribble(w, () => kuendigtAn(w) || w.phase === 'stopp')
    expect(w.phase).toBe('stopp')
    expect(w.pfiffe.map((p) => p.probe)).toEqual([true, false])
  })
})

describe('Anhalten', () => {
  it('erkennt den Stillstand und meldet ihn sofort (A1)', () => {
    const w = nachProbe()
    bisPfiff(w)
    expect(laufe(w, 0.2)).toContain('gestoppt')
    expect(w.phase).toBe('halten')
    expect(letzter(w).rechtzeitig).toBe(true)
  })

  it('merkt sich, wann die Spitze stand — nach einem Nachlauf entsprechend später', () => {
    const w = nachProbe()
    bisPfiff(w)
    const stopp = letzter(w).stoppMs
    for (let i = 0; i < 24; i++) {
      wandere(w, i % 2 ? 10 : -10)
      bild(w)
    }
    laufe(w, 0.3)
    expect(letzter(w).gestopptMs! - stopp).toBeGreaterThan(300)
    expect(letzter(w).gestopptMs! - stopp).toBeLessThan(500)
    expect(letzter(w).rechtzeitig).toBe(true)
  })

  it('lässt den Ball beim Pfiff liegen, auch wenn der Stift weiterläuft', () => {
    const w = nachProbe()
    bisPfiff(w)
    const vorher = w.fortschritt
    for (let i = 0; i < 30; i++) {
      const p = punktAuf(w.bahn, w.fortschritt + i / 100)
      ziehe(w, p.x, p.y, d, w.tMs)
      bild(w)
    }
    expect(w.fortschritt).toBe(vorher)
  })

  it('geht nach der Frist auch ohne Stillstand weiter, nur nicht sauber', () => {
    const w = nachProbe()
    bisPfiff(w)
    let i = 0
    while (w.phase === 'stopp' || w.phase === 'halten') {
      wandere(w, i++ % 2 ? 10 : -10)
      bild(w)
    }
    expect(letzter(w)).toMatchObject({
      ende: 'doppelpfiff', gestopptMs: null, rechtzeitig: false, fehlstart: false,
    })
    expect(w.sterneUhr).toBe(0)
    // Frist plus volle Haltedauer: der Doppelpfiff hängt nicht von der Reaktion ab.
    const soll = w.p.fristMs + haltedauer(3, 1, letzter(w).nr - 1) * 1000
    expect(letzter(w).doppelMs! - letzter(w).stoppMs).toBeGreaterThanOrEqual(soll)
    expect(letzter(w).doppelMs! - letzter(w).stoppMs).toBeLessThan(soll + 100)
  })

  it('pfeift nach der Haltedauer doppelt und belohnt den sauberen Stopp', () => {
    const w = nachProbe()
    bisPfiff(w)
    const e: Ereignis[] = []
    while (w.phase !== 'dribbeln') e.push(...bild(w))
    expect(e).toEqual(['gestoppt', 'doppelpfiff'])
    expect(letzter(w).ende).toBe('doppelpfiff')
    expect(w.sterneUhr).toBeGreaterThan(0)
    expect(w.amBall).toBe(true)
  })

  it('funktioniert auch ohne Ton gleich und merkt sich das je Pfiff', () => {
    const w = neueWelt(3)
    w.tonAn = false
    saubererDurchgang(w)
    expect(letzter(w)).toMatchObject({ tonAn: false, ende: 'doppelpfiff', rechtzeitig: true })
  })
})

describe('Loslaufen vor dem Doppelpfiff', () => {
  it('lässt den Ball nur einmal kurz kullern, das Halten läuft weiter', () => {
    const w = nachProbe()
    bisPfiff(w)
    laufe(w, 0.2)
    const vorher = ballPunkt(w)
    expect(wandere(w)).toEqual(['kullern'])
    expect(wandere(w)).toEqual([])
    expect(w.phase).toBe('halten')
    const e = laufe(w, 5)
    expect(abstand(vorher, ballPunkt(w))).toBeLessThanOrEqual(KULLERN_PX)
    expect(abstand(vorher, ballPunkt(w))).toBeGreaterThan(KULLERN_PX / 2)
    expect(e).toContain('doppelpfiff')
    expect(letzter(w)).toMatchObject({ fehlstart: true, ende: 'doppelpfiff' })
    expect(ergebnis(w, 1, false).genauigkeit).toBe(0)
  })

  it('zählt ein Zittern innerhalb des Radius nicht', () => {
    const w = nachProbe()
    bisPfiff(w)
    laufe(w, 0.2)
    expect(wandere(w, w.p.fehlstartRadius - 1)).toEqual([])
    expect(letzter(w).fehlstart).toBe(false)
  })
})

describe('Abheben (C2)', () => {
  it('hat beim Dribbeln keine Folge', () => {
    const w = neueWelt(3)
    dribble(w, () => w.fortschritt > 0.2)
    const vorher = w.fortschritt
    expect(hebeAb(w, w.tMs)).toEqual([])
    laufe(w, 2)
    expect(w.phase).toBe('dribbeln')
    expect(w.fortschritt).toBe(vorher)
  })

  it('lässt den Ball beim Pfiff ein Stück nach vorn rollen und dort warten', () => {
    const w = nachProbe()
    bisPfiff(w)
    const vorher = ballPunkt(w)
    const t = w.fortschritt
    expect(hebeAb(w, w.tMs)).toContain('kullern')
    laufe(w, 3)
    expect(w.phase).toBe('weggerollt')
    expect(w.fortschritt).toBeGreaterThan(t)
    expect(w.fortschritt).toBeLessThan(1)
    expect(abstand(vorher, ballPunkt(w))).toBeLessThanOrEqual(WEGROLLEN_PX)
    expect(letzter(w)).toMatchObject({ ende: 'abgehoben', doppelMs: null })
  })

  it('geht ohne Doppelpfiff weiter, sobald Ben am Ball aufsetzt', () => {
    const w = nachProbe()
    bisPfiff(w)
    hebeAb(w, w.tMs)
    laufe(w, 1)
    const b = ballPunkt(w)
    setzeAuf(w, b.x + FANG_R + 10, b.y, d, w.tMs)
    bild(w)
    expect(w.phase).toBe('weggerollt')
    setzeAuf(w, b.x + FANG_R - 10, b.y, d, w.tMs)
    bild(w)
    expect(w.phase).toBe('dribbeln')
    expect(w.amBall).toBe(true)
  })

  it('lässt sich nicht durch kurzes Abtippen abkürzen', () => {
    const w = nachProbe()
    bisPfiff(w)
    hebeAb(w, w.tMs)
    setzeAnBall(w)
    bild(w)
    expect(w.phase).toBe('weggerollt')
  })

  it('verliert nie Fortschritt und endet nie von selbst', () => {
    const w = neueWelt(5)
    for (let i = 0; i < 20; i++) {
      abheber(w)
      const vorher = [w.paesse, w.fortschritt]
      laufe(w, 3)
      expect([w.paesse, w.fortschritt]).toEqual(vorher)
    }
    expect(w.phase).toBe('dribbeln')
  })
})

describe('Dribbeln', () => {
  it('nimmt den Ball nur vom Ball aus mit — weiter vorn aufsetzen überholt nichts', () => {
    const w = neueWelt(3)
    const p = punktAuf(w.bahn, 0.6)
    setzeAuf(w, p.x, p.y, d, 0)
    expect(w.fortschritt).toBe(0)
    expect(w.amBall).toBe(false)
  })

  it('verliert den Ball neben der Gasse und findet ihn wieder', () => {
    const w = neueWelt(3)
    dribble(w, () => w.fortschritt > 0.2)
    wandere(w, 200)
    expect(w.amBall).toBe(false)
    const b = ballPunkt(w)
    ziehe(w, b.x, b.y, d, w.tMs)
    expect(w.amBall).toBe(true)
  })

  it('piept an Hütchen, feiert den Pass und legt eine andere Welle aus (B3)', () => {
    const w = neueWelt(3)
    const e: Ereignis[] = []
    setzeAnBall(w)
    for (let i = 1; i <= 100; i++) {
      const p = punktAuf(w.bahn, i / 100)
      e.push(...ziehe(w, p.x, p.y, d, w.tMs))
    }
    expect(e.filter((x) => x === 'huetchen')).toHaveLength(7)
    expect(e.at(-1)).toBe('pass')
    expect(w.paesse).toBe(1)
    laufe(w, JUBEL_SEK + 0.1)
    expect(w.fortschritt).toBe(0)
    expect(w.bahn).toEqual(bahnPunkte(1))
    expect(bahnPunkte(1)).not.toEqual(bahnPunkte(0))
  })
})

describe('Pausenmenü', () => {
  it('macht den laufenden Pfiff ungültig', () => {
    const w = nachProbe()
    bisPfiff(w)
    beginnePause(w, w.tMs)
    expect(letzter(w).ende).toBe('pause')
    expect(w.phase).toBe('dribbeln')
    expect(ergebnis(w, 1, false).vollstaendigkeit).toBe(0)
  })

  it('zählt das Abheben auf dem Weg zum Knopf nicht als Abheben', () => {
    const w = nachProbe()
    bisPfiff(w)
    hebeAb(w, w.tMs)
    laufe(w, 0.4)
    beginnePause(w, w.tMs)
    expect(letzter(w).ende).toBe('pause')
  })

  it('protokolliert auf der Rohdaten-Uhr, die in der Pause weiterläuft', () => {
    const w = neueWelt(3)
    dribble(w, () => w.dribbelzeit > 0.5)
    const dribbelzeit = w.dribbelzeit
    const von = w.tMs
    beginnePause(w, von)
    beendePause(w, von + 10_000)
    w.tMs = von + 10_000 // die Bildschleife liefert danach diese Uhrzeit
    expect(w.dribbelzeit).toBe(dribbelzeit)
    bisPfiff(w)
    expect(w.pausen).toEqual([{ vonMs: von, bisMs: von + 10_000 }])
    expect(letzter(w).stoppMs).toBe(w.tMs)
    expect(letzter(w).stoppMs - w.zeitGesamt * 1000).toBeCloseTo(10_000, 0)
  })
})

describe('Hilfe (C2)', () => {
  it('kommt nach drei unsauberen Stopps einmal und frühestens nach einer Minute wieder', () => {
    const w = nachProbe()
    abheber(w)
    abheber(w)
    expect(w.hinweise).toHaveLength(0)
    expect(abheber(w)).toContain('hilfe')
    while (w.hinweise.length < 2) abheber(w)
    expect(w.hinweise[1] - w.hinweise[0]).toBeGreaterThanOrEqual(60_000)
  })

  it('beginnt nach einem sauberen Stopp von vorn zu zählen', () => {
    const w = nachProbe()
    abheber(w)
    abheber(w)
    saubererDurchgang(w)
    abheber(w)
    abheber(w)
    expect(w.hinweise).toHaveLength(0)
  })
})

describe('Ende', () => {
  it('ist nie mitten in Pfiff, Rollen oder Jubel', () => {
    const w = nachProbe()
    expect(darfEnden(w)).toBe(true)
    bisPfiff(w)
    expect(darfEnden(w)).toBe(false)
    laufe(w, 0.3) // halten
    expect(darfEnden(w)).toBe(false)
    hebeAb(w, w.tMs)
    expect(darfEnden(w)).toBe(false)
    laufe(w, 1) // ausgerollt; auf Ben wird nicht gewartet
    expect(darfEnden(w)).toBe(true)
  })

  it('kommt auch dann, wenn Ben nichts mehr tut', () => {
    const w = nachProbe(5)
    bisPfiff(w)
    laufe(w, 6)
    expect(darfEnden(w)).toBe(true)
  })
})

describe('Ergebnis', () => {
  it('rechnet über die gewerteten Pfiffe, ohne die Probe', () => {
    const w = nachProbe()
    saubererDurchgang(w)
    abheber(w)
    const e = ergebnis(w, 1234, false)
    expect(e).toMatchObject({
      spielId: 'dribbeln', dauerMs: 1234, stufe: 3, synthetischerDruck: true, genauigkeit: 0.5,
      vollstaendigkeit: 0.5, druckMittel: 0.5, abgebrochen: false,
    })
    expect(e.extra).toMatchObject({ version: 1, saat: 1, saubereStopps: 1, parameter: w.p })
    const pfiffe = e.extra.pfiffe as Pfiff[]
    expect(pfiffe.map((p) => [p.nr, p.probe, p.ende])).toEqual([
      [1, true, 'doppelpfiff'], [2, false, 'doppelpfiff'], [3, false, 'abgehoben'],
    ])
    for (const p of pfiffe) expect(p.endeMs!).toBeGreaterThan(p.stoppMs - 1)
  })

  it('kennzeichnet einen offenen Pfiff, ohne ihn zu werten', () => {
    const w = nachProbe()
    bisPfiff(w)
    const pfiffe = ergebnis(w, 1, true).extra.pfiffe as Pfiff[]
    expect(pfiffe.at(-1)).toMatchObject({ ende: 'zeit', endeMs: w.tMs })
  })

  it('liefert ohne einen einzigen Pfiff Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, false)
    expect([e.vollstaendigkeit, e.genauigkeit, e.druckMittel]).toEqual([0, 0, 0])
  })
})
