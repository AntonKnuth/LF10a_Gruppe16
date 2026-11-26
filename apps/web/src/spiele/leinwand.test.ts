import { describe, expect, it } from 'vitest'
import { MAX_DT, begrenzeDt, pixelDichte, wenigerBewegung, zuLogisch } from './leinwand'

/** Ein Canvas, wie `zuLogisch` ihn sieht: 400×300 CSS-Pixel bei (100, 50), doppelte Pixeldichte. */
const leinwand = {
  width: 800,
  height: 600,
  getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 300 }),
}

describe('zuLogisch', () => {
  it('rechnet CSS-Pixel in Canvas-Pixel um', () => {
    expect(zuLogisch({ clientX: 100, clientY: 50 }, leinwand, { s: 1, dx: 0, dy: 0 }))
      .toEqual({ x: 0, y: 0 })
    expect(zuLogisch({ clientX: 300, clientY: 200 }, leinwand, { s: 1, dx: 0, dy: 0 }))
      .toEqual({ x: 400, y: 300 })
  })

  it('nimmt Rand und Maßstab der Sicht heraus', () => {
    // Spielfeld halb so groß gezeichnet und um (40, 20) eingerückt.
    const sicht = { s: 0.5, dx: 40, dy: 20 }
    expect(zuLogisch({ clientX: 120, clientY: 60 }, leinwand, sicht)).toEqual({ x: 0, y: 0 })
    expect(zuLogisch({ clientX: 220, clientY: 110 }, leinwand, sicht)).toEqual({ x: 400, y: 200 })
  })
})

describe('begrenzeDt', () => {
  it('rechnet Millisekunden in Sekunden um', () => {
    expect(begrenzeDt(16)).toBeCloseTo(0.016)
  })

  it('kappt lange Lücken, damit nach einem Ruckler nichts durch die Wand springt', () => {
    expect(begrenzeDt(2000)).toBe(MAX_DT)
    expect(begrenzeDt(50)).toBe(MAX_DT)
  })
})

describe('pixelDichte', () => {
  it('nimmt höchstens doppelte Dichte', () => {
    expect(pixelDichte(1)).toBe(1)
    expect(pixelDichte(2)).toBe(2)
    expect(pixelDichte(3)).toBe(2)
  })

  it('nimmt 1, wenn der Browser nichts meldet', () => {
    expect(pixelDichte(0)).toBe(1)
  })
})

describe('wenigerBewegung', () => {
  it('ist aus, wo es kein matchMedia gibt', () => {
    expect(wenigerBewegung()).toBe(false)
  })
})
