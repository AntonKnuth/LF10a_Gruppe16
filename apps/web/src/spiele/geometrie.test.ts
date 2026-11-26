import { describe, expect, it } from 'vitest'
import { berechneSicht, klemme, kreis } from './geometrie'

describe('klemme', () => {
  it('lässt Werte im Bereich unverändert und begrenzt die übrigen', () => {
    expect(klemme(0.4, 0, 1)).toBe(0.4)
    expect(klemme(-2, 0, 1)).toBe(0)
    expect(klemme(7, 0, 1)).toBe(1)
    expect(klemme(-5, -1, 1)).toBe(-1)
  })

  it('nimmt die Grenzen selbst mit', () => {
    expect(klemme(0, 0, 1)).toBe(0)
    expect(klemme(1, 0, 1)).toBe(1)
  })
})

describe('berechneSicht', () => {
  it('füllt ein Canvas mit gleichem Seitenverhältnis ohne Rand', () => {
    expect(berechneSicht(1800, 1280, 900, 640)).toEqual({ s: 2, dx: 0, dy: 0 })
  })

  it('verteilt bei breitem Canvas den Rand links und rechts gleich', () => {
    // 1024×640: die Höhe begrenzt (s = 1), übrig bleiben 124 px Breite.
    expect(berechneSicht(1024, 640, 900, 640)).toEqual({ s: 1, dx: 62, dy: 0 })
  })

  it('verteilt bei hohem Canvas den Rand oben und unten gleich', () => {
    // 450×640: die Breite begrenzt (s = 0,5), die Bühne ist dann 320 px hoch.
    expect(berechneSicht(450, 640, 900, 640)).toEqual({ s: 0.5, dx: 0, dy: 160 })
  })

  it('rechnet mit den Bühnenmaßen, die das Spiel übergibt', () => {
    expect(berechneSicht(800, 800, 400, 200)).toEqual({ s: 2, dx: 0, dy: 200 })
  })
})

describe('kreis', () => {
  it('legt nur den Pfad an — füllen oder umranden entscheidet der Aufrufer', () => {
    const aufrufe: string[] = []
    const g = {
      beginPath: () => aufrufe.push('beginPath'),
      arc: (...a: number[]) => aufrufe.push(`arc ${a.join(' ')}`),
    } as unknown as CanvasRenderingContext2D
    kreis(g, 10, 20, 5)
    expect(aufrufe).toEqual(['beginPath', `arc 10 20 5 0 ${Math.PI * 2}`])
  })
})
