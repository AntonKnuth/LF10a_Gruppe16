import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  JUBEL_SEK, aktualisiere, anteil, autogrammFeld, ergebnis, feldBreite, hebeAb, imFeld,
  neueWelt, schreibe, setzeAn, spielerVon, zielTinte, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60)
}

/** Zieht eine gerade Strecke in kleinen Schritten. */
const strich = (w: Welt, x0: number, y0: number, x1: number, y1: number, schritte = 24) => {
  setzeAn(w)
  for (let i = 0; i <= schritte; i++) {
    schreibe(w, x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte, d())
  }
  hebeAb(w)
}

/** Schreibt so lange im Feld hin und her, bis das Autogramm voll ist. */
const signiere = (w: Welt) => {
  const f = w.feld
  const y = f.y + f.h / 2
  for (let i = 0; i < 12 && w.jubelUhr === 0; i++) {
    strich(w, f.x + 4, y, f.x + f.b - 4, y)
  }
}

describe('Stufe (B1) und Pinzettengriff', () => {
  it('macht das Autogrammfeld mit steigender Stufe kleiner', () => {
    expect(feldBreite(5)).toBeLessThan(feldBreite(1))
    expect(autogrammFeld(5).b).toBeLessThan(autogrammFeld(1).b)
  })

  it('koppelt die verlangte Strecke an die Feldbreite', () => {
    // Sonst verlangt ein kleineres Feld dieselbe Menge auf weniger Platz und wird
    // doppelt schwer — die Stufe soll die Feinheit erhöhen, nicht die Menge.
    expect(zielTinte(5) / feldBreite(5)).toBeCloseTo(zielTinte(1) / feldBreite(1))
  })

  it('regelt die Feldgröße während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    const vorher = { ...w.feld }
    signiere(w)
    laufe(w, JUBEL_SEK + 0.2)
    expect(w.feld).toEqual(vorher)
  })
})

describe('Feld', () => {
  it('erkennt innen und außen', () => {
    const f = autogrammFeld(3)
    expect(imFeld(f, f.x + f.b / 2, f.y + f.h / 2)).toBe(true)
    expect(imFeld(f, f.x - 10, f.y + f.h / 2)).toBe(false)
    expect(imFeld(f, f.x + f.b / 2, f.y + f.h + 10)).toBe(false)
  })
})

describe('Schreiben', () => {
  it('zählt die Strecke im Feld, nicht die Punkte', () => {
    const w = neueWelt(3)
    const f = w.feld
    strich(w, f.x + 4, f.y + f.h / 2, f.x + 104, f.y + f.h / 2)
    expect(w.tinte).toBeCloseTo(100, 0)
  })

  it('füllt das Autogramm nicht durch Tippen auf derselben Stelle', () => {
    const w = neueWelt(3)
    const f = w.feld
    const x = f.x + f.b / 2
    const y = f.y + f.h / 2
    setzeAn(w)
    for (let i = 0; i < 400; i++) schreibe(w, x, y, d())
    expect(w.tinte).toBe(0)
    expect(w.signiert).toBe(0)
  })

  it('zählt Danebengeschriebenes in die Gesamtstrecke, aber nicht ins Autogramm', () => {
    const w = neueWelt(3)
    const f = w.feld
    strich(w, f.x - 200, f.y - 60, f.x - 100, f.y - 60)
    expect(w.tinte).toBe(0)
    expect(w.tinteGesamt).toBeGreaterThan(0)
  })

  it('zählt einen Sprung nach dem Absetzen nicht als Strecke', () => {
    const w = neueWelt(3)
    const f = w.feld
    strich(w, f.x + 4, f.y + 10, f.x + 24, f.y + 10)
    const nachErstem = w.tinteGesamt
    // Stift abgesetzt und weit entfernt neu angesetzt — die Luftlinie ist keine Schrift.
    strich(w, f.x + 4, f.y + f.h - 10, f.x + 24, f.y + f.h - 10)
    expect(w.tinteGesamt - nachErstem).toBeLessThan(40)
  })

  it('treibt den Fortschritt zwischen 0 und 1', () => {
    const w = neueWelt(3)
    expect(anteil(w)).toBe(0)
    const f = w.feld
    strich(w, f.x + 4, f.y + f.h / 2, f.x + f.b - 4, f.y + f.h / 2)
    expect(anteil(w)).toBeGreaterThan(0)
    expect(anteil(w)).toBeLessThanOrEqual(1)
  })
})

