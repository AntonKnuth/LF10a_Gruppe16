import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  JUBEL_SEK, RUNDEN, aktualisiere, aufBahn, bahnPunkte, ballPunkt, ergebnis, huetchenAuf,
  klemme, neueWelt, punktAuf, toleranz, ziehe, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60)
}

/** Dribbelt sauber auf der Bahn von t0 bis t1. */
const zieheAuf = (w: Welt, t0: number, t1: number, schritte = 40) => {
  for (let i = 0; i <= schritte; i++) {
    const p = punktAuf(w.bahn, t0 + ((t1 - t0) * i) / schritte)
    ziehe(w, p.x, p.y, d())
  }
}

/** Ein vollständiger Durchgang samt Jubel. */
const durchgang = (w: Welt) => {
  zieheAuf(w, 0, 1)
  laufe(w, JUBEL_SEK + 0.2)
}

describe('Stufe (B1)', () => {
  it('macht den Korridor mit steigender Stufe schmaler', () => {
    expect(toleranz(5)).toBeLessThan(toleranz(1))
  })

  it('regelt die Toleranz während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    const vorher = toleranz(w.stufe)
    zieheAuf(w, 0, 0.5)
    // Sonst wäre der Messwert im Verlauf nicht mehr mit der gespeicherten Stufe vergleichbar.
    expect(toleranz(w.stufe)).toBe(vorher)
  })
})

describe('Bahnen (B3: wechselnde Muster)', () => {
  it('ist deterministisch — der Test braucht kein Zufallsmuster', () => {
    expect(bahnPunkte(3)).toEqual(bahnPunkte(3))
  })

  it('wechselt die Wellenform von Durchgang zu Durchgang', () => {
    const scheitel = (r: number) => Math.max(...bahnPunkte(r).map((p) => Math.abs(p.y - 320)))
    expect(scheitel(1)).not.toBeCloseTo(scheitel(0))
    expect(huetchenAuf(1)).not.toEqual(huetchenAuf(0))
  })

  it('läuft immer von links nach rechts und endet auf der Mittellinie', () => {
    for (let r = 0; r < 5; r++) {
      const b = bahnPunkte(r)
      expect(b[b.length - 1].x).toBeGreaterThan(b[0].x)
      expect(b[b.length - 1].y).toBeCloseTo(b[0].y)
    }
  })

  it('stellt für jeden Bogen ein Hütchen auf', () => {
    for (let r = 0; r < 5; r++) expect(huetchenAuf(r).length).toBeGreaterThanOrEqual(2)
  })
})

describe('Nächster Punkt auf der Bahn', () => {
  it('misst Strecke und Abstand quer zur Welle', () => {
    const b = bahnPunkte(0)
    const mitte = punktAuf(b, 0.5)
    expect(aufBahn(b, mitte.x, mitte.y).t).toBeCloseTo(0.5, 2)
    expect(aufBahn(b, mitte.x, mitte.y).abstand).toBeCloseTo(0)
    expect(aufBahn(b, mitte.x, mitte.y + 40).abstand).toBeLessThanOrEqual(40)
  })

  it('klemmt hinter Anfang und Ende auf die Bahn', () => {
    const b = bahnPunkte(0)
    expect(aufBahn(b, b[0].x - 500, b[0].y).t).toBe(0)
    expect(aufBahn(b, b[b.length - 1].x + 500, b[b.length - 1].y).t).toBe(1)
  })
})

describe('Dribbeln', () => {
  it('rollt den Ball nur im Korridor weiter', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.4)
    expect(w.fortschritt).toBeCloseTo(0.4, 1)
    expect(w.imKorridor).toBe(true)
  })

  it('lässt den Ball stehen, solange der Stift daneben ist', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.3)
    const stand = w.fortschritt

    // Weit vorn, aber außerhalb des Korridors: der Ball wartet.
    const weit = punktAuf(w.bahn, 0.9)
    ziehe(w, weit.x, weit.y + toleranz(3) + 200, d())
    expect(w.fortschritt).toBeCloseTo(stand)
    expect(w.imKorridor).toBe(false)
  })

  it('zählt einen Punkt daneben trotzdem als Probe — sonst wäre Danebenfahren gratis', () => {
    const w = neueWelt(3)
    const p = punktAuf(w.bahn, 0.5)
    ziehe(w, p.x, p.y + toleranz(3) + 200, d())
    expect(w.proben).toBe(1)
    expect(w.probenDrin).toBe(0)
    expect(w.spur.at(-1)?.daneben).toBe(true)
  })

  it('rollt nie zurück — Hin- und Herschrubben bringt nichts', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.6)
    zieheAuf(w, 0.6, 0.1)
    expect(w.fortschritt).toBeCloseTo(0.6, 1)
  })

  it('hält den Ball immer auf der Bahn', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.5)
    const p = ballPunkt(w)
    expect(aufBahn(w.bahn, p.x, p.y).abstand).toBeCloseTo(0)
  })
})

