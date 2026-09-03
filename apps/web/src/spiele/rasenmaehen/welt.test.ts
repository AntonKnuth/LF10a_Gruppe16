import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  BLOCK, FERTIG_SEK, RASEN_H, RASEN_X, RASEN_Y, SPALTEN, ZEILEN, ZELLE, ZONE_MITTE,
  aktualisiere, bandOben, bandUnten, ergebnis, halbesBand, maehe, neueWelt, urteil,
  zaehle, zoneBei, zoneVon, type Welt, type Zone,
} from './welt'

const ALLE_ZONEN: Zone[] = ['jung', 'normal', 'hoch']
const FELDER = SPALTEN * ZEILEN

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
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60)
}

/** Erste Zelle der gesuchten Zone auf diesem Platz. */
function zelleIn(zone: Zone, platz = 0) {
  for (let ze = 0; ze < ZEILEN; ze++) {
    for (let sp = 0; sp < SPALTEN; sp++) {
      if (zoneVon(sp, ze, platz) === zone) return { sp, ze }
    }
  }
  throw new Error(`keine Zelle in Zone ${zone}`)
}

/** Mäht den laufenden Platz komplett mit dem jeweils passenden Andruck. */
function maeheAlles(w: Welt) {
  for (let ze = 0; ze < ZEILEN; ze++) {
    for (let sp = 0; sp < SPALTEN; sp++) {
      tippe(w, sp, ze, ZONE_MITTE[zoneVon(sp, ze, w.platz)])
    }
  }
}

describe('Wuchszonen', () => {
  it('verteilt alle drei Grasstände über den Platz', () => {
    const gesehen = new Set<Zone>()
    for (let ze = 0; ze < ZEILEN; ze++) {
      for (let sp = 0; sp < SPALTEN; sp++) gesehen.add(zoneVon(sp, ze, 0))
    }
    expect(gesehen.size).toBe(3)
  })

  it('ist deterministisch — der Test braucht kein Zufallsmuster', () => {
    expect(zoneVon(5, 3, 0)).toBe(zoneVon(5, 3, 0))
  })

  it('gibt jedem neuen Platz ein anderes Muster', () => {
    let gleich = 0
    for (let ze = 0; ze < ZEILEN; ze++) {
      for (let sp = 0; sp < SPALTEN; sp++) {
        if (zoneVon(sp, ze, 0) === zoneVon(sp, ze, 1)) gleich++
      }
    }
    expect(gleich).toBe(0)
  })

  it('meldet außerhalb des Platzes den normalen Grasstand', () => {
    const w = neueWelt(3)
    expect(zoneBei(w, RASEN_X - 50, RASEN_Y - 50)).toBe('normal')
    expect(zoneBei(w, RASEN_X + 10, RASEN_Y + 10)).toBe(zoneVon(0, 0, 0))
  })
})

describe('Kraftdosierung (B2) — der Kern der Übung', () => {
  it('trifft jede Zone mit ihrem eigenen Ziel-Andruck', () => {
    for (const z of ALLE_ZONEN) expect(urteil(ZONE_MITTE[z], 3, z)).toBe('gut')
  })

  it('kennt keinen einzigen Andruck, der alle drei Zonen trifft', () => {
    // Genau das war der Mangel: mit einem festen Wert kam man durch das ganze Spiel.
    for (let v = 0; v <= 1.0001; v += 0.01) {
      const treffer = ALLE_ZONEN.filter((z) => urteil(v, 3, z) === 'gut')
      expect(treffer.length).toBeLessThan(3)
    }
  })

  it('kommt mit festen 50 Prozent nur auf normalem Rasen durch', () => {
    expect(urteil(0.5, 3, 'normal')).toBe('gut')
    expect(urteil(0.5, 3, 'jung')).toBe('zu-fest')
    expect(urteil(0.5, 3, 'hoch')).toBe('zu-leicht')
  })
})

