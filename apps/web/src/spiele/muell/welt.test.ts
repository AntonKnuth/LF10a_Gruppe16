import { describe, expect, it } from 'vitest'
import type { Druck } from '../../eingabe'
import {
  FELD, MIN_LAENGE, NACHSPIEL_SEK, OFFEN_HILFE_AB, aktualisiere, beginneSchluss, drift, ergebnis,
  greiferRadius, hebeAb, imPolygon, istFertig, legeMuell, male, muellJeAbschnitt, neueWelt,
  ringGross, schliessToleranz, setzeAuf, verwirfStrich, type Art, type Ereignis, type Muell,
  type Punkt, type Welt,
} from './welt'
import { VORGABE_REGLER } from '../regler'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })

const laufe = (w: Welt, sekunden: number) => {
  const ereignisse: Ereignis[] = []
  for (let i = 0; i < Math.round(sekunden * 60); i++) ereignisse.push(aktualisiere(w, 1 / 60))
  return ereignisse
}

/** Ein Müllstück an fester Stelle — die Tests legen ihren Müll selbst. */
const stueck = (x: number, y: number, art: Art = 'becher'): Muell => ({
  art, x, y, r: 20, vx: 1, vy: 0, vorgemerkt: false, eingesammelt: false,
})

/** Malt einen ganzen Kreis; der Kreis schließt sich unterwegs von selbst. */
const kreisUm = (w: Welt, m: Punkt, r: number, schritte = 48): Ereignis => {
  setzeAuf(w, m.x + r, m.y, d(), 'mouse')
  let letztes: Ereignis = null
  for (let i = 1; i <= schritte && w.strich; i++) {
    const a = (i / schritte) * Math.PI * 2
    letztes = male(w, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, d())
  }
  hebeAb(w)
  return letztes
}

/** Malt einen Linienzug durch die Punkte und hebt ab. */
const zug = (w: Welt, punkte: Punkt[]): Ereignis => {
  setzeAuf(w, punkte[0].x, punkte[0].y, d(), 'mouse')
  let letztes: Ereignis = null
  for (const p of punkte.slice(1)) letztes = male(w, p.x, p.y, d())
  hebeAb(w)
  return letztes
}

describe('Punkt im Polygon', () => {
  const quadrat = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]

  it('erkennt innen und außen', () => {
    expect(imPolygon({ x: 50, y: 50 }, quadrat)).toBe(true)
    expect(imPolygon({ x: 150, y: 50 }, quadrat)).toBe(false)
    expect(imPolygon({ x: 50, y: -1 }, quadrat)).toBe(false)
  })

  it('entscheidet auf der Kante eindeutig und stürzt nicht ab', () => {
    // Genau auf dem Rand ist Geschmackssache; wichtig ist nur, dass immer dasselbe herauskommt.
    expect(imPolygon({ x: 0, y: 50 }, quadrat)).toBe(imPolygon({ x: 0, y: 50 }, quadrat))
  })

  it('zählt bei einer Acht beide Schleifen als drinnen, die Kreuzung nicht doppelt', () => {
    // Eine liegende Acht als Schleife, die sich bei (100, 50) kreuzt.
    const acht = [{ x: 0, y: 0 }, { x: 200, y: 100 }, { x: 200, y: 0 }, { x: 0, y: 100 }]
    expect(imPolygon({ x: 20, y: 50 }, acht)).toBe(true)
    expect(imPolygon({ x: 180, y: 50 }, acht)).toBe(true)
    expect(imPolygon({ x: 100, y: 90 }, acht)).toBe(false)
  })
})

describe('Schließen', () => {
  it('schließt einen Strich unter der Mindestlänge nie', () => {
    const w = neueWelt(3)
    w.muell = []
    // Hin und zurück: 70 px Weg, Ende genau am Anfang.
    zug(w, [{ x: 300, y: 300 }, { x: 335, y: 300 }, { x: 300, y: 300 }])
    expect(w.zaehler.geschlossen).toBe(0)
    // Ein Tupfer ist auch kein Kreisversuch.
    expect(w.zaehler.kreisversuche).toBe(0)
  })

  it('schließt knapp innerhalb der Toleranz, knapp außerhalb nicht', () => {
    const tol = schliessToleranz(3)
    const ecke = (ende: number) => [
      { x: 300, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 400 }, { x: 300, y: 400 },
      { x: 300, y: 300 + ende },
    ]
    const drin = neueWelt(3)
    drin.muell = []
    expect(zug(drin, ecke(tol - 1))).toBe('zu')
    expect(drin.zaehler.geschlossen).toBe(1)

    const knapp = neueWelt(3)
    knapp.muell = []
    expect(zug(knapp, ecke(tol + 1))).toBe(null)
    expect(knapp.zaehler.geschlossen).toBe(0)
    expect(knapp.zaehler.kreisversuche).toBe(1)
  })
})