describe('Trikots (C2)', () => {
  it('signiert das Trikot, sobald genug Tinte im Feld ist', () => {
    const w = neueWelt(3)
    signiere(w)
    expect(w.signiert).toBe(1)
    expect(w.jubelUhr).toBeGreaterThan(0)
    expect(w.trikot).toBe(0) // das Trikot bleibt noch kurz stehen
  })

  it('nimmt während des Jubels nichts mehr an', () => {
    const w = neueWelt(3)
    signiere(w)
    const gesamt = w.tinteGesamt
    const f = w.feld
    strich(w, f.x + 4, f.y + 4, f.x + 80, f.y + 4)
    expect(w.tinteGesamt).toBe(gesamt)
  })

  it('legt danach ein neues Trikot vor statt zu enden', () => {
    const w = neueWelt(3)
    signiere(w)
    laufe(w, JUBEL_SEK + 0.2)
    expect(w.trikot).toBe(1)
    expect(w.tinte).toBe(0)
    expect(w.schrift).toHaveLength(0)
  })

  it('behält die Gesamtzähler über das neue Trikot hinweg', () => {
    const w = neueWelt(3)
    signiere(w)
    const drin = w.tinteDrinGesamt
    const gesamt = w.tinteGesamt
    laufe(w, JUBEL_SEK + 0.2)
    // `tinte` geht auf null, die Bilanz darf es nicht — sonst wäre die Genauigkeit
    // ab dem zweiten Trikot falsch.
    expect(w.tinteDrinGesamt).toBe(drin)
    expect(w.tinteGesamt).toBe(gesamt)
  })

  it('reicht die Trikots des Vereinskaders der Reihe nach durch', () => {
    const w = neueWelt(3)
    const ersteR = spielerVon(w)
    w.trikot = w.kader.length
    // Nach einer Runde durch den Kader kommen neue Fans mit denselben Trikots.
    expect(spielerVon(w)).toEqual(ersteR)
  })
})

describe('Ergebnis', () => {
  it('misst Genauigkeit als Anteil der Schrift im Feld', () => {
    const w = neueWelt(3)
    const f = w.feld
    strich(w, f.x + 4, f.y + f.h / 2, f.x + 104, f.y + f.h / 2) // 100 drin
    strich(w, f.x - 200, f.y - 60, f.x - 100, f.y - 60) // 100 daneben
    expect(ergebnis(w, 100, false).genauigkeit).toBeCloseTo(0.5, 1)
  })

  it('rechnet die Genauigkeit über mehrere Trikots zusammen', () => {
    const w = neueWelt(3)
    signiere(w)
    laufe(w, JUBEL_SEK + 0.2)
    const f = w.feld
    strich(w, f.x + 4, f.y + f.h / 2, f.x + 104, f.y + f.h / 2)
    const e = ergebnis(w, 1000, false)
    // Alles lag im Feld — nach dem Trikotwechsel darf die Genauigkeit nicht einbrechen.
    expect(e.genauigkeit).toBeCloseTo(1, 1)
    expect(e.extra).toMatchObject({ signiert: 1, trikotsBegonnen: 2 })
  })

  it('zählt während des Jubels nur das eine Trikot', () => {
    const w = neueWelt(3)
    signiere(w)
    const e = ergebnis(w, 500, false)
    expect(e.extra).toMatchObject({ signiert: 1, trikotsBegonnen: 1 })
    expect(e.vollstaendigkeit).toBe(1)
  })

  it('liefert bei unberührtem Trikot Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, true)
    expect(e.spielId).toBe('autogramme')
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })

  it('reicht Stufe durch und markiert Tastaturdruck als synthetisch', () => {
    const w = neueWelt(4)
    const f = w.feld
    strich(w, f.x + 4, f.y + 10, f.x + 60, f.y + 10)
    const e = ergebnis(w, 100, false)
    // Ohne diese Markierung mischen sich echte Pencil-Druckkurven mit Tastaturwerten.
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(4)
    expect(e.extra).toMatchObject({ feldBreite: feldBreite(4) })
  })
})
