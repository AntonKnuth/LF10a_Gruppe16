import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  ABGABE_ABSTAND, DANK_SEK, GREIF_ABSTAND, PLAETZE, RUECKSTOSS, START, STOSS_ABSTAND, WEGE,
  abstand, abstandZumWeg, aktualisiere, aufWeg, beginne, ergebnis, hebeAb, laeuferPunkt, neueWelt,
  tempo, toleranz, verkaeufer, wegLaenge, ziehe, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60)
}

/** Zeichnet eine gerade Strecke vom Verkäufer zu einem Punkt. */
const zeichneNach = (w: Welt, ziel: { x: number; y: number }, schritte = 20) => {
  const start = verkaeufer(w)
  beginne(w, start.x, start.y)
  for (let i = 1; i <= schritte; i++) {
    ziehe(
      w,
      start.x + ((ziel.x - start.x) * i) / schritte,
      start.y + ((ziel.y - start.y) * i) / schritte,
      d(),
    )
  }
  hebeAb(w)
}

/**
 * Zeichnet dem Rang entlang, Stützpunkt für Stützpunkt.
 *
 * Nicht durch eine gerade Strecke zu ersetzen: die Sehne zwischen zwei Rangpunkten läuft
 * durch die Sitzreihen und wird deshalb — richtigerweise — als Nebenweg gewertet.
 */
const zeichneEntlangRang = (w: Welt, von: number, bis: number) => {
  const start = verkaeufer(w)
  beginne(w, start.x, start.y)
  for (let i = von; i <= bis; i++) ziehe(w, WEGE[0][i].x, WEGE[0][i].y, d())
  hebeAb(w)
}

/** Läuft, bis die Bedingung eintritt — höchstens `maxSek`. */
const laufeBis = (w: Welt, bedingung: () => boolean, maxSek = 30) => {
  for (let i = 0; i < Math.round(maxSek * 60) && !bedingung(); i++) aktualisiere(w, 1 / 60)
}

/** Ein Platz in mittlerer Entfernung — nah genug für einen kurzen Test, weit genug,
 *  dass die Abgabe nicht schon beim Start ausgelöst wird. */
const zielPlatz = PLAETZE.find((p) => abstand(p, START) > 120 && abstand(p, START) < 280)!

describe('Wegenetz', () => {
  it('hat drei Ränge und acht Treppen', () => {
    expect(WEGE).toHaveLength(11)
  })

  it('stellt den Verkäufer auf einen Weg', () => {
    expect(abstandZumWeg(START.x, START.y)).toBeCloseTo(0, 0)
  })

  it('erkennt die Mitte des Stadions als Nebenweg — dort ist das Spielfeld', () => {
    const w = neueWelt(3)
    expect(aufWeg(w, 450, 320)).toBe(false)
  })

  it('macht den Weg mit steigender Stufe schmaler', () => {
    expect(toleranz(5)).toBeLessThan(toleranz(1))
  })

  it('regelt die Toleranz während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    const vorher = toleranz(w.stufe)
    zeichneEntlangRang(w, 19, 24)
    laufe(w, 2)
    // Sonst wäre der Messwert im Verlauf nicht mehr mit der gespeicherten Stufe vergleichbar.
    expect(toleranz(w.stufe)).toBe(vorher)
  })
})

describe('Weg zeichnen', () => {
  it('beginnt immer beim Verkäufer', () => {
    const w = neueWelt(3)
    const figur = verkaeufer(w)
    expect(beginne(w, figur.x + 20, figur.y)).toBe(true)
    expect(abstand(w.linie[0], figur)).toBeCloseTo(0)
  })

  it('beginnt gar nicht, wenn weit daneben aufgesetzt wird', () => {
    const w = neueWelt(3)
    const vorher = w.linie.length
    const figur = verkaeufer(w)
    expect(beginne(w, figur.x + GREIF_ABSTAND + 50, figur.y)).toBe(false)
    expect(w.zieht).toBe(false)
    expect(w.linie).toHaveLength(vorher)
  })

  it('verlängert den Weg und merkt sich, was neben dem Weg lag', () => {
    const w = neueWelt(3)
    const figur = verkaeufer(w)
    beginne(w, figur.x, figur.y)
    ziehe(w, WEGE[0][19].x, WEGE[0][19].y, d())
    ziehe(w, 450, 320, d()) // mitten aufs Spielfeld

    expect(w.linie).toHaveLength(3)
    expect(w.linie[1].daneben).toBe(false)
    expect(w.linie[2].daneben).toBe(true)
    expect(w.proben).toBe(2)
    expect(w.probenDrin).toBe(1)
  })

  it('nimmt ohne aufliegenden Stift nichts an', () => {
    const w = neueWelt(3)
    ziehe(w, 100, 100, d())
    expect(w.linie).toHaveLength(1)
    expect(w.proben).toBe(0)
  })

  it('lässt den Weg beim Absetzen liegen', () => {
    const w = neueWelt(3)
    zeichneNach(w, zielPlatz)
    const laenge = wegLaenge(w.linie)
    hebeAb(w)
    laufe(w, 0.2)
    expect(wegLaenge(w.linie)).toBeCloseTo(laenge)
  })
})

