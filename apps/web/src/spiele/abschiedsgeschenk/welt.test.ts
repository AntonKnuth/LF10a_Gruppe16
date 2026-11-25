import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  AUFROLLEN_SEK, EINROLLEN_SEK, LEER_FERTIG_SEK, LEER_HINWEIS_SEK, MAX_NEUSTARTS, aktualisiere,
  bandFuer, ergebnis, gibAb, hebeAb, kannNochmal, neueWelt, nochmal, schreibe, setzeAn,
  type Rechteck, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

/** Das Band in Rohdaten-Koordinaten, wie es die Komponente beim Aufsetzen misst. */
const ROH: Rechteck = { x: 212, y: 388.5, breite: 511.1, hoehe: 111.1 }

const laufe = (w: Welt, sekunden: number, angehalten = false) => {
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60, angehalten)
}

/** Eine Welt, deren Urkunde schon aufgerollt ist. */
const bereit = (stufe = 1) => {
  const w = neueWelt(stufe)
  laufe(w, AUFROLLEN_SEK + 0.1)
  return w
}

/** Zieht eine gerade Strecke in kleinen Schritten. */
const strich = (w: Welt, x0: number, y0: number, x1: number, y1: number, schritte = 24) => {
  setzeAn(w, ROH)
  for (let i = 0; i <= schritte; i++) {
    schreibe(w, x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte, d())
  }
  hebeAb(w)
}

/** Ein waagerechter Strich quer durchs Band, in der Mitte. */
const quer = (w: Welt) => {
  const b = w.band
  strich(w, b.x + 10, b.y + b.hoehe / 2, b.x + b.breite - 10, b.y + b.hoehe / 2)
}

describe('Stufe (B1): Band, Lineatur und Vorlage', () => {
  it('Stufe 1: hohes Band, vier Linien, Spielname zum Nachspuren', () => {
    const s = bandFuer(1)
    expect(s.band.hoehe).toBe(140)
    expect(s.lineatur).toBe('vier')
    expect(s.vorlage).toBe('nachspuren')
  })

  it('Stufe 2: mittleres Band, Mittel- und Grundlinie, Spielname zum Abschauen', () => {
    const s = bandFuer(2)
    expect(s.band.hoehe).toBe(100)
    expect(s.lineatur).toBe('zwei')
    expect(s.vorlage).toBe('abschauen')
  })

  it('Stufe 3: schmales Band, nur Grundlinie, keine Vorlage', () => {
    const s = bandFuer(3)
    expect(s.band.hoehe).toBe(70)
    expect(s.lineatur).toBe('grund')
    expect(s.vorlage).toBe('keine')
  })

  it('lässt die Grundlinie auf jeder Stufe an derselben Stelle', () => {
    const unterkante = (stufe: number) => bandFuer(stufe).band.y + bandFuer(stufe).band.hoehe
    expect(unterkante(1)).toBe(unterkante(2))
    expect(unterkante(2)).toBe(unterkante(3))
    expect(bandFuer(1).band.breite).toBe(bandFuer(3).band.breite)
  })

  it('behandelt die Stufen 4 und 5 aus den Einstellungen wie Stufe 3', () => {
    expect(bandFuer(5)).toEqual(bandFuer(3))
  })
})

describe('Tinte', () => {
  it('zählt einen Strich im Band', () => {
    const w = bereit()
    const b = w.band
    strich(w, b.x + 10, b.y + 40, b.x + 110, b.y + 40)
    expect(w.tinteImBand).toBeCloseTo(100, 0)
  })

  it('zählt einen Strich außerhalb des Bands nicht', () => {
    const w = bereit()
    const b = w.band
    strich(w, b.x + 10, b.y - 60, b.x + 110, b.y - 60) // über dem Band
    strich(w, b.x - 150, b.y + 40, b.x - 50, b.y + 40) // links daneben
    expect(w.tinteImBand).toBe(0)
    expect(w.schrift.length).toBeGreaterThan(0)
  })

  it('nimmt während des Aufrollens noch keine Tinte an', () => {
    const w = neueWelt(1)
    expect(setzeAn(w, ROH)).toBe(false)
    schreibe(w, w.band.x + 10, w.band.y + 10, d())
    expect(w.schrift).toHaveLength(0)
  })
})

