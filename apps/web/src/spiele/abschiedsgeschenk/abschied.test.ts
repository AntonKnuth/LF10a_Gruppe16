import { describe, expect, it } from 'vitest'
import { vereine } from '../../content'
import type { SpielErgebnis } from '../../engine/segmente'
import { neueAufzeichnung } from '../../rohdaten'
import {
  PROFI_SCHREIBT_SEK, STEMPEL_SEK, TEXT_SEK, abschnitt, unterschriftAusRohdaten,
} from './abschied'

/** Rohdaten-Band mit halber Bühnengröße: Faktor 2 bis zur Bühne (Stufe 3: x 200, y 370). */
const ROH = { x: 100, y: 200, breite: 230, hoehe: 35 }

type Punkt = [t: number, x: number, y: number, druck: number]

/** Ein Ergebnis mit Rohdaten aus der echten Aufzeichnung (`rohdaten.ts`). */
function ergebnisMit(punkte: Punkt[], neustartsMs: number[] = []): SpielErgebnis {
  const a = neueAufzeichnung()
  for (const p of punkte) a.punkt(...p)
  return {
    spielId: 'abschiedsgeschenk',
    dauerMs: 10000,
    vollstaendigkeit: 1,
    genauigkeit: 1,
    druckMittel: 0.5,
    druckStreuung: 0,
    eingabegeraet: 'mouse',
    synthetischerDruck: true,
    stufe: 3,
    abgebrochen: false,
    extra: { band: ROH, neustartsMs },
    rohdaten: a.fertig(),
  }
}

describe('unterschriftAusRohdaten', () => {
  it('rechnet Rohdaten-Pixel in Bühnenkoordinaten um', () => {
    const s = unterschriftAusRohdaten(ergebnisMit([
      [0, 100, 200, 0.5],
      [100, 130, 210, 0.5],
    ]))
    expect(s).toHaveLength(2)
    expect(s[0].x).toBeCloseTo(200)
    expect(s[0].y).toBeCloseTo(370)
    expect(s[1].x).toBeCloseTo(260)
    expect(s[1].y).toBeCloseTo(390)
  })

  it('zeigt nur den letzten Versuch: Striche vor dem letzten Neustart fehlen', () => {
    const s = unterschriftAusRohdaten(ergebnisMit([
      [0, 110, 210, 0.5], [100, 120, 215, 0.5], [200, 120, 215, 0],
      // Neustart bei 1000 ms
      [1100, 150, 220, 0.5], [1200, 160, 225, 0.5],
    ], [1000]))
    expect(s).toHaveLength(2)
    expect(s[0].x).toBeCloseTo(200 + (150 - 100) * 2)
  })

  it('zählt bei mehreren Neustarts ab dem letzten', () => {
    const s = unterschriftAusRohdaten(ergebnisMit([
      [0, 110, 210, 0.5], [100, 120, 215, 0.5],
      [1100, 130, 210, 0.5], [1200, 135, 210, 0.5],
      [2100, 150, 220, 0.5], [2200, 160, 225, 0.5],
    ], [1000, 2000]))
    expect(s).toHaveLength(2)
    expect(s.every((p) => p.x >= 200 + 50 * 2)).toBe(true)
  })

  it('beginnt nach dem Absetzen (Druck 0) einen neuen Strich', () => {
    const s = unterschriftAusRohdaten(ergebnisMit([
      [0, 110, 210, 0.5], [100, 120, 215, 0.5], [200, 120, 215, 0],
      [300, 150, 220, 0.5], [400, 160, 225, 0.5],
    ]))
    expect(s.map((p) => p.neu)).toEqual([true, false, true, false])
  })

  it('liefert nichts ohne Rohdaten oder ohne Band', () => {
    const e = ergebnisMit([[0, 110, 210, 0.5], [100, 120, 215, 0.5]])
    expect(unterschriftAusRohdaten({ ...e, rohdaten: undefined })).toEqual([])
    expect(unterschriftAusRohdaten({ ...e, extra: {} })).toEqual([])
  })
})

describe('abschnitt', () => {
  it('zeigt Profi-Unterschrift, Stempel und Text in dieser Reihenfolge', () => {
    expect(abschnitt(0)).toEqual({ profiAnteil: 0, stempel: false, text: false })
    expect(abschnitt(PROFI_SCHREIBT_SEK / 2)).toEqual({ profiAnteil: 0.5, stempel: false, text: false })
    expect(abschnitt(STEMPEL_SEK)).toEqual({ profiAnteil: 1, stempel: true, text: false })
    expect(abschnitt(TEXT_SEK)).toEqual({ profiAnteil: 1, stempel: true, text: true })
  })

  it('schreibt die Profi-Unterschrift in 1,5 Sekunden', () => {
    expect(PROFI_SCHREIBT_SEK).toBe(1.5)
  })

  it('steht bei Uhr 0 still, also solange angehalten wird', () => {
    // Die Bildschleife zählt die Uhr bei Pause nicht weiter; derselbe Wert ergibt dasselbe Bild.
    expect(abschnitt(0.7)).toEqual(abschnitt(0.7))
  })
})

describe('Vereine', () => {
  it('haben alle einen Abschiedstext mit Platzhalter für den Spielnamen', () => {
    for (const v of vereine) {
      expect(v.profi.abschied.text, v.id).toContain('{name}')
    }
  })
})
