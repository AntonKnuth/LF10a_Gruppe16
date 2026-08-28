import { describe, expect, it } from 'vitest'
import {
  ABPFIFF_SEK, BALLON_PUNKTE, BALLON_WAPPEN_PUNKTE, BODEN_Y, FANS_START, aktualisiere, bandHoehe,
  beginneAbpfiff, beginneLaden, bewerteScheitel, ergebnis, komboMulti, kraftAus, loslassen,
  neueWelt, stelleDruck, type Welt,
} from './welt'

/** Lässt die Welt eine Weile laufen, ohne dass etwas gedrückt wird. */
const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < sekunden * 60; i++) aktualisiere(w, 1 / 60)
}

describe('Stufe (B1)', () => {
  it('macht das Band mit steigender Stufe schmaler und regelt nicht selbst nach', () => {
    expect(bandHoehe(5)).toBeLessThan(bandHoehe(1))
    const w = neueWelt(3)
    const vorher = w.band.h
    for (let i = 0; i < 20; i++) bewerteScheitel(w, w.ball.x, w.band.y)
    // Auch nach 20 Treffern bleibt die Anforderung die eingestellte — sonst wäre der
    // Messwert im Verlauf nicht mehr mit der gespeicherten Stufe vergleichbar.
    expect(w.band.h).toBe(vorher)
    expect(w.treffer).toBe(20)
  })
})

describe('Bewertung des Scheitelpunkts', () => {
  it('gibt im Kern des Bandes mehr Punkte als am Rand', () => {
    const kern = neueWelt(3)
    bewerteScheitel(kern, 450, kern.band.y)
    const rand = neueWelt(3)
    bewerteScheitel(rand, 450, rand.band.y + rand.band.h / 2 - 1)
    expect(kern.kerntreffer).toBe(1)
    expect(rand.kerntreffer).toBe(0)
    expect(kern.punkte).toBeGreaterThan(rand.punkte)
  })

  it('zählt einen Fehlschuss als Versuch, aber nicht als Treffer', () => {
    const w = neueWelt(3)
    bewerteScheitel(w, 450, w.band.y + w.band.h)
    expect(w.versuche).toBe(1)
    expect(w.treffer).toBe(0)
    expect(w.punkte).toBe(0)
    expect(w.wuerfe[0].getroffen).toBe(false)
  })
})

/** Tippt den Ball an, hält ihn mit `druck` und lässt wieder los. */
const antippen = (w: Welt, druck: number, haltenSek = 0.3) => {
  const d = { wert: druck, synthetisch: true }
  beginneLaden(w, w.ball.x, w.ball.y, d, 'pen')
  laufe(w, haltenSek)
  loslassen(w)
}

describe('Andruck steuert die Höhe', () => {
  it('lässt den Ball bei festem Andruck höher steigen als bei leichtem', () => {
    const hoch = neueWelt(3)
    antippen(hoch, 0.9)
    const leicht = neueWelt(3)
    antippen(leicht, 0.15)
    // Direkt nach dem Loslassen: mehr Druck = mehr Aufwärtsgeschwindigkeit.
    expect(Math.abs(hoch.ball.vy)).toBeGreaterThan(Math.abs(leicht.ball.vy))
    expect(kraftAus(0.9)).toBe(1)
    expect(kraftAus(0.02)).toBe(0)
  })

  it('schießt nach links, wenn der Stift rechts der Ballmitte aufliegt', () => {
    const w = neueWelt(3)
    const d = { wert: 0.6, synthetisch: true }
    beginneLaden(w, w.ball.x + 40, w.ball.y, d, 'pen')
    loslassen(w)
    expect(w.ball.vx).toBeLessThan(0)
  })
})

describe('kein Game Over (C2)', () => {
  it('legt nach dem Ball im Gras einen neuen auf, statt das Spiel zu beenden', () => {
    const w = neueWelt(3)
    antippen(w, 0.5) // erst durch das Antippen kommt der Ball überhaupt in Bewegung
    laufe(w, 5)
    expect(w.ball.lebt).toBe(true)
    expect(w.ball.y).toBeLessThan(BODEN_Y)
    // Vollständigkeit ist der Anteil der Zeit, in der der Ball in der Luft war.
    const e = ergebnis(w, 5000, false)
    expect(e.vollstaendigkeit).toBeGreaterThan(0)
    expect(e.vollstaendigkeit).toBeLessThan(1)
  })
})

describe('Warten (kein Selbstlauf)', () => {
  it('lässt den Ball liegen, bis er angetippt wird', () => {
    const w = neueWelt(3)
    const start = w.ball.ruheY
    laufe(w, 10)
    expect(w.ball.wartet).toBe(true)
    expect(Math.abs(w.ball.y - start)).toBeLessThan(10) // wippt nur, fällt nicht
    expect(w.versuche).toBe(0)
    // Reines Warten darf nicht als bearbeitete Aufgabe zählen.
    expect(ergebnis(w, 10_000, false).vollstaendigkeit).toBe(0)
  })
})