describe('Stufe (B1)', () => {
  it('macht das Band mit steigender Stufe schmaler', () => {
    expect(halbesBand(5)).toBeLessThan(halbesBand(1))
    for (const z of ALLE_ZONEN) {
      expect(bandUnten(5, z)).toBeGreaterThan(bandUnten(1, z))
      expect(bandOben(5, z)).toBeLessThan(bandOben(1, z))
    }
  })

  it('lässt die Zone die Mitte und die Stufe die Breite bestimmen', () => {
    for (const z of ALLE_ZONEN) {
      expect((bandUnten(3, z) + bandOben(3, z)) / 2).toBeCloseTo(ZONE_MITTE[z])
    }
  })

  it('regelt die Toleranz während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    const vorher = bandOben(w.stufe, 'normal')
    const { sp, ze } = zelleIn('normal')
    for (let i = 0; i < 10; i++) tippe(w, sp, ze, ZONE_MITTE.normal)
    // Sonst wäre der Messwert im Verlauf nicht mehr mit der gespeicherten Stufe vergleichbar.
    expect(bandOben(w.stufe, 'normal')).toBe(vorher)
  })
})

describe('Zellen', () => {
  it('lässt die Zelle bei zu leichtem Andruck ungemäht — nochmal drüber (C2)', () => {
    const w = neueWelt(3)
    const { sp, ze } = zelleIn('hoch')
    const i = ze * SPALTEN + sp
    tippe(w, sp, ze, 0.05)
    expect(w.zellen[i]).toBe('ungemaeht')

    tippe(w, sp, ze, ZONE_MITTE.hoch)
    expect(w.zellen[i]).toBe('gut')
  })

  it('macht die Zelle bei zu festem Andruck kaputt', () => {
    const w = neueWelt(3)
    const { sp, ze } = zelleIn('jung')
    tippe(w, sp, ze, 1)
    expect(w.zellen[ze * SPALTEN + sp]).toBe('kaputt')
  })

  it('lässt geschnittenes Gras endgültig stehen — ein Rückweg zerstört nichts', () => {
    const w = neueWelt(3)
    const { sp, ze } = zelleIn('normal')
    const i = ze * SPALTEN + sp
    tippe(w, sp, ze, ZONE_MITTE.normal)
    tippe(w, sp, ze, 1)
    expect(w.zellen[i]).toBe('gut')
  })

  it('repariert eine kaputte Zelle nicht nachträglich', () => {
    const w = neueWelt(3)
    const { sp, ze } = zelleIn('normal')
    const i = ze * SPALTEN + sp
    tippe(w, sp, ze, 1)
    tippe(w, sp, ze, ZONE_MITTE.normal)
    expect(w.zellen[i]).toBe('kaputt')
  })
})

describe('Zonengrenzen', () => {
  it('bearbeitet nur den Grasstand unter dem Mäher, nicht den Nachbarflecken', () => {
    const w = neueWelt(3)
    const ze = 0
    const links = zoneVon(BLOCK - 1, ze, 0)
    const rechts = zoneVon(BLOCK, ze, 0)
    expect(links).not.toBe(rechts)

    // Genau auf die Blockgrenze setzen: beide Nachbarzellen liegen im Schnittkreis.
    const x = RASEN_X + BLOCK * ZELLE
    const y = RASEN_Y + (ze + 0.5) * ZELLE
    maehe(w, x, y, x, y, d(ZONE_MITTE[rechts]))

    expect(w.zellen[ze * SPALTEN + BLOCK]).toBe('gut')
    // Ohne diese Regel ginge an jeder Grenze zwangsläufig etwas kaputt — eine Strafe
    // für Geometrie statt für falsches Dosieren.
    expect(w.zellen[ze * SPALTEN + BLOCK - 1]).toBe('ungemaeht')
  })
})

