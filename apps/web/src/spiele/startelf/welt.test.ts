import { describe, expect, it } from 'vitest'
import { vereine } from '../../content'
import type { Verein } from '../../content/typen'
import type { Druck } from '../../eingabe'
import { VORGABE_REGLER } from '../regler'
import { SCHRIFT, hatVorlage, laenge, punktBei } from '../schrift'
import {
  BALL_SEK, ERMUTIGUNG_SEK, FUNKEN_MAX, HILFE_TEXT, JUBEL_SEK, MITFAHREN_SEK, PLAETZE, SCHLUSS_SEK,
  TAFEL_SEK, ZEILE, aktiverStrich, aktualisiere, band, beende, ergebnis, hebeAb, hilfeVon, kapitaen,
  korridor, legeAus, merkeMassstab, nachname, neueWelt, platzVon, schreibe, schreibtext, setzeAn,
  spielerVon, spitze, sprecherText, startradius, type Ereignis, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

/** Ein Verein mit genau diesen Spielern — der Kader ist reiner Content. */
const mitKader = (...kader: Verein['kader']): Verein => ({ ...vereine[0], kader })

const laufe = (w: Welt, sekunden: number) => {
  const meldungen: (Ereignis | undefined)[] = []
  for (let i = 0; i < Math.round(sekunden * 60); i++) meldungen.push(aktualisiere(w, 1 / 60))
  return meldungen.filter(Boolean)
}

/** Fährt den aktiven Strich von der Spitze bis zum Anteil `bis` nach und setzt dabei einmal auf. */
const fahreNach = (w: Welt, bis = 1, schritt = 5): (Ereignis | undefined)[] => {
  const s = aktiverStrich(w)
  const ganz = laenge(s)
  const p0 = spitze(w)
  const meldungen = [setzeAn(w, p0.x, p0.y)]
  const nr = [w.zeichenNr, w.strichNr, w.phase]
  for (let l = w.fortschritt; l < ganz * bis + schritt; l += schritt) {
    if (s.length === 1 || [w.zeichenNr, w.strichNr, w.phase].some((v, i) => v !== nr[i])) break
    const p = punktBei(s, Math.min(l, ganz * bis))
    meldungen.push(schreibe(w, p.x, p.y, d()))
  }
  hebeAb(w)
  return meldungen.filter(Boolean)
}

/** Schreibt den laufenden Spieler fertig. */
const schreibeSpieler = (w: Welt) => {
  const meldungen: (Ereignis | undefined)[] = []
  // Die Obergrenze fängt einen Strich ab, der sich nicht fertig fahren lässt.
  for (let i = 0; i < 100 && w.phase === 'schreiben'; i++) meldungen.push(...fahreNach(w))
  return meldungen
}

describe('Nachspuren', () => {
  it('macht einen Strich fertig, wenn er vom Startpunkt aus nachgefahren wird', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Eins' }, { nummer: 2, name: 'Zwei' }))
    expect(fahreNach(w)).toEqual(['spieler'])
    expect(w.spielerGeschrieben).toBe(1)
  })

  it('füllt nichts, wenn Ben am Strichende anfängt und zurückfährt', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Eins' }))
    const s = aktiverStrich(w)
    const ende = s[s.length - 1]
    setzeAn(w, ende.x, ende.y)
    for (let l = laenge(s); l >= 0; l -= 5) {
      const p = punktBei(s, l)
      schreibe(w, p.x, p.y, d())
    }
    expect([w.fortschritt, w.gegenrichtung, w.falscheStarts]).toEqual([0, 1, 1])
  })

  it('springt bei der 0 nicht schon beim Aufsetzen auf fertig', () => {
    const w = neueWelt(1, mitKader({ nummer: 0, name: 'Null' }))
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    expect(schreibe(w, p.x, p.y, d())).toBeUndefined()
    expect(w.fortschritt).toBe(0)
  })

  it('lässt sich nicht durch die 0 hindurch abkürzen', () => {
    const w = neueWelt(2, mitKader({ nummer: 0, name: 'Null' }))
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    for (let y = p.y; y <= p.y + 2 * band(w); y += 5) schreibe(w, p.x, y, d())
    expect(w.fortschritt).toBeLessThanOrEqual(0.6 * band(w))
  })

  it('geht nach dem Absetzen an der Spitze weiter', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Eins' }))
    fahreNach(w, 0.5)
    const halb = w.fortschritt
    expect(halb).toBeGreaterThan(0)
    expect(fahreNach(w)).toEqual(['spieler'])
    expect([w.striche, w.falscheStarts]).toEqual([2, 0])
  })

  it('kommt auch mit weit auseinanderliegenden Abtastungen einer schnellen Maus voran', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Eins' }))
    expect(fahreNach(w, 1, 70)).toEqual(['spieler'])
  })

  it('füllt beim Aufsetzen woanders nichts, lässt die Kreide aber stehen', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Eins' }))
    setzeAn(w, ZEILE.x + 5, ZEILE.y + 5)
    schreibe(w, ZEILE.x + 5, ZEILE.y + 5, d())
    schreibe(w, ZEILE.x + 25, ZEILE.y + 5, d())
    expect([w.fortschritt, w.falscheStarts, w.kreide.length]).toEqual([0, 1, 2])
  })

  it('zählt Abtastungen neben der Vorlage, ohne sie als Treffer zu werten', () => {
    const w = neueWelt(2, mitKader({ nummer: 1, name: 'Eins' }))
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    schreibe(w, p.x, p.y, d())
    schreibe(w, p.x - 200, p.y, d())
    expect([w.proben, w.probenDrin]).toEqual([2, 1])
  })

  it('nimmt einen Tupfer durch Antippen an', () => {
    const w = neueWelt(4, mitKader({ nummer: 1, name: 'ö' }))
    fahreNach(w) // die 1
    fahreNach(w) // der Kreis
    expect(w.strichNr).toBe(1)
    expect(fahreNach(w)).toEqual(['strich'])
    expect(fahreNach(w)).toEqual(['spieler'])
  })

  it('führt innerhalb eines Zeichens auch ohne Abheben zum nächsten Strich', () => {
    const w = neueWelt(2, mitKader({ nummer: 4, name: 'Vier' }))
    const [eins, zwei] = w.zeichen[0].striche
    setzeAn(w, eins[0].x, eins[0].y)
    for (let l = 0; l <= laenge(eins); l += 4) {
      const p = punktBei(eins, l)
      schreibe(w, p.x, p.y, d())
    }
    expect([w.strichNr, w.faehrt]).toEqual([1, false])
    let letzte: Ereignis | undefined
    for (let l = 0; l <= laenge(zwei); l += 4) {
      const p = punktBei(zwei, l)
      letzte = schreibe(w, p.x, p.y, d()) ?? letzte
    }
    expect([letzte, w.striche]).toEqual(['spieler', 1])
  })

  it('verlangt für jedes neue Zeichen ein neues Aufsetzen', () => {
    const w = neueWelt(2, mitKader({ nummer: 11, name: 'Elf' }))
    const [a, b] = w.zeichen
    setzeAn(w, a.striche[0][0].x, a.striche[0][0].y)
    for (const s of [a.striche[0], b.striche[0]]) {
      for (let l = 0; l <= laenge(s); l += 4) {
        const p = punktBei(s, l)
        schreibe(w, p.x, p.y, d())
      }
    }
    expect([w.zeichenNr, w.fortschritt]).toEqual([1, 0])
  })
})