describe('Einsammeln', () => {
  it('holt Müll, dessen Mittelpunkt im Kreis liegt — nicht, wenn nur der Rand hineinragt', () => {
    const w = neueWelt(3)
    const innen = stueck(300, 300)
    const rand = stueck(370, 300)
    w.muell = [innen, rand]
    kreisUm(w, { x: 300, y: 300 }, 55)
    laufe(w, 2)
    expect(innen.eingesammelt).toBe(true)
    expect(rand.eingesammelt).toBe(false)
    expect(w.zaehler.eingesammelt).toBe(1)
  })

  it('holt nichts bei einem Kreis größer als der Greifer und zeigt den Greiferkreis', () => {
    const w = neueWelt(3)
    const m = stueck(450, 380)
    w.muell = [m]
    expect(kreisUm(w, m, greiferRadius(3) + 20)).toBe('zuGross')
    laufe(w, 2)
    expect(m.eingesammelt).toBe(false)
    expect(w.zaehler.zuGross).toBe(1)
    expect(w.hinweis).toBe(null) // nach 2 s wieder weg
  })

  it('holt drei Konfetti mit einem Kreis', () => {
    const w = neueWelt(1)
    w.muell = [stueck(300, 300, 'konfetti'), stueck(320, 290, 'konfetti'), stueck(305, 318, 'konfetti'), stueck(700, 500)]
    kreisUm(w, { x: 308, y: 302 }, 50)
    laufe(w, 2)
    expect(w.zaehler.eingesammelt).toBe(3)
  })

  it('zählt einen geschlossenen Kreis ohne Müll als leer', () => {
    const w = neueWelt(3)
    w.muell = [stueck(700, 500)]
    expect(kreisUm(w, { x: 300, y: 300 }, 50)).toBe('zu')
    expect(w.zaehler.leer).toBe(1)
    expect(w.auftraege).toHaveLength(0)
  })

  it('arbeitet zwei schnell hintereinander gemalte Kreise beide ab', () => {
    const w = neueWelt(3)
    w.muell = [stueck(250, 300), stueck(650, 450), stueck(800, 200)]
    kreisUm(w, { x: 250, y: 300 }, 50)
    kreisUm(w, { x: 650, y: 450 }, 50)
    expect(w.auftraege).toHaveLength(2)
    const ereignisse = laufe(w, 4)
    expect(w.zaehler.eingesammelt).toBe(2)
    expect(ereignisse.filter((e) => e === 'plopp')).toHaveLength(2)
    expect(w.kamera.phase).toBe('ruht')
  })

  it('nimmt Müll, den die Kamera schon holt, nicht ein zweites Mal', () => {
    const w = neueWelt(3)
    w.muell = [stueck(300, 300), stueck(800, 200)]
    kreisUm(w, { x: 300, y: 300 }, 50)
    kreisUm(w, { x: 300, y: 300 }, 50)
    expect(w.auftraege).toHaveLength(1)
    expect(w.zaehler.leer).toBe(1)
  })

  it('geht nach dem letzten Stück zum nächsten Abschnitt; die Summen bleiben', () => {
    const w = neueWelt(3)
    w.muell = [stueck(300, 300)]
    kreisUm(w, { x: 300, y: 300 }, 50)
    expect(w.zaehler.muellGesamt).toBe(1)
    const ereignisse = laufe(w, 4)
    expect(ereignisse).toContain('sauber')
    expect(w.nummer).toBe(1)
    expect(w.zaehler.abschnitte).toBe(1)
    expect(w.zaehler.eingesammelt).toBe(1)
    expect(w.muell).toHaveLength(muellJeAbschnitt(3))
    expect(w.muell.every((m) => !m.eingesammelt)).toBe(true)
    // Der neue Abschnitt zählt erst, wenn Ben dort malt.
    expect(w.zaehler.muellGesamt).toBe(1)
    setzeAuf(w, 100, 100, d(), 'mouse')
    expect(w.zaehler.muellGesamt).toBe(1 + muellJeAbschnitt(3))
  })

  it('legt keinen neuen Müll nach, solange der Abschnitt nicht sauber ist (C2)', () => {
    const w = neueWelt(3)
    const vorher = w.muell.length
    laufe(w, 30)
    expect(w.muell).toHaveLength(vorher)
    expect(w.nummer).toBe(0)
  })
})

