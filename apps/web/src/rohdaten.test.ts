import { describe, expect, it } from 'vitest'
import { neueAufzeichnung } from './rohdaten'

/** Liest den Blob zurück: je Abtastung t, x, y, druck. */
function lies(werte: string): number[][] {
  const bytes = Uint8Array.from(atob(werte), (c) => c.charCodeAt(0))
  const f = new Float32Array(bytes.buffer)
  const zeilen: number[][] = []
  for (let i = 0; i < f.length; i += 4) zeilen.push([f[i], f[i + 1], f[i + 2], f[i + 3]])
  return zeilen
}

describe('Aufzeichnung: Absetzpunkt', () => {
  it('ein Absetzpunkt mit Druck 0 trennt zwei Striche, auch direkt nach dem vorherigen Punkt', () => {
    const a = neueAufzeichnung()
    a.punkt(0, 10, 10, 0.5)
    a.punkt(20, 20, 10, 0.5)
    // Abbruch durch das Betriebssystem: kommt wie ein Absetzen, ohne 16 ms Abstand.
    a.punkt(21, 20, 10, 0)
    a.punkt(100, 50, 50, 0.5)
    a.punkt(120, 60, 50, 0.5)
    a.punkt(121, 60, 50, 0)

    const druck = lies(a.fertig()!.werte).map((z) => z[3])
    expect(druck).toEqual([0.5, 0.5, 0, 0.5, 0.5, 0])
  })
})