describe('Hilfeleiter (C2)', () => {
  const daneben = (w: Welt) => {
    const e = setzeAn(w, 5, 5)
    hebeAb(w)
    return e
  }

  it('steigert die Hilfe, macht den Strich aber nie von selbst fertig', () => {
    const w = neueWelt(3)
    expect([daneben(w), hilfeVon(w)]).toEqual([undefined, 1])
    expect([daneben(w), hilfeVon(w), w.blase?.text]).toEqual(['hilfe', 2, HILFE_TEXT])
    expect(w.ballUhr).toBe(BALL_SEK)
    daneben(w)
    daneben(w)
    expect([hilfeVon(w), w.hilfeMitfahren]).toEqual([3, 1])
    laufe(w, 60)
    expect([w.strichNr, w.fortschritt, w.hilfeMitfahren]).toEqual([0, 0, 1])
    fahreNach(w)
    expect(hilfeVon(w)).toBe(0)
  })

  it('fährt nach einiger Zeit ohne Fortschritt von selbst mit', () => {
    const w = neueWelt(3)
    laufe(w, MITFAHREN_SEK - 1)
    expect(hilfeVon(w)).toBe(0)
    laufe(w, 1.2)
    expect(hilfeVon(w)).toBe(3)
  })

  it('ermutigt nach langer Pause genau einmal', () => {
    const w = neueWelt(3)
    expect(laufe(w, ERMUTIGUNG_SEK + 1)).toEqual(['ermutigung'])
    expect(laufe(w, 3 * ERMUTIGUNG_SEK)).toEqual([])
    expect(w.phase).toBe('schreiben')
  })
})

