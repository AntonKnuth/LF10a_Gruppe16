import { describe, expect, it } from 'vitest'
import { vereine } from '../content'
import {
  SCHRIFT, anfangVon, hatVorlage, laenge, legeZeile, naechster, punktBei, zeilenBreite,
} from './schrift'

const eintraege = Object.entries(SCHRIFT)

describe('Schriftsatz', () => {
  it('enthält Ziffern, Buchstaben, Umlaute und ß', () => {
    const alle = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß.,-'
    expect([...alle].filter((z) => !hatVorlage(z))).toEqual([])
  })

  it('bleibt in der Lineatur und in der Zeichenbreite', () => {
    for (const [z, v] of eintraege) {
      for (const q of v.striche.flat()) {
        expect([z, q.y >= 0 && q.y <= 3]).toEqual([z, true])
        expect([z, q.x >= -1e-9 && q.x <= v.breite + 1e-9]).toEqual([z, true])
      }
    }
  })

  it('stellt Großbuchstaben und Ziffern auf die Grundlinie, kleine Buchstaben ins Mittelband', () => {
    for (const [z, v] of eintraege) {
      const ys = v.striche.flat().map((q) => q.y)
      if (/[A-ZÄÖÜ0-9]/.test(z)) {
        expect([z, Math.max(...ys).toFixed(1)]).toEqual([z, '2.0'])
        expect([z, Math.min(...ys) < 0.2]).toEqual([z, true])
      }
      if (/[acemnorsuvwxz]/.test(z)) expect([z, Math.min(...ys).toFixed(1)]).toEqual([z, '1.0'])
      if (/[gjpqy]/.test(z)) expect([z, Math.max(...ys) > 2.8]).toEqual([z, true])
    }
  })

  it('hat nur Tupfer und echte Striche, nichts dazwischen', () => {
    for (const [z, v] of eintraege) {
      for (const s of v.striche) {
        expect([z, s.length === 1 || laenge(s) > 0.3]).toEqual([z, true])
      }
    }
  })

  it('schreibt das O oben beginnend gegen den Uhrzeigersinn', () => {
    const [o] = SCHRIFT.O.striche
    expect(o[0].y).toBeCloseTo(0)
    expect(o[1].x).toBeLessThan(o[0].x)
    expect(o.at(-1)!.x).toBeCloseTo(o[0].x)
  })
})

describe('Content', () => {
  it('kann jeden Kader-Eintrag schreiben: Nummer, Name und Großschreibung', () => {
    for (const s of vereine.flatMap((v) => v.kader)) {
      for (const text of [String(s.nummer), s.name, s.name.toUpperCase()]) {
        expect([text, hatVorlage(text)]).toEqual([text, true])
      }
    }
  })

  it('kann jedes Wort und jede Zahl der Stadionfakten schreiben', () => {
    for (const text of vereine.flatMap((v) => v.fakten)) {
      expect([text, hatVorlage(text) && hatVorlage(text.toUpperCase())]).toEqual([text, true])
    }
  })
})

describe('Zeile', () => {
  it('legt die Zeichen nebeneinander und lässt Leerzeichen frei', () => {
    const zeile = legeZeile('1 A', 10, 100, 50)
    expect(zeile.map((z) => z.z)).toEqual(['1', 'A'])
    expect(zeile[0].x).toBe(100)
    expect(zeile[1].x).toBeGreaterThan(zeile[0].x + zeile[0].breite + 5)
    // Umrechnung in Bühnenkoordinaten: A beginnt oben in der Mitte.
    expect(zeile[1].striche[0][0]).toEqual({ x: zeile[1].x + 6.5, y: 50 })
    expect(zeilenBreite('1 A') * 10).toBeCloseTo(zeile[1].x + zeile[1].breite - 100)
  })

  it('überspringt ein Zeichen ohne Vorlage, statt stehen zu bleiben', () => {
    expect(hatVorlage('é')).toBe(false)
    expect(legeZeile('aéa', 10, 0, 0)).toHaveLength(2)
    expect(zeilenBreite('')).toBe(0)
  })
})

describe('Geometrie', () => {
  const ecke = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]

  it('misst die Länge und findet Punkte auf dem Strich', () => {
    expect(laenge(ecke)).toBe(20)
    expect(laenge([{ x: 3, y: 3 }])).toBe(0)
    expect(punktBei(ecke, 15)).toEqual({ x: 10, y: 5 })
    expect(punktBei(ecke, 99)).toEqual({ x: 10, y: 10 })
    expect(anfangVon(ecke, 12)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 2 }])
  })

  it('sucht den nächsten Punkt nur im Fenster', () => {
    expect(naechster(ecke, 10, 9, 0, 20)).toEqual({ bogen: 19, abstand: 0 })
    expect(naechster(ecke, 10, 9, 0, 12).bogen).toBe(12)
    expect(naechster(ecke, 0, 0, 5, 20).bogen).toBe(5)
    expect(naechster([{ x: 1, y: 1 }], 4, 5, 0, 0)).toEqual({ bogen: 0, abstand: 5 })
  })

  it('springt bei einem geschlossenen Strich nicht vom Anfang aufs Ende', () => {
    const [o] = legeZeile('O', 50, 0, 0)[0].striche
    expect(naechster(o, o[0].x, o[0].y, 0, 30).bogen).toBe(0)
  })
})
