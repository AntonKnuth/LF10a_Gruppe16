import { describe, expect, it } from 'vitest'
import { neuerZeigerfilter } from './eingabe'

/** Ein Zeiger mit fester Kennung. */
const zeiger = (pointerType: string, pointerId: number, isPrimary = true) => (type: string) => ({
  type, pointerType, pointerId, isPrimary,
})
const stift = zeiger('pen', 1)
const ballen = zeiger('touch', 2)
const finger = zeiger('touch', 3)
const zweiterFinger = zeiger('touch', 4, false)
const maus = zeiger('mouse', 5)

describe('Handballen', () => {
  it('lässt neben dem Stift keine Berührung durch — auch nicht ihr Abheben', () => {
    const durch = neuerZeigerfilter()
    expect(durch(stift('pointerdown'))).toBe(true)
    for (const art of ['pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointercancel']) {
      expect(durch(ballen(art))).toBe(false)
    }
    expect(durch(stift('pointermove'))).toBe(true)
    expect(durch(stift('pointerup'))).toBe(true)
  })

  it('hält den Handballen auch zwischen zwei Strichen draußen', () => {
    const durch = neuerZeigerfilter()
    durch(stift('pointerdown'))
    durch(stift('pointerup'))
    expect(durch(ballen('pointerdown'))).toBe(false)
    expect(durch(stift('pointerdown'))).toBe(true)
  })

  it('lässt den Stift übernehmen, wenn der Handballen zuerst aufliegt', () => {
    const durch = neuerZeigerfilter()
    expect(durch(ballen('pointerdown'))).toBe(true) // noch nicht von einem Finger zu unterscheiden
    expect(durch(stift('pointerdown'))).toBe(true)
    expect(durch(ballen('pointermove'))).toBe(false)
    expect(durch(ballen('pointerup'))).toBe(false)
    expect(durch(stift('pointermove'))).toBe(true)
  })

  it('reicht das Abbrechen des Stifts weiter — daran hängt der Absetzpunkt', () => {
    const durch = neuerZeigerfilter()
    durch(stift('pointerdown'))
    expect(durch(stift('pointercancel'))).toBe(true)
    expect(durch(stift('pointerdown'))).toBe(true)
  })

  it('erlaubt im nächsten Spiel wieder den Finger', () => {
    neuerZeigerfilter()(stift('pointerdown'))
    expect(neuerZeigerfilter()(finger('pointerdown'))).toBe(true)
  })
})

describe('Ein Zeiger zur Zeit', () => {
  it('lässt Finger und Maus allein unverändert durch', () => {
    for (const z of [finger, maus]) {
      const durch = neuerZeigerfilter()
      for (const art of ['pointermove', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointerdown']) {
        expect(durch(z(art))).toBe(true)
      }
    }
  })

  it('stoppt einen zweiten Finger, bis der erste abhebt', () => {
    const durch = neuerZeigerfilter()
    durch(finger('pointerdown'))
    expect(durch(zweiterFinger('pointerdown'))).toBe(false)
    expect(durch(zweiterFinger('pointermove'))).toBe(false)
    expect(durch(zweiterFinger('pointerup'))).toBe(false)
    expect(durch(finger('pointerup'))).toBe(true)
    expect(durch(zweiterFinger('pointerdown'))).toBe(true)
  })

  it('erholt sich, wenn ein Abheben verloren ging', () => {
    const durch = neuerZeigerfilter()
    durch(finger('pointerdown')) // pointerup kommt nie an
    const neuer = zeiger('touch', 9)
    expect(durch(neuer('pointerdown'))).toBe(true)
    expect(durch(neuer('pointermove'))).toBe(true)
  })
})
