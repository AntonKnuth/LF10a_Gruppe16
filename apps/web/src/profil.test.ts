import { beforeEach, describe, expect, it } from 'vitest'
import { vereine } from './content'
import {
  EINHEITEN_PRO_TAG, beachteFreigabe, einheitenHeute, istBesucht, ladeFortschritt, loescheProfil,
  merkeGesehen, naechsteEinheit, pruefeBestwert, schonGesehen, speichereFortschritt, zaehleEinheit,
  type Fortschritt,
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

  it('setzt den Zähler zurück, wenn der Therapeut freigibt', () => {
    zaehleEinheit()
    expect(einheitenHeute()).toBe(1)

    expect(beachteFreigabe('2026-09-10T12:00:00Z')).toBe(true)
    expect(einheitenHeute()).toBe(0)
  })

  it('beachtet dieselbe Freigabe nur ein einziges Mal', () => {
    const freigabe = '2026-09-10T12:00:00Z'
    beachteFreigabe(freigabe)
    zaehleEinheit()

    // Ohne diesen Vergleich setzte jeder Start den Zähler zurück und die Obergrenze wäre weg.
    expect(beachteFreigabe(freigabe)).toBe(false)
    expect(einheitenHeute()).toBe(1)

    // Eine zweite Freigabe wirkt wieder.
    expect(beachteFreigabe('2026-09-10T15:30:00Z')).toBe(true)
    expect(einheitenHeute()).toBe(0)
  })

  it('tut ohne Freigabe nichts — auch nicht bei fehlender Verbindung', () => {
    zaehleEinheit()
    expect(beachteFreigabe(null)).toBe(false)
    expect(beachteFreigabe(undefined)).toBe(false)
    expect(einheitenHeute()).toBe(1)
  })
})

describe('Reise (C4, C6)', () => {
  const letzter = vereine.length - 1
  const besuchte = (f: Fortschritt) => vereine.map((_, i) => istBesucht(f, i))

  it('bleibt fünf Tage bei einem Verein und zieht dann weiter', () => {
    expect(naechsteEinheit({ vereinIndex: 0, tag: 4 })).toEqual({ vereinIndex: 0, tag: 5 })
    expect(naechsteEinheit({ vereinIndex: 0, tag: 5 })).toMatchObject({ vereinIndex: 1, tag: 1 })
  })

  it('färbt nur, was hinter Ben liegt', () => {
    const f = naechsteEinheit({ vereinIndex: 0, tag: 5 })
    expect(besuchte(f)).toEqual(vereine.map((_, i) => i === 0))
  })

  it('lässt nach einer ganzen Runde alle Nadeln farbig, auch an den Tagen danach', () => {
    let f: Fortschritt = { vereinIndex: 0, tag: 1 }
    for (let i = 0; i < vereine.length * 5; i++) f = naechsteEinheit(f)
    expect(f).toMatchObject({ vereinIndex: 0, tag: 1 })
    expect(besuchte(f)).toEqual(vereine.map(() => true))

    // Der nächste Tag und das Speichern dürfen die Liste nicht verlieren.
    speichereFortschritt(naechsteEinheit(f))
    expect(besuchte(ladeFortschritt())).toEqual(vereine.map(() => true))
  })

  it('verträgt einen alten Stand ohne das Feld', () => {
    localStorage.setItem('tk.fortschritt', JSON.stringify({ vereinIndex: letzter, tag: 5 }))
    const alt = ladeFortschritt()
    expect(besuchte(alt)).toEqual(vereine.map((_, i) => i < letzter))
    expect(besuchte(naechsteEinheit(alt))).toEqual(vereine.map(() => true))
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