describe('Laufen', () => {
  it('folgt dem Weg und bleibt am Ende stehen', () => {
    const w = neueWelt(3)
    zeichneEntlangRang(w, 19, 22)
    const laenge = wegLaenge(w.linie)

    laufe(w, 20)
    expect(w.gelaufen).toBeCloseTo(laenge, 0)

    // Kein Weiterlaufen ins Nichts: die Figur wartet auf den nächsten Strich.
    const stand = verkaeufer(w)
    laufe(w, 3)
    expect(abstand(verkaeufer(w), stand)).toBeCloseTo(0)
  })

  it('geht höchstens Schritttempo, auch wenn viel gezeichnet wurde', () => {
    const w = neueWelt(3)
    zeichneEntlangRang(w, 19, 34)
    laufe(w, 1)
    // Eine Sekunde ist eine Sekunde — der Stift eilt voraus, die Figur nicht.
    expect(w.gelaufen).toBeLessThanOrEqual(tempo(3) * 1.05)
    expect(w.gelaufen).toBeGreaterThan(tempo(3) * 0.8)
  })

  it('kommt quer durch die Sitzreihen nur schleichend voran', () => {
    const aufWegWelt = neueWelt(3)
    // Weit genug zeichnen, dass die Figur nach einer Sekunde nicht schon am Ende steht.
    zeichneEntlangRang(aufWegWelt, 19, 44)
    laufe(aufWegWelt, 1)

    const querfeldein = neueWelt(3)
    zeichneNach(querfeldein, { x: 450, y: 320 }, 30) // quer aufs Spielfeld
    laufe(querfeldein, 1)

    expect(aufWegWelt.gelaufen).toBeGreaterThan(tempo(3) * 0.9)
    expect(querfeldein.gelaufen).toBeLessThan(aufWegWelt.gelaufen * 0.6)
  })
})

describe('Zusammenstoß', () => {
  /** Baut eine Welt, in der ein Zuschauer genau auf dem gezeichneten Weg steht. */
  const mitHindernis = () => {
    const w = neueWelt(3)
    w.laeufer = [{ rang: 0, winkel: (24 / 72) * Math.PI * 2, drehung: 0 }]
    zeichneNach(w, WEGE[0][30], 30)
    return w
  }

  it('bricht den Weg ab und schiebt die Figur zurück', () => {
    const w = mitHindernis()
    const hindernis = laeuferPunkt(w.laeufer[0])

    laufe(w, 10)

    expect(w.kollisionen).toBeGreaterThanOrEqual(1)
    // Der Weg endet dort, wo die Figur steht — vor ihr liegt nichts mehr.
    expect(w.gelaufen).toBeCloseTo(wegLaenge(w.linie), 0)
    // Und sie steht mit Abstand hinter dem Zuschauer, nicht in ihm.
    expect(abstand(verkaeufer(w), hindernis)).toBeGreaterThan(STOSS_ABSTAND)
    expect(w.zieht).toBe(false)
  })

  it('stößt nicht in jedem Einzelbild erneut', () => {
    const w = mitHindernis()
    laufe(w, 10)
    // Ohne die kurze Unempfindlichkeit käme die Figur nie wieder von der Stelle.
    expect(w.kollisionen).toBeLessThanOrEqual(2)
  })

  it('schiebt höchstens bis zum Anfang zurück — nie ins Minus', () => {
    const w = neueWelt(3)
    w.laeufer = [{ rang: 0, winkel: (19 / 72) * Math.PI * 2, drehung: 0 }]
    zeichneNach(w, WEGE[0][24], 20)
    laufe(w, 6)
    expect(w.gelaufen).toBeGreaterThanOrEqual(0)
    expect(w.gelaufen).toBeLessThan(RUECKSTOSS + tempo(3))
  })

  it('kennt keinen Verliererzustand — auch Dauerrempeln bricht nichts ab', () => {
    const w = mitHindernis()
    for (let i = 0; i < 10; i++) {
      zeichneNach(w, WEGE[0][30], 30)
      laufe(w, 4)
    }
    expect(() => ergebnis(w, 10_000, false)).not.toThrow()
    expect(w.erledigt).toBe(0)
  })
})