describe('Lage des Mülls', () => {
  it('ist deterministisch und wechselt von Abschnitt zu Abschnitt', () => {
    expect(legeMuell(3, 4)).toEqual(legeMuell(3, 4))
    expect(legeMuell(3, 5)).not.toEqual(legeMuell(3, 4))
    // Auch derselbe Abschnitt in der zweiten Runde liegt anders.
    expect(legeMuell(3, 5).map((m) => m.x)).not.toEqual(legeMuell(3, 0).map((m) => m.x))
  })

  it('legt je Stufe 6 + s Stücke, alle im Feld, mit einem Konfetti-Häufchen', () => {
    for (let s = 1; s <= 5; s++) {
      const liste = legeMuell(s, 2)
      expect(liste).toHaveLength(muellJeAbschnitt(s))
      expect(liste.filter((m) => m.art === 'konfetti')).toHaveLength(3)
      for (const m of liste) {
        expect(m.x).toBeGreaterThanOrEqual(FELD.x0 - 20)
        expect(m.x).toBeLessThanOrEqual(FELD.x1 + 20)
        expect(m.y).toBeGreaterThanOrEqual(FELD.y0 - 20)
        expect(m.y).toBeLessThanOrEqual(FELD.y1 + 20)
      }
    }
  })

  it('versteckt in jedem zweiten Abschnitt ein Fundstück', () => {
    expect(legeMuell(3, 0).some((m) => m.art === 'fundstueck')).toBe(false)
    expect(legeMuell(3, 1).some((m) => m.art === 'fundstueck')).toBe(true)
  })

  it('macht den Müll mit steigender Stufe kleiner und zahlreicher', () => {
    expect(legeMuell(5, 0)[0].r).toBeLessThan(legeMuell(1, 0)[0].r)
    expect(muellJeAbschnitt(5)).toBeGreaterThan(muellJeAbschnitt(1))
  })
})

describe('Wandern (hand-auge)', () => {
  const konfettiNach = (stufe: number, vorgemerkt = false) => {
    const w = neueWelt(stufe)
    const k = { ...stueck(400, 400, 'konfetti'), vorgemerkt }
    w.muell = [k, stueck(700, 500)]
    laufe(w, 1)
    return Math.hypot(k.x - 400, k.y - 400)
  }

  it('lässt Konfetti erst ab Stufe 3 wandern', () => {
    expect(konfettiNach(2)).toBe(0)
    expect(konfettiNach(4)).toBeGreaterThan(5)
  })

  it('lässt erfasstes Konfetti liegen, bis die Kamera da ist', () => {
    expect(konfettiNach(5, true)).toBe(0)
  })
})

describe('Pause und Schluss', () => {
  it('lässt einen halben Kreis beim Anhalten verfallen, ohne ihn zu zählen', () => {
    const w = neueWelt(3)
    setzeAuf(w, 400, 300, d(), 'mouse')
    for (let i = 1; i <= 20; i++) male(w, 400 + i * 5, 300 + i * 3, d())
    verwirfStrich(w)
    expect(w.strich).toBe(null)
    expect(w.zaehler.kreisversuche).toBe(0)
    expect(male(w, 500, 400, d())).toBe(null)
  })

  it('wartet nach dem Ende der Uhr, bis die Kamera fertig ist', () => {
    const w = neueWelt(3)
    w.muell = [stueck(300, 300), stueck(700, 500)]
    kreisUm(w, { x: 300, y: 300 }, 50)
    beginneSchluss(w)
    expect(istFertig(w)).toBe(false)
    laufe(w, 2)
    expect(w.zaehler.eingesammelt).toBe(1)
    expect(istFertig(w)).toBe(true)
  })

  it('nimmt nach dem Ende der Uhr keinen neuen Strich an', () => {
    const w = neueWelt(3)
    beginneSchluss(w)
    setzeAuf(w, 300, 300, d(), 'mouse')
    expect(w.strich).toBe(null)
    expect(istFertig(w)).toBe(true)
  })

  it('lässt einen angefangenen Strich zu Ende malen, aber nicht ewig', () => {
    const w = neueWelt(3)
    setzeAuf(w, 300, 300, d(), 'mouse')
    beginneSchluss(w)
    laufe(w, 1)
    expect(istFertig(w)).toBe(false)
    laufe(w, NACHSPIEL_SEK)
    expect(istFertig(w)).toBe(true)
  })
})