describe('Stufe (B1) und Inhalt', () => {
  const s = { nummer: 14, name: 'Robert Glatzel' }

  it('schreibt je nach Stufe Nummer, Nachnamen oder den ganzen Namen', () => {
    expect(schreibtext(1, s)).toEqual(['14'])
    expect(schreibtext(2, s)).toEqual(['14'])
    expect(schreibtext(3, s)).toEqual(['14 GLATZEL'])
    expect(schreibtext(4, s)).toEqual(['14 Glatzel'])
    expect(schreibtext(5, s)).toHaveLength(2)
    expect(schreibtext(5, s).join(' ')).toBe('14 Robert Glatzel')
  })

  it('bringt jeden Kader-Eintrag auf jeder Stufe lesbar groß in die Schreibzeile', () => {
    for (const spieler of vereine.flatMap((v) => v.kader)) {
      for (const stufe of [1, 2, 3, 4, 5]) {
        const zeichen = legeAus(stufe, spieler)
        const schluessel = [spieler.name, stufe]
        expect([...schluessel, zeichen[0].band >= 36]).toEqual([...schluessel, true])
        for (const p of zeichen.flatMap((z) => z.striche.flat())) {
          const passt = p.x >= ZEILE.x - 1 && p.x <= ZEILE.x + ZEILE.b + 1 &&
            p.y >= ZEILE.y - 1 && p.y <= ZEILE.y + ZEILE.h + 1
          expect([...schluessel, passt]).toEqual([...schluessel, true])
        }
      }
    }
  })

  it('schreibt jeden Kader-Eintrag und keinen Nachnamen über neun Zeichen', () => {
    for (const spieler of vereine.flatMap((v) => v.kader)) {
      expect([spieler.name, hatVorlage(spieler.name)]).toEqual([spieler.name, true])
      expect([spieler.name, nachname(spieler).length <= 9]).toEqual([spieler.name, true])
    }
  })

  it('wird mit der Stufe enger und mit der Toleranz weiter, bei der Vorgabe unverändert', () => {
    expect(korridor(2, 72)).toBeLessThan(korridor(1, 90))
    expect(korridor(3, 60, 2)).toBe(2 * korridor(3, 60))
    expect(startradius(3, 60, 2)).toBe(2 * startradius(3, 60))
    expect(korridor(3, 60, VORGABE_REGLER.toleranz)).toBe(korridor(3, 60))
    expect(korridor(5, 20)).toBe(12)
  })

  it('kann jedes Zeichen der Schrift fertig schreiben', () => {
    // Auf Stufe 4 in Originalschreibung und bei fein wie grob abgetastetem Stift.
    for (const z of Object.keys(SCHRIFT)) {
      for (const schritt of [1, 5, 12]) {
        const w = neueWelt(4, mitKader({ nummer: 1, name: z }))
        for (let i = 0; i < 20 && w.phase === 'schreiben'; i++) fahreNach(w, 1, schritt)
        expect([z, schritt, w.phase]).toEqual([z, schritt, 'jubel'])
      }
    }
  })

  it('lässt sich mit jedem Verein auf jeder Stufe eine ganze Tafel lang spielen', () => {
    for (const v of vereine) {
      for (const stufe of [1, 2, 3, 4, 5]) {
        const w = neueWelt(stufe, v)
        for (let i = 0; i < v.kader.length; i++) {
          schreibeSpieler(w)
          laufe(w, JUBEL_SEK + 0.1)
        }
        expect([v.id, stufe, w.phase, w.falscheStarts]).toEqual([v.id, stufe, 'tafelVoll', 0])
      }
    }
  })
})