describe('Tribüne und Serie', () => {
  it('holt bei Treffern Fans ins Stadion', () => {
    const w = neueWelt(3)
    bewerteScheitel(w, 450, w.band.y)
    expect(w.fanAnteil).toBeGreaterThan(FANS_START)
  })

  it('lässt beim Ball im Gras Fans gehen, aber nie unter die Startbesetzung', () => {
    const w = neueWelt(3)
    antippen(w, 0.5)
    laufe(w, 6) // fliegt hoch, verfehlt das Band, landet im Gras
    expect(w.fanAnteil).toBe(FANS_START)
    expect(w.kombo).toBe(0)
  })

  it('steigert den Multiplikator mit der Serie und setzt ihn beim Fehlschuss zurück', () => {
    const w = neueWelt(3)
    for (let i = 0; i < 4; i++) bewerteScheitel(w, 450, w.band.y)
    expect(w.kombo).toBe(4)
    expect(komboMulti(w.kombo)).toBe(3)
    bewerteScheitel(w, 450, w.band.y + w.band.h) // daneben
    expect(w.kombo).toBe(0)
    expect(w.besteKombo).toBe(4)
  })
})

describe('Ballons', () => {
  /**
   * Legt einen Ballon seitlich neben den aufsteigenden Ball und lässt ein Bild vergehen.
   * Seitlich, damit der Ball nicht nach unten abgelenkt wird und dabei zusätzlich den
   * Scheitelpunkt wertet — gemessen werden sollen hier nur die Ballonpunkte.
   */
  const platzenLassen = (wappen: boolean) => {
    const w = neueWelt(3)
    antippen(w, 0.5)
    w.ballons = [
      { x: w.ball.x + 55, y: w.ball.y - 10, r: 40, vy: 0, schwenk: 0, ph: 0, farbe: '#fff', wappen },
    ]
    aktualisiere(w, 1 / 60)
    expect(w.treffer).toBe(0)
    return w
  }

  it('gibt für den Wappenballon dreimal so viele Punkte wie für einen normalen', () => {
    expect(platzenLassen(false).punkte).toBe(BALLON_PUNKTE)
    expect(platzenLassen(true).punkte).toBe(BALLON_WAPPEN_PUNKTE)
    expect(BALLON_WAPPEN_PUNKTE).toBe(3 * BALLON_PUNKTE)
  })

  it('zählt Wappenballons getrennt mit, damit die Auswertung sie unterscheiden kann', () => {
    const w = platzenLassen(true)
    expect(w.ballonsGetroffen).toBe(1)
    expect(w.wappenGetroffen).toBe(1)
    expect(platzenLassen(false).wappenGetroffen).toBe(0)
  })
})

describe('Abpfiff (C3)', () => {
  it('jubelt unabhängig vom Ergebnis und sperrt die Eingabe', () => {
    const w = neueWelt(3)
    beginneAbpfiff(w)
    expect(w.abpfiff).toBe(true)
    // Kein neuer Schuss mehr, während das Stadion jubelt.
    expect(beginneLaden(w, w.ball.x, w.ball.y, { wert: 0.5, synthetisch: true }, 'pen')).toBe(false)
    laufe(w, ABPFIFF_SEK + 0.2)
    expect(w.abpfiffUhr).toBe(0)
  })

  it('bleibt nach dem Pfiff erst ruhig, bevor die Welle losläuft', () => {
    const w = neueWelt(3)
    beginneAbpfiff(w)
    laufe(w, 0.9)
    expect(w.welle).toBe(0) // noch keine La Ola — sonst erschreckt der Ausklang
    laufe(w, 1)
    expect(w.welle).toBeGreaterThan(0)
  })
})

describe('Ersatzdruck der Zifferntasten', () => {
  it('übernimmt eine neue Taste, ohne dass der Zeiger sich bewegt', () => {
    const w = neueWelt(3)
    beginneLaden(w, w.ball.x, w.ball.y, { wert: 0.2, synthetisch: true }, 'mouse')
    stelleDruck(w, { wert: 0.9, synthetisch: true })
    loslassen(w)
    expect(w.ball.letzteKraft).toBe(kraftAus(0.9))
  })

  it('lässt einen echt gemessenen Stiftdruck von der Tastatur unberührt', () => {
    const w = neueWelt(3)
    beginneLaden(w, w.ball.x, w.ball.y, { wert: 0.4, synthetisch: false }, 'pen')
    stelleDruck(w, { wert: 0.9, synthetisch: true })
    expect(w.laden.druck).toBe(0.4)
  })
})

describe('Ergebnis', () => {
  it('meldet Genauigkeit zwischen 0 und 1 und markiert den Ersatzdruck', () => {
    const w = neueWelt(2)
    bewerteScheitel(w, 450, w.band.y)
    bewerteScheitel(w, 450, w.band.y + w.band.h)
    const e = ergebnis(w, 1000, false)
    expect(e.genauigkeit).toBeGreaterThan(0)
    expect(e.genauigkeit).toBeLessThanOrEqual(1)
    expect(e.stufe).toBe(2)
    expect(e.synthetischerDruck).toBe(true)
    expect(e.extra.wuerfe).toHaveLength(2)
  })

  it('liefert ohne einen einzigen Schuss keine erfundene Genauigkeit', () => {
    const e = ergebnis(neueWelt(3), 1000, true)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })
})
