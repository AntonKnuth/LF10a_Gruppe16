import { beforeEach, describe, expect, it } from 'vitest'
import {
  EINHEITEN_PRO_TAG, einheitenHeute, loescheProfil, merkeGesehen, pruefeBestwert, schonGesehen,
  speichereFortschritt, zaehleEinheit,
} from './profil'

/**
 * vitest läuft ohne DOM. Statt jsdom als Abhängigkeit hereinzuholen, ersetzt dieser
 * Zehnzeiler den `localStorage` — mehr braucht `profil.ts` nicht.
 */
const speicher = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => speicher.get(k) ?? null,
  setItem: (k: string, v: string) => void speicher.set(k, v),
  removeItem: (k: string) => void speicher.delete(k),
  clear: () => speicher.clear(),
  key: (i: number) => [...speicher.keys()][i] ?? null,
  get length() {
    return speicher.size
  },
} as Storage

beforeEach(() => speicher.clear())

describe('Bestwerte (C5)', () => {
  it('lobt beim ersten Mal nicht — es gibt nichts zu übertreffen', () => {
    expect(pruefeBestwert('linie', 0.8)).toBe(false)
  })

  it('lobt erst, wenn es besser wurde als beim letzten Mal', () => {
    pruefeBestwert('linie', 0.5)
    expect(pruefeBestwert('linie', 0.7)).toBe(true)
    expect(pruefeBestwert('linie', 0.6)).toBe(false)
    // Gleichstand ist keine Bestleistung, sonst wäre jede Wiederholung eine.
    expect(pruefeBestwert('linie', 0.7)).toBe(false)
  })

  it('hält die Spiele auseinander', () => {
    pruefeBestwert('linie', 0.9)
    expect(pruefeBestwert('aufwaermen', 0.2)).toBe(false)
    expect(pruefeBestwert('aufwaermen', 0.3)).toBe(true)
  })
})

describe('Onboarding', () => {
  it('erklärt jedes Spiel genau einmal', () => {
    expect(schonGesehen('aufwaermen')).toBe(false)
    merkeGesehen('aufwaermen')
    expect(schonGesehen('aufwaermen')).toBe(true)
    expect(schonGesehen('linie')).toBe(false)
  })
})

describe('Tagesobergrenze (B3)', () => {
  it('zählt die Einheiten des Tages', () => {
    expect(einheitenHeute()).toBe(0)
    zaehleEinheit()
    expect(einheitenHeute()).toBe(EINHEITEN_PRO_TAG)
  })

  it('fängt an einem anderen Tag wieder bei null an', () => {
    localStorage.setItem('tk.heute', JSON.stringify({ datum: 'Mon Jan 01 2024', anzahl: 3 }))
    expect(einheitenHeute()).toBe(0)
  })
})

describe('Profil löschen (D4, Art. 17)', () => {
  it('räumt alles weg, was am Kind hängt', () => {
    speichereFortschritt({ vereinIndex: 1, tag: 3 })
    pruefeBestwert('linie', 0.5)
    merkeGesehen('linie')
    zaehleEinheit()

    loescheProfil()

    // Ein vergessener Schlüssel hier wäre eine unvollständige Löschung.
    expect([...speicher.keys()]).toEqual([])
  })
})
