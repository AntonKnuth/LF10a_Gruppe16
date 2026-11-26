import { describe, expect, it } from 'vitest'
import { bewegeFunken, funkenstoss, zeichneFunken, type Funke, type Stossart } from './funken'

const ART: Stossart = { leben: 0.8, max: 24, tempo: 160, tempoStufe: 60, auftrieb: 80 }

describe('funkenstoss', () => {
  it('verteilt die Funken gleichmäßig im Kreis, ohne Zufall', () => {
    const a: Funke[] = []
    const b: Funke[] = []
    funkenstoss(a, 100, 50, ['rot'], 4, ART)
    funkenstoss(b, 100, 50, ['rot'], 4, ART)
    expect(a).toEqual(b)
    expect(a).toHaveLength(4)
    // Funke 0 fliegt nach rechts, Funke 2 (halber Kreis) nach links; beide mit Auftrieb.
    expect(a[0].vx).toBeCloseTo(160)
    expect(a[0].vy).toBeCloseTo(-80)
    expect(a[2].vx).toBeCloseTo(-(160 + 2 * 60))
    expect(a[2].vy).toBeCloseTo(-80)
    expect(a.every((f) => f.x === 100 && f.y === 50 && f.leben === 0.8)).toBe(true)
  })

  it('vergibt die Farben reihum', () => {
    const f: Funke[] = []
    funkenstoss(f, 0, 0, ['a', 'b', 'c'], 5, ART)
    expect(f.map((x) => x.farbe)).toEqual(['a', 'b', 'c', 'a', 'b'])
  })

  it('hält die Obergrenze ein, auch über mehrere Stöße', () => {
    const f: Funke[] = []
    funkenstoss(f, 0, 0, ['a'], 12, { ...ART, max: 20 })
    funkenstoss(f, 0, 0, ['a'], 12, { ...ART, max: 20 })
    expect(f).toHaveLength(20)
  })

  it('ohne Tempostufe fliegen alle Funken gleich schnell', () => {
    const f: Funke[] = []
    funkenstoss(f, 0, 0, ['a'], 6, { ...ART, tempo: 130, tempoStufe: 0, auftrieb: 0 })
    for (const x of f) expect(Math.hypot(x.vx, x.vy)).toBeCloseTo(130)
  })
})

describe('bewegeFunken', () => {
  it('bewegt, lässt fallen und altert jeden Funken', () => {
    const f: Funke[] = [{ x: 0, y: 0, vx: 10, vy: -20, leben: 1, farbe: 'a' }]
    const rest = bewegeFunken(f, 0.5)
    expect(rest[0]).toEqual({ x: 5, y: -10, vx: 10, vy: 180, leben: 0.5, farbe: 'a' })
  })

  it('nimmt eine eigene Schwerkraft an', () => {
    const f: Funke[] = [{ x: 0, y: 0, vx: 0, vy: 0, leben: 1, farbe: 'a' }]
    expect(bewegeFunken(f, 0.5, 300)[0].vy).toBe(150)
  })

  it('lässt Funken nach ihrer Lebensdauer verschwinden', () => {
    const f: Funke[] = []
    funkenstoss(f, 0, 0, ['a'], 8, ART)
    let rest = f
    for (let i = 0; i < 60; i++) rest = bewegeFunken(rest, 1 / 60)
    expect(rest).toHaveLength(0)
  })
})

describe('zeichneFunken', () => {
  it('blendet jeden Funken mit seiner restlichen Lebensdauer aus', () => {
    const alphas: number[] = []
    const farben: string[] = []
    const g = {
      save() {}, restore() {}, beginPath() {}, arc() {},
      set globalAlpha(a: number) { alphas.push(a) },
      set fillStyle(f: string) { farben.push(f) },
      fill() {},
    } as unknown as CanvasRenderingContext2D
    zeichneFunken(g, [
      { x: 0, y: 0, vx: 0, vy: 0, leben: 0.4, farbe: 'rot' },
      { x: 0, y: 0, vx: 0, vy: 0, leben: -0.1, farbe: 'blau' },
    ], 0.8)
    expect(alphas).toEqual([0.5, 0])
    expect(farben).toEqual(['rot', 'blau'])
  })
})