describe('Hilfe statt Abbruch (C2)', () => {
  it('vergrößert nach drei offenen Kreisen den Leuchtring, die Toleranz bleibt', () => {
    const w = neueWelt(3)
    w.muell = []
    const offen = [{ x: 300, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 400 }]
    for (let i = 0; i < OFFEN_HILFE_AB; i++) zug(w, offen)
    expect(ringGross(w)).toBe(true)
    expect(w.zaehler.hilfen).toBe(1)
    expect(schliessToleranz(3)).toBe(schliessToleranz(w.stufe, w.regler.toleranz))
    kreisUm(w, { x: 300, y: 300 }, 50)
    expect(ringGross(w)).toBe(false)
  })

  it('zeigt nach zwei zu großen Kreisen den Greifer schon beim Aufsetzen', () => {
    const w = neueWelt(3)
    w.muell = [stueck(700, 500)]
    kreisUm(w, { x: 450, y: 350 }, greiferRadius(3) + 20)
    kreisUm(w, { x: 450, y: 350 }, greiferRadius(3) + 20)
    laufe(w, 2)
    setzeAuf(w, 200, 200, d(), 'mouse')
    expect(w.hinweis).toMatchObject({ x: 200, y: 200 })
    expect(w.zaehler.hilfen).toBe(1)
  })
})

describe('Regler (B1)', () => {
  it('verhält sich bei den Vorgaben wie die Stufe allein', () => {
    const w = neueWelt(3, undefined, VORGABE_REGLER)
    expect(schliessToleranz(3, w.regler.toleranz)).toBe(36)
    expect(drift(3, w.regler.zielgeschwindigkeit)).toBe(5)
    expect(greiferRadius(3)).toBe(105)
  })

  it('macht aus einer riesigen Toleranz keinen Kreis aus einem geraden Strich', () => {
    const w = neueWelt(1, undefined, { ...VORGABE_REGLER, toleranz: 20 })
    w.muell = []
    zug(w, [{ x: 200, y: 300 }, { x: 200 + MIN_LAENGE + 5, y: 300 }])
    expect(w.zaehler.geschlossen).toBe(0)
  })

  it('lässt sich auch mit winziger Toleranz noch schließen', () => {
    const w = neueWelt(5, undefined, { ...VORGABE_REGLER, toleranz: 0.01 })
    w.muell = [stueck(400, 300), stueck(700, 500)]
    kreisUm(w, { x: 400, y: 300 }, 50, 64)
    expect(w.zaehler.geschlossen).toBe(1)
  })

  it('begrenzt das Wandertempo, und null hält das Konfetti an', () => {
    expect(drift(5, 100)).toBeLessThanOrEqual(40)
    expect(drift(5, 0)).toBe(0)
  })
})

describe('Ergebnis', () => {
  it('gibt ohne Strich Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, false)
    expect(e.spielId).toBe('muell')
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.genauigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
  })

  it('trägt die Zähler und die Parameter der Stufe in extra', () => {
    const w = neueWelt(3)
    w.muell = [stueck(300, 300), stueck(700, 500)]
    kreisUm(w, { x: 300, y: 300 }, 50)
    zug(w, [{ x: 500, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 400 }])
    laufe(w, 2)
    const e = ergebnis(w, 5000, false)
    expect(e.extra).toMatchObject({
      eingesammelt: 1, kreisversuche: 2, geschlossen: 1, leer: 0, zuGross: 0,
      schliessToleranz: 36, greiferRadius: 105,
    })
    expect(e.genauigkeit).toBe(0.5)
    expect(e.synthetischerDruck).toBe(true)
  })
})