describe('Bestellung und Abgabe', () => {
  it('hat von Anfang an eine Bestellung', () => {
    const w = neueWelt(3)
    expect(w.besteller).not.toBe(null)
    expect(w.begonnen).toBe(1)
  })

  it('zählt die Abgabe, wenn die Figur beim Besteller ankommt', () => {
    const w = neueWelt(3)
    w.besteller = zielPlatz
    zeichneNach(w, zielPlatz, 30)
    laufeBis(w, () => w.erledigt > 0)

    expect(abstand(verkaeufer(w), zielPlatz)).toBeLessThanOrEqual(ABGABE_ABSTAND)
    expect(w.erledigt).toBe(1)
    expect(w.dankUhr).toBeGreaterThan(0)
    expect(w.dankSpruch).not.toBe('')
  })

  it('zählt dieselbe Abgabe nicht doppelt', () => {
    const w = neueWelt(3)
    w.besteller = zielPlatz
    zeichneNach(w, zielPlatz, 30)
    laufeBis(w, () => w.erledigt > 0)
    // Weiterlaufen am selben Platz zählt nicht noch einmal.
    laufe(w, 1)
    expect(w.erledigt).toBe(1)
  })

  it('schickt nach dem Dank die nächste Bestellung an einen anderen Platz', () => {
    const w = neueWelt(3)
    const erster = w.besteller
    w.besteller = zielPlatz
    zeichneNach(w, zielPlatz, 30)
    laufeBis(w, () => w.erledigt > 0)
    expect(w.dankUhr).toBeGreaterThan(0)

    laufe(w, DANK_SEK + 0.2)
    expect(w.dankUhr).toBeLessThanOrEqual(0)
    expect(w.besteller).not.toBe(zielPlatz)
    expect(w.besteller).not.toBe(erster)
    expect(w.begonnen).toBe(2)
  })
})

describe('Ergebnis', () => {
  it('misst Vollständigkeit an den Bestellungen, die beliefert wurden', () => {
    const w = neueWelt(3)
    w.besteller = zielPlatz
    zeichneNach(w, zielPlatz, 30)
    laufeBis(w, () => w.erledigt > 0)
    laufe(w, DANK_SEK + 0.2) // zweite Bestellung kommt, bleibt offen

    const e = ergebnis(w, 60_000, false)
    expect(e.spielId).toBe('brezelverkauf')
    expect(e.vollstaendigkeit).toBeCloseTo(0.5)
    expect(e.extra).toMatchObject({ beliefert: 1, bestellungen: 2, toleranz: toleranz(3) })
  })

  it('rechnet Genauigkeit über alle gezeichneten Punkte', () => {
    const w = neueWelt(3)
    const figur = verkaeufer(w)
    beginne(w, figur.x, figur.y)
    ziehe(w, WEGE[0][19].x, WEGE[0][19].y, d()) // auf dem Weg
    ziehe(w, 450, 320, d()) // quer über das Spielfeld
    expect(ergebnis(w, 100, false).genauigkeit).toBeCloseTo(0.5)
  })

  it('liefert ohne einen einzigen Strich Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, true)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })

  it('reicht Stufe durch und markiert Tastaturdruck als synthetisch', () => {
    const w = neueWelt(4)
    zeichneEntlangRang(w, 19, 22)
    const e = ergebnis(w, 100, false)
    // Ohne diese Markierung mischen sich echte Pencil-Druckkurven mit Tastaturwerten.
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(4)
  })
})