describe('Hütchen (Hand-Auge)', () => {
  it('meldet jedes Hütchen genau einmal', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.99)
    expect(w.huetchenUmkurvt).toBe(w.huetchen.length)
    expect(w.umkurvt.every(Boolean)).toBe(true)

    // Noch einmal darüber: der Fortschritt geht nicht zurück, also zählt auch nichts erneut.
    zieheAuf(w, 0, 0.99)
    expect(w.huetchenUmkurvt).toBe(w.huetchen.length)
  })

  it('meldet ein umkurvtes Hütchen als Ereignis für den Klang (A1)', () => {
    const w = neueWelt(3)
    const erstes = w.huetchen[0]
    const vor = punktAuf(w.bahn, erstes - 0.02)
    const nach = punktAuf(w.bahn, erstes + 0.02)
    expect(ziehe(w, vor.x, vor.y, d())).toBe(null)
    expect(ziehe(w, nach.x, nach.y, d())).toBe('huetchen')
  })

  it('zählt nur Hütchen der begonnenen Durchgänge', () => {
    const w = neueWelt(3)
    expect(w.huetchenGesamt).toBe(huetchenAuf(0).length)
    durchgang(w)
    expect(w.huetchenGesamt).toBe(huetchenAuf(0).length + huetchenAuf(1).length)
  })
})

describe('Durchgänge und Ende (C2)', () => {
  it('feiert einen geschafften Durchgang und meldet ihn für den Klang', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 0.98)
    const letzter = punktAuf(w.bahn, 1)
    expect(ziehe(w, letzter.x, letzter.y, d())).toBe('geschafft')
    expect(w.geschafft).toBe(1)
    expect(w.jubelUhr).toBeGreaterThan(0)
    expect(w.runde).toBe(0) // die Bahn steht noch
  })

  it('legt danach einen neuen Parcours aus statt zu enden', () => {
    const w = neueWelt(3)
    durchgang(w)
    expect(w.runde).toBe(1)
    expect(w.fertig).toBe(false)
    expect(w.fortschritt).toBe(0)
    expect(w.spur).toHaveLength(0)
    expect(w.bahn).toEqual(bahnPunkte(1))
  })

  it('nimmt während des Jubels keine Eingabe an', () => {
    const w = neueWelt(3)
    zieheAuf(w, 0, 1)
    const proben = w.proben
    const p = punktAuf(w.bahn, 0.5)
    ziehe(w, p.x, p.y, d())
    expect(w.proben).toBe(proben)
  })

  it('ist nach fünf Durchgängen fertig — die Uhr ist nicht die Endbedingung', () => {
    const w = neueWelt(3)
    for (let i = 0; i < RUNDEN; i++) {
      expect(w.fertig).toBe(false)
      durchgang(w)
    }
    expect(w.fertig).toBe(true)
    expect(w.geschafft).toBe(RUNDEN)
    expect(ergebnis(w, 1000, false).vollstaendigkeit).toBe(1)
  })

  it('nimmt nach dem letzten Durchgang nichts mehr an', () => {
    const w = neueWelt(3)
    for (let i = 0; i < RUNDEN; i++) durchgang(w)
    const p = punktAuf(w.bahn, 0.5)
    expect(ziehe(w, p.x, p.y, d())).toBe(null)
    expect(w.geschafft).toBe(RUNDEN)
  })

  it('kennt keinen Verliererzustand — auch dauerhaft daneben bricht nichts ab', () => {
    const w = neueWelt(3)
    for (let i = 0; i < 50; i++) {
      const p = punktAuf(w.bahn, i / 50)
      ziehe(w, p.x, p.y + 260, d())
    }
    laufe(w, 10)
    expect(w.fortschritt).toBe(0)
    expect(w.geschafft).toBe(0)
    expect(w.fertig).toBe(false)
    expect(() => ergebnis(w, 10_000, false)).not.toThrow()
  })
})

describe('Ergebnis', () => {
  it('rechnet Genauigkeit über alle Proben', () => {
    const w = neueWelt(3)
    const p = punktAuf(w.bahn, 0.3)
    ziehe(w, p.x, p.y, d()) // drin
    ziehe(w, p.x, p.y + toleranz(3) + 200, d()) // daneben
    expect(ergebnis(w, 100, false).genauigkeit).toBeCloseTo(0.5)
  })

  it('misst Vollständigkeit an den fünf Durchgängen', () => {
    const w = neueWelt(3)
    durchgang(w)
    zieheAuf(w, 0, 0.5)

    const e = ergebnis(w, 1000, false)
    expect(e.spielId).toBe('aufwaermen')
    // Einer ganz, einer halb — von fünf.
    expect(e.vollstaendigkeit).toBeCloseTo(1.5 / RUNDEN, 1)
    expect(e.extra).toMatchObject({ durchgaenge: 1, durchgaengeSoll: RUNDEN, toleranz: toleranz(3) })
  })

  it('liefert bei unberührter Bahn Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, true)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })

  it('reicht Stufe durch und markiert Tastaturdruck als synthetisch', () => {
    const w = neueWelt(4)
    zieheAuf(w, 0, 0.2)
    const e = ergebnis(w, 100, false)
    // Ohne diese Markierung mischen sich echte Pencil-Druckkurven mit Tastaturwerten.
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(4)
  })

  it('bleibt zwischen 0 und 1', () => {
    const w = neueWelt(3)
    for (let i = 0; i < RUNDEN + 2; i++) durchgang(w)
    const e = ergebnis(w, 1000, false)
    expect(e.vollstaendigkeit).toBe(klemme(e.vollstaendigkeit, 0, 1))
  })
})