describe('Tafel', () => {
  const drei = mitKader(
    { nummer: 1, name: 'Anna Eins' }, { nummer: 7, name: 'Toni Sieben' }, { nummer: 11, name: 'Cem Elf' },
  )

  it('ruft jeden Spieler auf, den Kapitän doppelt, den letzten mit der vollen Tafel', () => {
    const w = neueWelt(1, drei)
    expect(sprecherText(w)).toBe('Mit der Nummer 1: Anna, Eins!')
    w.dran = kapitaen(w)
    expect(sprecherText(w)).toBe('Mit der Nummer 7: Toni, Sieben! Sieben!')
    w.dran = 2
    expect(sprecherText(w)).toBe('Mit der Nummer 11: Cem, Elf! Die Startelf steht!')
  })

  it('beginnt nach der vollen Tafel eine neue in umgekehrter Reihenfolge', () => {
    const w = neueWelt(1, drei)
    const nummern: number[] = []
    for (let i = 0; i < 4; i++) {
      nummern.push(spielerVon(w).nummer)
      schreibeSpieler(w)
      laufe(w, JUBEL_SEK + 0.1)
      if (w.phase === 'tafelVoll') laufe(w, TAFEL_SEK + 0.1)
    }
    expect(nummern).toEqual([1, 7, 11, 11])
    expect(w.tafel).toBe(1)
  })

  it('verteilt einen kurzen Kader auf die elf Plätze, ohne einen doppelt zu belegen', () => {
    for (let n = 1; n <= 11; n++) {
      const plaetze = Array.from({ length: n }, (_, i) => platzVon(i, n))
      expect(new Set(plaetze).size).toBe(n)
      expect(plaetze.every((p) => PLAETZE[p])).toBe(true)
    }
    expect(Array.from({ length: 11 }, (_, i) => platzVon(i, 11))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('nimmt höchstens elf Spieler und lässt aus, was sich nicht schreiben lässt', () => {
    const viele = Array.from({ length: 14 }, (_, i) => ({ nummer: i + 1, name: 'Anna Eins' }))
    expect(neueWelt(3, mitKader(...viele)).kader).toHaveLength(11)
    expect(neueWelt(3, mitKader({ nummer: 1, name: 'André É' }, viele[0])).kader).toHaveLength(1)
  })

  it('läuft ohne Verein mit Ersatzkader und Standardfarben', () => {
    const w = neueWelt(3)
    expect(w.kader.length).toBeGreaterThan(0)
    expect(w.farben.primaer).toBe('#0a3a82')
  })

  it('lässt den Profi bei seinem eigenen Magneten etwas sagen', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: `${vereine[0].profi.name} Eins` }))
    schreibeSpieler(w)
    expect(w.blase?.text).toBe('Das bin ich!')
  })
})

describe('Ende', () => {
  const zwei = mitKader({ nummer: 1, name: 'Anna Eins' }, { nummer: 7, name: 'Toni Sieben' })

  it('wartet, bis der Stift oben ist, und lässt dann den Profi ergänzen', () => {
    const w = neueWelt(1, zwei)
    laufe(w, 2)
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    schreibe(w, p.x, p.y, d())
    beende(w)
    laufe(w, 3)
    expect(w.phase).toBe('schreiben')
    hebeAb(w)
    laufe(w, 0.1)
    expect(w.phase).toBe('schluss')
    laufe(w, SCHLUSS_SEK + 0.1)
    expect(w.phase).toBe('fertig')
    const e = ergebnis(w)
    // Die Schlussanimation ist keine Übungszeit.
    expect(e.dauerMs).toBeLessThan(5200)
    expect(e.extra).toMatchObject({ spielerVomProfi: 2, spielerGeschrieben: 0, striche: 1 })
    expect(e.extra.zeichen).toHaveLength(1)
  })

  it('führt einen Jubel noch zu Ende', () => {
    const w = neueWelt(1, zwei)
    schreibeSpieler(w)
    beende(w)
    laufe(w, 0.5)
    expect(w.phase).toBe('jubel')
    laufe(w, JUBEL_SEK + SCHLUSS_SEK + 0.1)
    expect(w.phase).toBe('fertig')
    expect(ergebnis(w).extra).toMatchObject({ spielerVomProfi: 1, spielerGeschrieben: 1 })
  })

  it('fängt nach einer vollen Tafel keine neue mehr an', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Anna Eins' }))
    schreibeSpieler(w)
    beende(w)
    laufe(w, JUBEL_SEK + TAFEL_SEK + 0.2)
    expect([w.phase, w.tafel]).toEqual(['fertig', 0])
    expect(ergebnis(w).extra).toMatchObject({ spielerVomProfi: 0 })
  })

  it('endet auch, wenn Ben gar nichts geschrieben hat, mit Nullen statt NaN', () => {
    const w = neueWelt(3)
    beende(w)
    laufe(w, SCHLUSS_SEK + 0.2)
    const e = ergebnis(w)
    expect([w.phase, e.vollstaendigkeit, e.genauigkeit, e.abgebrochen]).toEqual(['fertig', 0, 0, false])
  })
})