describe('Strecke zwischen zwei Zeigerpunkten', () => {
  it('lässt bei einer schnellen Bewegung keine Lücke stehen', () => {
    const w = neueWelt(3)
    const ze = 0
    const zone = zoneVon(0, ze, 0)
    const a = mitte(0, ze)
    const b = mitte(BLOCK - 1, ze)
    // Ein einziges Ereignis über einen ganzen Fleck — genau der Fall, in dem ohne
    // Interpolation nur Anfang und Ende gemäht würden.
    maehe(w, a.x, a.y, b.x, b.y, d(ZONE_MITTE[zone]))
    for (let sp = 0; sp < BLOCK; sp++) expect(w.zellen[ze * SPALTEN + sp]).toBe('gut')
  })

  it('mäht nichts außerhalb des Platzes', () => {
    const w = neueWelt(3)
    maehe(w, RASEN_X - 200, RASEN_Y + RASEN_H + 200, RASEN_X - 100, RASEN_Y + RASEN_H + 100, d(0.5))
    expect(zaehle(w).offen).toBe(FELDER)
  })
})

describe('Dauerbetrieb (C2)', () => {
  it('legt nach dem fertigen Platz einen neuen aus statt zu enden', () => {
    const w = neueWelt(3)
    maeheAlles(w)
    expect(zaehle(w).offen).toBe(0)

    laufe(w, 0.5)
    expect(w.platzFertig).toBe(true) // der geschaffte Platz bleibt kurz stehen
    expect(w.platz).toBe(0)

    laufe(w, FERTIG_SEK)
    expect(w.platz).toBe(1)
    expect(zaehle(w).offen).toBe(FELDER) // frischer Platz
    expect(w.erledigt).toEqual({ gut: FELDER, kaputt: 0, zellen: FELDER })
  })

  it('mäht nicht weiter, während der fertige Platz gefeiert wird', () => {
    const w = neueWelt(3)
    maeheAlles(w)
    laufe(w, 0.5)
    const vorher = w.druckWerte.length
    tippe(w, 0, 0, 0.5)
    expect(w.druckWerte.length).toBe(vorher)
  })

  it('bleibt bei halb gemähtem Platz offen und kennt keinen Verliererzustand', () => {
    const w = neueWelt(3)
    for (let sp = 0; sp < SPALTEN; sp++) tippe(w, sp, 0, 1)
    laufe(w, 10)
    expect(w.platzFertig).toBe(false)
    expect(w.platz).toBe(0)
    expect(() => ergebnis(w, 10_000, false)).not.toThrow()
  })
})

describe('Ergebnis', () => {
  it('rechnet Vollständigkeit über alle und Genauigkeit über die bearbeiteten Zellen', () => {
    const w = neueWelt(3)
    const gut = zelleIn('normal')
    tippe(w, gut.sp, gut.ze, ZONE_MITTE.normal)
    const hin = zelleIn('jung')
    tippe(w, hin.sp, hin.ze, 1)

    const e = ergebnis(w, 1234, false)
    expect(e.spielId).toBe('rasenmaehen')
    expect(e.vollstaendigkeit).toBeCloseTo(2 / FELDER)
    expect(e.genauigkeit).toBeCloseTo(0.5)
    expect(e.extra).toMatchObject({ gut: 1, kaputt: 1, plaetzeFertig: 0 })
  })

  it('zählt über mehrere Plätze zusammen', () => {
    const w = neueWelt(3)
    maeheAlles(w)
    laufe(w, FERTIG_SEK + 0.5)
    expect(w.platz).toBe(1)

    const { sp, ze } = zelleIn('normal', 1)
    tippe(w, sp, ze, ZONE_MITTE.normal)

    const e = ergebnis(w, 1000, false)
    expect(e.extra).toMatchObject({ plaetzeFertig: 1, zellenGesamt: FELDER * 2 })
    expect(e.genauigkeit).toBe(1)
    expect(e.vollstaendigkeit).toBeCloseTo((FELDER + 1) / (FELDER * 2))
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
    const { sp, ze } = zelleIn('normal')
    tippe(w, sp, ze, ZONE_MITTE.normal)
    const e = ergebnis(w, 100, false)
    // Ohne diese Markierung mischen sich echte Pencil-Druckkurven mit Tastaturwerten.
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(4)
  })
})
