import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  JUBEL_SEK, aktualisiere, aufBahn, bahn, ballPunkt, ergebnis, klemme, neueWelt, punktAuf,
  toleranz, ziehe, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60)
}

/** Zieht sauber auf der Bahn von t0 bis t1. */
const zieheAuf = (w: Welt, t0: number, t1: number, schritte = 20) => {
  for (let i = 0; i <= schritte; i++) {
    const p = punktAuf(w, t0 + ((t1 - t0) * i) / schritte)
    ziehe(w, p.x, p.y, d())
  }
}

describe('Stufe (B1)', () => {
  it('macht den Korridor mit steigender Stufe schmaler', () => {
    expect(toleranz(5)).toBeLessThan(toleranz(1))
  })

  it('regelt die Toleranz während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    const vorher = toleranz(w.stufe)
    zieheAuf(w, 0, 0.5)
    // Sonst wäre der Messwert im Verlauf nicht mehr mit der gespeicherten Stufe vergleichbar.
    expect(toleranz(w.stufe)).toBe(vorher)
  })
})

describe('Bahnen (B3: wechselnde Muster)', () => {
  it('ist deterministisch — der Test braucht kein Zufallsmuster', () => {
    expect(bahn(3)).toEqual(bahn(3))
  })

  it('wechselt die Neigung von Runde zu Runde', () => {
    const neigung = (r: number) => {
      const { a, b } = bahn(r)
      return (b.y - a.y) / (b.x - a.x)
    }
    expect(neigung(1)).not.toBeCloseTo(neigung(0))
    expect(neigung(2)).not.toBeCloseTo(neigung(1))
  })

  it('bleibt dabei immer eine gerade Strecke von links nach rechts', () => {
    for (let r = 0; r < 7; r++) {
      const { a, b } = bahn(r)
      expect(b.x).toBeGreaterThan(a.x)
    }
  })
})

describe('Lotfußpunkt', () => {
  it('misst Strecke und Abstand quer zur Bahn', () => {
    const w = neueWelt(3)
    const mitte = punktAuf(w, 0.5)
    expect(aufBahn(w, mitte.x, mitte.y).t).toBeCloseTo(0.5)
    expect(aufBahn(w, mitte.x, mitte.y).abstand).toBeCloseTo(0)
    expect(aufBahn(w, mitte.x, mitte.y + 40).abstand).toBeCloseTo(40)
  })

  it('klemmt hinter Anfang und Ende auf die Strecke', () => {
    const w = neueWelt(3)
    expect(aufBahn(w, w.a.x - 500, w.a.y).t).toBe(0)
    expect(aufBahn(w, w.b.x + 500, w.b.y).t).toBe(1)
  })
})

describe('Ziehen', () => {
  it('rollt den Ball nur im Korridor weiter', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.4)
    expect(w.fortschritt).toBeCloseTo(0.4)
    expect(w.imKorridor).toBe(true)
  })

  it('lässt den Ball stehen, solange der Stift daneben ist', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.3)
    const stand = w.fortschritt

    // Weit vorn, aber außerhalb des Korridors: der Ball wartet.
    const weit = punktAuf(w, 0.9)
    ziehe(w, weit.x, weit.y + toleranz(3) + 5, d())
    expect(w.fortschritt).toBeCloseTo(stand)
    expect(w.imKorridor).toBe(false)
  })

  it('zählt einen Punkt daneben trotzdem als Probe — sonst wäre Danebenfahren gratis', () => {
    const w = neueWelt(3)
    const p = punktAuf(w, 0.5)
    ziehe(w, p.x, p.y + toleranz(3) + 30, d())
    expect(w.proben).toBe(1)
    expect(w.probenDrin).toBe(0)
    expect(w.spur.at(-1)?.daneben).toBe(true)
  })

  it('rollt nie zurück — Hin- und Herschrubben bringt nichts', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.6)
    zieheAuf(w, 0.6, 0.1)
    expect(w.fortschritt).toBeCloseTo(0.6)
  })

  it('hält den Ball immer auf der Bahn', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.5)
    expect(aufBahn(w, ballPunkt(w).x, ballPunkt(w).y).abstand).toBeCloseTo(0)
  })
})

