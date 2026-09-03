import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  FERTIG_SEK, RASEN_H, RASEN_X, RASEN_Y, SPALTEN, ZEILEN, ZELLE,
  aktualisiere, bandOben, bandUnten, ergebnis, halbesBand, maehe, neueWelt, urteil, zaehle,
  type Welt,
} from './welt'

/** Andruck wie ihn `eingabe.ts` liefert — synthetisch, weil ohne Stift getestet wird. */
const d = (wert: number): Druck => ({ wert, synthetisch: true })

/** Mitte der Zelle (sp|ze) in Bühnenkoordinaten. */
const mitte = (sp: number, ze: number) => ({
  x: RASEN_X + (sp + 0.5) * ZELLE,
  y: RASEN_Y + (ze + 0.5) * ZELLE,
})

/** Tippt den Mäher auf eine Zelle, ohne eine Strecke zu ziehen. */
const tippe = (w: Welt, sp: number, ze: number, druck: number) => {
  const p = mitte(sp, ze)
  maehe(w, p.x, p.y, p.x, p.y, d(druck))
}

const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < sekunden * 60; i++) aktualisiere(w, 1 / 60)
}

describe('Stufe (B1)', () => {
  it('macht das Druckband mit steigender Stufe schmaler', () => {
    expect(halbesBand(5)).toBeLessThan(halbesBand(1))
    expect(bandUnten(5)).toBeGreaterThan(bandUnten(1))
    expect(bandOben(5)).toBeLessThan(bandOben(1))
  })

  it('regelt die Toleranz während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    const vorher = { unten: bandUnten(w.stufe), oben: bandOben(w.stufe) }
    for (let sp = 0; sp < 10; sp++) tippe(w, sp, 0, 0.5)
    // Sonst wäre der Messwert im Verlauf nicht mehr mit der gespeicherten Stufe vergleichbar.
    expect(bandUnten(w.stufe)).toBe(vorher.unten)
    expect(bandOben(w.stufe)).toBe(vorher.oben)
  })
})

describe('Urteil über den Andruck', () => {
  it('trennt zu leicht, gut und zu fest am eingestellten Band', () => {
    expect(urteil(bandUnten(3) - 0.01, 3)).toBe('zu-leicht')
    expect(urteil(0.5, 3)).toBe('gut')
    expect(urteil(bandOben(3) + 0.01, 3)).toBe('zu-fest')
  })
})

describe('Zellen', () => {
  it('lässt die Zelle bei zu leichtem Andruck ungemäht — nochmal drüber (C2)', () => {
    const w = neueWelt(3)
    tippe(w, 5, 5, 0.05)
    expect(zaehle(w).offen).toBe(SPALTEN * ZEILEN)

    // Derselbe Fleck, diesmal richtig gedrückt: die Wiederholung muss wirken.
    tippe(w, 5, 5, 0.5)
    expect(zaehle(w).gut).toBeGreaterThan(0)
  })

  it('macht die Zelle bei zu festem Andruck kaputt', () => {
    const w = neueWelt(3)
    tippe(w, 5, 5, 1)
    expect(zaehle(w).kaputt).toBeGreaterThan(0)
    expect(zaehle(w).gut).toBe(0)
  })

  it('lässt geschnittenes Gras endgültig stehen — ein Rückweg zerstört nichts', () => {
    const w = neueWelt(3)
    tippe(w, 5, 5, 0.5)
    const gut = zaehle(w).gut
    tippe(w, 5, 5, 1) // viel zu fest, aber die Zelle ist schon geschnitten
    expect(zaehle(w).gut).toBe(gut)
    expect(zaehle(w).kaputt).toBe(0)
  })

  it('repariert eine kaputte Zelle nicht nachträglich', () => {
    const w = neueWelt(3)
    tippe(w, 5, 5, 1)
    const kaputt = zaehle(w).kaputt
    tippe(w, 5, 5, 0.5)
    expect(zaehle(w).kaputt).toBe(kaputt)
    expect(zaehle(w).gut).toBe(0)
  })
})

describe('Strecke zwischen zwei Zeigerpunkten', () => {
  it('lässt bei einer schnellen Bewegung keine Lücke stehen', () => {
    const w = neueWelt(3)
    const a = mitte(0, 7)
    const b = mitte(SPALTEN - 1, 7)
    // Ein einziges Ereignis über die volle Platzbreite — genau der Fall, in dem ohne
    // Interpolation nur Anfang und Ende gemäht würden.
    maehe(w, a.x, a.y, b.x, b.y, d(0.5))
    expect(zaehle(w).gut).toBeGreaterThanOrEqual(SPALTEN)
  })
})

describe('Ende (C2)', () => {
  it('meldet erst fertig, wenn keine Zelle mehr offen ist', () => {
    const w = neueWelt(3)
    for (let ze = 0; ze < ZEILEN; ze++) {
      for (let sp = 0; sp < SPALTEN; sp++) tippe(w, sp, ze, 0.5)
    }
    expect(zaehle(w).offen).toBe(0)
    expect(w.fertig).toBe(false) // der fertige Platz soll erst kurz stehen bleiben
    laufe(w, FERTIG_SEK + 0.2)
    expect(w.fertig).toBe(true)
  })

  it('bleibt bei halb gemähtem Platz offen und kennt keinen Verliererzustand', () => {
    const w = neueWelt(3)
    for (let sp = 0; sp < SPALTEN; sp++) tippe(w, sp, 0, 1) // alles kaputt gedrückt
    laufe(w, 10)
    expect(w.fertig).toBe(false)
    expect(() => ergebnis(w, 10_000, false)).not.toThrow()
  })
})

describe('Ergebnis', () => {
  it('rechnet Vollständigkeit über alle und Genauigkeit über die bearbeiteten Zellen', () => {
    const w = neueWelt(3)
    // Eine Zeile sauber, eine Zeile kaputt — der Rest bleibt stehen.
    for (let sp = 0; sp < SPALTEN; sp++) tippe(w, sp, 0, 0.5)
    for (let sp = 0; sp < SPALTEN; sp++) tippe(w, sp, ZEILEN - 1, 1)

    const { gut, kaputt, gesamt } = zaehle(w)
    const e = ergebnis(w, 1234, false)
    expect(e.spielId).toBe('rasenmaehen')
    expect(e.vollstaendigkeit).toBeCloseTo((gut + kaputt) / gesamt)
    expect(e.genauigkeit).toBeCloseTo(gut / (gut + kaputt))
    expect(e.extra).toMatchObject({ gut, kaputt, zellenGesamt: gesamt })
  })

  it('liefert bei unberührtem Platz Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, true)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })

  it('reicht Stufe durch und markiert Tastaturdruck als synthetisch', () => {
    const w = neueWelt(4)
    tippe(w, 1, 1, 0.5)
    const e = ergebnis(w, 100, false)
    // Ohne diese Markierung mischen sich echte Pencil-Druckkurven mit Tastaturwerten.
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(4)
  })

  it('mäht nichts außerhalb des Platzes', () => {
    const w = neueWelt(3)
    maehe(w, RASEN_X - 200, RASEN_Y + RASEN_H + 200, RASEN_X - 100, RASEN_Y + RASEN_H + 100, d(0.5))
    expect(zaehle(w).offen).toBe(SPALTEN * ZEILEN)
  })
})