describe('Ergebnis', () => {
  it('zählt fertige je begonnenem Zeichen und das letzte anteilig', () => {
    const w = neueWelt(1, mitKader({ nummer: 11, name: 'Elf' }))
    fahreNach(w)
    fahreNach(w, 0.5)
    beende(w)
    laufe(w, 0.1)
    const e = ergebnis(w)
    expect(e.vollstaendigkeit).toBeGreaterThan(0.6)
    expect(e.vollstaendigkeit).toBeLessThan(0.9)
    expect(e.genauigkeit).toBe(1)
    expect([e.stufe, e.synthetischerDruck, e.spielId]).toEqual([1, true, 'startelf'])
  })

  it('ordnet jedem Zeichen lückenlos seine Aufsetzer zu, ein Tipp im Jubel gehört zu keinem', () => {
    const w = neueWelt(2, mitKader({ nummer: 4, name: 'Vier' }, { nummer: 10, name: 'Zehn' }))
    schreibeSpieler(w) // 4: zwei Striche
    setzeAn(w, 500, 300) // Tipp im Jubel
    hebeAb(w)
    laufe(w, JUBEL_SEK + 0.1)
    schreibeSpieler(w) // 1 und 0: je ein Strich
    expect(w.protokoll.map((z) => [z.z, z.strichVon, z.strichBis])).toEqual([
      ['4', 0, 1], ['1', 3, 3], ['0', 4, 4],
    ])
    expect(w.striche).toBe(5)
  })

  it('schreibt die Vorlage in ganzen Bühnen-Pixeln mit', () => {
    const w = neueWelt(1, mitKader({ nummer: 1, name: 'Eins' }))
    schreibeSpieler(w)
    const [z] = w.protokoll
    expect(z.soll[0].every(Number.isInteger)).toBe(true)
    expect(z.grund - z.oben).toBe(180)
    expect(z).toMatchObject({ z: '1', nummer: 1, band: 90, fertig: true })
  })

  it('merkt sich den Maßstab und ob er sich geändert hat', () => {
    const w = neueWelt(1)
    merkeMassstab(w, { s: 1, dx: 10, dy: 0 })
    merkeMassstab(w, { s: 1, dx: 10, dy: 0 })
    expect(w.massstabGeaendert).toBe(false)
    merkeMassstab(w, { s: 0.8, dx: 10, dy: 0 })
    expect(ergebnis(w).extra).toMatchObject({ massstab: { s: 1, dx: 10, dy: 0 }, massstabGeaendert: true })
  })
})

describe('Funken (A1)', () => {
  it('zündet am Strichende, begrenzt und nicht bei prefers-reduced-motion', () => {
    const w = neueWelt(1, mitKader({ nummer: 11, name: 'Elf' }))
    fahreNach(w)
    expect(w.funken.length).toBeGreaterThan(0)
    expect(w.funken.length).toBeLessThanOrEqual(FUNKEN_MAX)
    const ruhig = neueWelt(1, mitKader({ nummer: 11, name: 'Elf' }))
    ruhig.wenigerBewegung = true
    fahreNach(ruhig)
    expect(ruhig.funken).toHaveLength(0)
  })
})