describe('Wechsel zu „Fertig"', () => {
  it('wechselt nach 1,2 s Ruhe zu pruefen, nach 1,1 s noch nicht', () => {
    const w = bereit()
    quer(w)
    laufe(w, 1.1)
    expect(w.schritt).toBe('unterschreiben')
    laufe(w, 0.1)
    expect(w.schritt).toBe('pruefen')
  })

  it('wartet ohne Strich beliebig lange', () => {
    const w = bereit()
    laufe(w, 10)
    expect(w.schritt).toBe('unterschreiben')
  })

  it('zählt nicht, solange der Stift aufliegt', () => {
    const w = bereit()
    setzeAn(w, ROH)
    schreibe(w, w.band.x + 10, w.band.y + 10, d())
    laufe(w, 3)
    expect(w.schritt).toBe('unterschreiben')
  })

  it('hält die Wartezeit an, solange angehalten ist', () => {
    const w = bereit()
    quer(w)
    laufe(w, 1.0)
    laufe(w, 5, true)
    expect(w.schritt).toBe('unterschreiben')
    // Nach dem Weiterspielen fehlen nur noch die restlichen 0,2 s.
    laufe(w, 0.2)
    expect(w.schritt).toBe('pruefen')
  })

  it('geht zurück zum Unterschreiben, wenn Ben nach „Fertig" weiterschreibt', () => {
    const w = bereit()
    quer(w)
    laufe(w, 1.2)
    expect(w.schritt).toBe('pruefen')
    strich(w, w.band.x + 300, w.band.y + 10, w.band.x + 302, w.band.y + 12)
    expect(w.schritt).toBe('unterschreiben')
  })
})

describe('Ergebnis', () => {
  /** Unterschreiben, „Fertig" tippen, einrollen lassen. */
  const unterschreibeUndGibAb = (stufe: number) => {
    const w = bereit(stufe)
    quer(w)
    laufe(w, 1.2)
    expect(gibAb(w, 5400)).toBe(true)
    laufe(w, EINROLLEN_SEK + 0.1)
    expect(w.fertig).toBe(true)
    return w
  }

  it('nach „Fertig": vollständig, nicht abgebrochen, Band gesetzt, Stufe übernommen', () => {
    const w = unterschreibeUndGibAb(2)
    const e = ergebnis(w, 4000)
    expect(e.spielId).toBe('abschiedsgeschenk')
    expect(e.vollstaendigkeit).toBe(1)
    expect(e.abgebrochen).toBe(false)
    expect(e.stufe).toBe(2)
    expect(e.extra).toMatchObject({
      band: ROH,
      lineatur: 'zwei',
      vorlage: 'abschauen',
      neustartsMs: [],
      fertigMs: 5400,
    })
  })

  it('übernimmt auch eine Stufe über 3 unverändert', () => {
    expect(ergebnis(unterschreibeUndGibAb(4), 4000).stufe).toBe(4)
  })

  it('merkt sich das Band vom ersten Aufsetzen', () => {
    const w = bereit()
    quer(w)
    setzeAn(w, { x: 0, y: 0, breite: 1, hoehe: 1 })
    hebeAb(w)
    expect(ergebnis(w, 0).extra.band).toEqual(ROH)
  })

  it('enthält den Spielnamen nicht', () => {
    const w = neueWelt(1, undefined, 'Benno')
    laufe(w, AUFROLLEN_SEK + 0.1)
    quer(w)
    expect(JSON.stringify(ergebnis(w, 0))).not.toContain('Benno')
  })

  it('misst die Genauigkeit als Anteil der Abtastungen zwischen Ober- und Unterlinie', () => {
    const w = bereit()
    const b = w.band
    strich(w, b.x + 10, b.y + 20, b.x + 110, b.y + 20, 9) // 10 Abtastungen drin
    strich(w, b.x + 10, b.y - 80, b.x + 110, b.y - 80, 9) // 10 Abtastungen darüber
    expect(ergebnis(w, 0).genauigkeit).toBeCloseTo(0.5)
  })

  it('liefert bei leerem Band Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(1), 0)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.extra.band).toBeNull()
  })
})