describe('Tor und nächste Bahn (C2)', () => {
  it('zählt ein Tor am Ende der Bahn und feiert kurz', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 1)
    expect(w.tore).toBe(1)
    expect(w.jubelUhr).toBeGreaterThan(0)
    expect(w.runde).toBe(0) // die Bahn steht noch
  })

  it('legt danach eine neue Bahn mit anderer Neigung aus statt zu enden', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 1)
    laufe(w, JUBEL_SEK + 0.2)
    expect(w.runde).toBe(1)
    expect(w.fortschritt).toBe(0)
    expect(w.spur).toHaveLength(0)
    expect({ a: w.a, b: w.b }).toEqual(bahn(1))
  })

  it('nimmt während des Jubels keine Eingabe an', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 1)
    const proben = w.proben
    const p = punktAuf(w, 0.5)
    ziehe(w, p.x, p.y, d())
    expect(w.proben).toBe(proben)
  })

  it('kennt keinen Verliererzustand — auch dauerhaft daneben bricht nichts ab', () => {
    const w = neueWelt(3)
    for (let i = 0; i < 50; i++) {
      const p = punktAuf(w, i / 50)
      ziehe(w, p.x, p.y + 200, d())
    }
    laufe(w, 10)
    expect(w.fortschritt).toBe(0)
    expect(w.tore).toBe(0)
    expect(() => ergebnis(w, 10_000, false)).not.toThrow()
  })
})

describe('Ergebnis', () => {
  it('rechnet Genauigkeit über alle Proben', () => {
    const w = neueWelt(3)
    const p = punktAuf(w, 0.3)
    ziehe(w, p.x, p.y, d()) // drin
    ziehe(w, p.x, p.y + toleranz(3) + 20, d()) // daneben
    expect(ergebnis(w, 100, false).genauigkeit).toBeCloseTo(0.5)
  })

  it('zählt Vollständigkeit über die begonnenen Bahnen', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 1)
    laufe(w, JUBEL_SEK + 0.2)
    zieheAuf(w, 0, 0.5)

    const e = ergebnis(w, 1000, false)
    expect(e.spielId).toBe('linie')
    // Eine Bahn ganz, eine halb — von zwei begonnenen.
    expect(e.vollstaendigkeit).toBeCloseTo(0.75)
    expect(e.extra).toMatchObject({ tore: 1, bahnenBegonnen: 2, toleranz: toleranz(3) })
  })

  it('zählt während des Jubels nur die eine gespielte Bahn', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 1)
    // Der Jubel läuft noch, die nächste Bahn ist nicht ausgelegt.
    const e = ergebnis(w, 500, false)
    expect(e.extra).toMatchObject({ tore: 1, bahnenBegonnen: 1 })
    expect(e.vollstaendigkeit).toBe(1)
  })

  it('liefert bei unberührter Bahn Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, true)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })

  it('reicht Stufe durch und markiert Tastaturdruck als synthetisch', () => {
    const w = neueWelt(4)
    zieheAuf(w, 0, 0.2)
    const e = ergebnis(w, 100, false)
    // Ohne diese Markierung mischen sich echte Pencil-Druckkurven mit Tastaturwerten.
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(4)
  })

  it('bleibt zwischen 0 und 1, auch wenn viel gezogen wurde', () => {
    const w = neueWelt(3)
    for (let r = 0; r < 3; r++) {
      zieheAuf(w, 0, 1)
      laufe(w, JUBEL_SEK + 0.2)
    }
    const e = ergebnis(w, 1000, false)
    expect(e.vollstaendigkeit).toBe(klemme(e.vollstaendigkeit, 0, 1))
    expect(e.extra).toMatchObject({ tore: 3 })
  })
})
