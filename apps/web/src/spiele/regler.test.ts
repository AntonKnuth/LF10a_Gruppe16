import { describe, expect, it } from 'vitest'
import { VORGABE_REGLER, musterNochmal } from './regler'

const quote = (mindesttrefferquote: number) => ({ ...VORGABE_REGLER, mindesttrefferquote })

describe('Mindesttrefferquote (B1)', () => {
  it('wiederholt bei der Vorgabe und darunter nie etwas', () => {
    expect(musterNochmal(quote(0.5), 0, 10)).toBe(false)
    expect(musterNochmal(quote(0.2), 0, 10)).toBe(false)
  })

  it('wiederholt darüber eine Runde, die unter der Quote liegt', () => {
    expect(musterNochmal(quote(0.8), 7, 10)).toBe(true)
    expect(musterNochmal(quote(0.8), 8, 10)).toBe(false)
  })

  it('wiederholt nichts, solange nichts gemessen wurde', () => {
    expect(musterNochmal(quote(1), 0, 0)).toBe(false)
  })
})