describe('„Nochmal“', () => {
  /** Unterschreiben und warten, bis „Fertig“ und „Nochmal“ da sind. */
  const bisPruefen = (w: Welt) => {
    quer(w)
    laufe(w, 1.2)
    expect(w.schritt).toBe('pruefen')
  }

  it('leert die Tinte, legt den Zeitpunkt ab und führt zurück zum Unterschreiben', () => {
    const w = bereit()
    bisPruefen(w)
    expect(w.schrift.length).toBeGreaterThan(0)
    expect(nochmal(w, 4200)).toBe(true)
    expect(w.schrift).toHaveLength(0)
    expect(w.tinteImBand).toBe(0)
    expect(w.schritt).toBe('unterschreiben')
    expect(ergebnis(w, 0).extra.neustartsMs).toEqual([4200])
  })

  it('wirkt beim dritten Mal nicht mehr und ist dann nicht mehr da', () => {
    const w = bereit()
    for (let i = 1; i <= MAX_NEUSTARTS; i++) {
      bisPruefen(w)
      expect(kannNochmal(w)).toBe(true)
      expect(nochmal(w, 1000 * i)).toBe(true)
    }
    bisPruefen(w)
    expect(kannNochmal(w)).toBe(false)
    expect(nochmal(w, 9000)).toBe(false)
    expect(w.schritt).toBe('pruefen')
    expect(w.schrift.length).toBeGreaterThan(0)
    expect(ergebnis(w, 0).extra.neustartsMs).toEqual([1000, 2000])
    // „Fertig“ bleibt.
    expect(gibAb(w, 9500)).toBe(true)
  })

  it('zählt als Ergebnis nur den letzten Versuch', () => {
    const w = bereit()
    bisPruefen(w)
    nochmal(w, 1000)
    // Neuer Versuch: nur ein kurzer Strich, deutlich unter 1,5 Bandhöhen.
    strich(w, w.band.x + 10, w.band.y + 40, w.band.x + 30, w.band.y + 40)
    expect(ergebnis(w, 0).vollstaendigkeit).toBeLessThan(0.2)
  })

  it('ist nur im Schritt pruefen möglich', () => {
    const w = bereit()
    expect(nochmal(w, 100)).toBe(false)
    expect(w.neustartsMs).toEqual([])
  })
})

describe('Leeres Band (C2)', () => {
  it('führt nach 90 s zu pruefen; Vollständigkeit 0, nicht abgebrochen', () => {
    const w = bereit()
    laufe(w, LEER_HINWEIS_SEK + LEER_FERTIG_SEK - 1)
    expect(w.schritt).toBe('unterschreiben')
    laufe(w, 1)
    expect(w.schritt).toBe('pruefen')
    expect(gibAb(w, 91000)).toBe(true)
    const e = ergebnis(w, 91000)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.abgebrochen).toBe(false)
  })

  it('lässt den Profi nach 60 s einmal den Hinweis geben, nicht früher', () => {
    const w = bereit()
    laufe(w, LEER_HINWEIS_SEK - 1)
    expect(w.hinweisGegeben).toBe(false)
    laufe(w, 1)
    expect(w.hinweisGegeben).toBe(true)
  })

  it('merkt sich den Hinweis dauerhaft, damit er höchstens einmal kommt', () => {
    const w = bereit()
    laufe(w, LEER_HINWEIS_SEK + 1)
    expect(w.hinweisGegeben).toBe(true)
    // Ben schreibt doch noch und fängt noch einmal an: das Merkzeichen bleibt gesetzt, die
    // Komponente sagt den Satz nur beim Wechsel von false auf true.
    quer(w)
    laufe(w, 1.2)
    nochmal(w, 70000)
    expect(w.hinweisGegeben).toBe(true)
  })

  it('hält die 60 s und die 30 s an, solange angehalten ist', () => {
    const w = bereit()
    laufe(w, 59)
    laufe(w, 100, true)
    expect(w.hinweisGegeben).toBe(false)
    laufe(w, 1)
    expect(w.hinweisGegeben).toBe(true)
    laufe(w, 100, true)
    expect(w.schritt).toBe('unterschreiben')
    laufe(w, LEER_FERTIG_SEK)
    expect(w.schritt).toBe('pruefen')
  })

  it('bricht die Wartezeit ab, sobald Ben etwas schreibt', () => {
    const w = bereit()
    laufe(w, 80)
    quer(w)
    laufe(w, 1.2)
    expect(w.schritt).toBe('pruefen')
    expect(w.leerSek).toBe(0)
  })
})