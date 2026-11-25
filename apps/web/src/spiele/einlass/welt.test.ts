import { describe, expect, it } from 'vitest'
import { hsv } from '../../content/vereine/hsv'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { VORGABE_REGLER } from '../regler'
import {
  BAND_MITTE, FUNKEN_MAX, GEHOLFEN_AB, GEHT_SEK, GNADE, HILFE_AB, HUEPF_SEK, KISTE, KOMMT_SEK,
  NACHSPIEL_SEK, REIHEN, TASCHE, TREFFSAUM,
  aktualisiere, anzahlErlaubt, anzahlVerboten, bandOben, bandUnten, beginneSchluss, bewege,
  ergebnis, greifzeit, halbesBand, hebeAb, hilfeFuer, istFertig, kisteRadius, legeZurueck,
  mindestabstand, neueWelt, objektRadius, packeTasche, setzeAuf, spielerDerTasche, stelleDruck,
  urteil, type Ding, type Ereignis, type Gewicht, type Welt,
} from './welt'

const STUFEN = [1, 2, 3, 4, 5]
const DT = 1 / 120

/** Andruck eines Pencils. */
const stift = (wert: number): Druck => ({ wert, synthetisch: false })
/** Andruck, wie ihn Maus und Finger liefern. */
const ersatz = (wert: number): Druck => ({ wert, synthetisch: true })

/** Lässt Zeit vergehen und sammelt, was gemeldet wurde. */
function laufe(w: Welt, sekunden: number): Ereignis[] {
  const gemeldet: Ereignis[] = []
  for (let i = 0; i < Math.round(sekunden / DT); i++) {
    const e = aktualisiere(w, DT)
    if (e) gemeldet.push(e)
  }
  return gemeldet
}

/** Eine Welt, in der die erste Tasche schon auf dem Tisch steht. */
function bereit(stufe = 3, verein = hsv, regler = VORGABE_REGLER) {
  const w = neueWelt(stufe, verein, regler)
  laufe(w, KOMMT_SEK + 0.1)
  expect(w.phase).toBe('kontrolle')
  return w
}

const markiert = (w: Welt, gewicht?: Gewicht): Ding => {
  const d = w.dinge.find((x) => x.gewicht && !x.abgegeben && (!gewicht || x.gewicht === gewicht))
  if (!d) throw new Error('kein markiertes Ding mehr da')
  return d
}

const passend = (d: Ding) => {
  if (!d.gewicht) throw new Error('lässt sich nicht greifen')
  return BAND_MITTE[d.gewicht]
}

/** Aufsetzen und mit passendem Druck halten, bis das Ding am Stift hängt. */
function greife(w: Welt, d: Ding, druck = stift(passend(d)), geraet: Eingabegeraet = 'pen') {
  setzeAuf(w, d.x, d.y, druck, geraet)
  laufe(w, greifzeit(w.stufe) + 0.05)
}

/** Ein ganzer gelungener Griff. */
function lege(w: Welt, d: Ding, druck = stift(passend(d)), geraet: Eingabegeraet = 'pen') {
  greife(w, d, druck, geraet)
  bewege(w, KISTE.x, KISTE.y, druck)
  return hebeAb(w)
}

function leere(w: Welt) {
  while (w.dinge.some((d) => d.gewicht && !d.abgegeben)) lege(w, markiert(w))
}

/** Ein Griff mit viel zu wenig Druck. */
function greifeZuLeicht(w: Welt, d: Ding) {
  setzeAuf(w, d.x, d.y, stift(0.01), 'pen')
  laufe(w, GNADE + 0.1)
  return hebeAb(w)
}

describe('Stufe (B1)', () => {
  it('macht Dinge und Kiste kleiner, die Bänder schmaler und die Greifzeit länger', () => {
    for (const s of [2, 3, 4, 5]) {
      expect(objektRadius(s)).toBeLessThan(objektRadius(s - 1))
      expect(kisteRadius(s)).toBeLessThan(kisteRadius(s - 1))
      expect(halbesBand(s)).toBeLessThan(halbesBand(s - 1))
      expect(greifzeit(s)).toBeGreaterThan(greifzeit(s - 1))
    }
  })

  it('verlangt ab Stufe 3 zwei verschiedene Drücke, darunter reicht einer', () => {
    const einerReicht = (s: number) => bandUnten(s, 'schwer') <= bandOben(s, 'leicht')
    expect(STUFEN.filter(einerReicht)).toEqual([1, 2])
  })

  it('macht das Band mit der Toleranz von Thomas weiter', () => {
    const w = bereit(3, hsv, { ...VORGABE_REGLER, toleranz: 2 })
    const d = markiert(w, 'leicht')
    // 0,5 liegt auf Stufe 3 neben dem leichten Band, mit doppelter Toleranz darin.
    expect(urteil(0.5, 3, 'leicht')).toBe('zu-fest')
    greife(w, d, stift(0.5))
    expect(w.griff?.gegriffen).toBe(true)
  })

  it('ist auf jeder Stufe mit den Zifferntasten 3 und 6 spielbar', () => {
    for (const s of STUFEN) {
      expect(urteil(0.3, s, 'leicht')).toBe('gut')
      expect(urteil(0.6, s, 'schwer')).toBe('gut')
    }
  })
})

describe('Inhalt der Taschen', () => {
  it('ist ohne Zufall und wechselt von Tasche zu Tasche', () => {
    expect(packeTasche(3, 4)).toEqual(packeTasche(3, 4))
    expect(packeTasche(3, 5)).not.toEqual(packeTasche(3, 4))
  })

  it('packt auf jeder Stufe genug Dinge mit Abstand und im Innern der Tasche', () => {
    for (const s of STUFEN) {
      for (let n = 0; n < 30; n++) {
        const dinge = packeTasche(s, n)
        expect(dinge.filter((d) => d.gewicht)).toHaveLength(anzahlVerboten(s))
        expect(dinge.filter((d) => !d.gewicht)).toHaveLength(anzahlErlaubt(s))
        for (const a of dinge) {
          const r = objektRadius(s)
          expect(a.x - r).toBeGreaterThan(TASCHE.x)
          expect(a.x + r).toBeLessThan(TASCHE.x + TASCHE.b)
          expect(a.y - r).toBeGreaterThan(TASCHE.y)
          expect(a.y + r).toBeLessThan(TASCHE.y + TASCHE.h)
          for (const b of dinge) {
            if (a === b) continue
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(mindestabstand(s))
          }
        }
      }
    }
  })

  it('mischt in jeder Tasche schwere und leichte Dinge (B3)', () => {
    for (const s of STUFEN) {
      for (let n = 0; n < 12; n++) {
        const gewichte = new Set(packeTasche(s, n).map((d) => d.gewicht))
        expect(gewichte).toContain('schwer')
        expect(gewichte).toContain('leicht')
      }
    }
  })

  it('zeigt über die Taschen hinweg jedes Ding', () => {
    const arten = new Set<string>()
    for (let n = 0; n < 12; n++) for (const d of packeTasche(3, n)) arten.add(d.art)
    expect(arten.size).toBe(12)
  })
})

describe('Greifen', () => {
  it('hält erst nach der vollen Greifzeit im Band', () => {
    const w = bereit()
    const d = markiert(w)
    expect(setzeAuf(w, d.x, d.y, stift(passend(d)), 'pen')).toBe('aufgesetzt')
    laufe(w, greifzeit(3) - 0.05)
    expect(w.griff?.gegriffen).toBe(false)
    expect(laufe(w, 0.1)).toEqual(['gegriffen'])
    expect(w.griff?.gegriffen).toBe(true)
  })

  it('füllt den Ring nicht, solange der Druck daneben liegt', () => {
    const w = bereit()
    const d = markiert(w, 'leicht')
    setzeAuf(w, d.x, d.y, stift(0.9), 'pen')
    laufe(w, 1)
    expect(w.griff?.gutZeit).toBe(0)
    // Findet Ben den Druck dann doch, geht es ohne neues Aufsetzen weiter (C2).
    bewege(w, d.x, d.y, stift(passend(d)))
    laufe(w, greifzeit(3) + 0.05)
    expect(w.griff?.gegriffen).toBe(true)
  })

  it('bricht ab, wenn der Stift das Ding vorher verlässt', () => {
    const w = bereit()
    const d = markiert(w)
    setzeAuf(w, d.x, d.y, stift(passend(d)), 'pen')
    bewege(w, d.x + objektRadius(3) + TREFFSAUM + 1, d.y, stift(passend(d)))
    expect(w.griff).toBeNull()
    expect(w.griffe.at(-1)?.art).toBe('zurueck')
  })

  it('zählt ein Aufsetzen neben allen Dingen nur als daneben', () => {
    const w = bereit()
    setzeAuf(w, 20, 600, stift(0.5), 'pen')
    expect(w.griff).toBeNull()
    expect(w.daneben).toBe(1)
  })

  it('lässt Erlaubtes nur wackeln', () => {
    const w = bereit()
    const d = w.dinge.find((x) => !x.gewicht)!
    expect(setzeAuf(w, d.x, d.y, stift(0.5), 'pen')).toBeNull()
    expect(w.griff).toBeNull()
    expect(w.erlaubtBeruehrt).toBe(1)
    expect(d.wackelUhr).toBeGreaterThan(0)
  })

  it('nimmt bei zwei Dingen im Treffsaum das nähere', () => {
    const w = bereit()
    const [a, b] = w.dinge.filter((d) => d.gewicht)
    b.x = a.x + 30
    b.y = a.y
    setzeAuf(w, a.x + 20, a.y, stift(0.5), 'pen')
    expect(w.griff?.ding).toBe(b)
  })
})

describe('Halten, Loslassen, Ablegen', () => {
  it('verzeiht eine kurze Druckspitze und lässt erst danach los', () => {
    const w = bereit()
    const d = markiert(w)
    greife(w, d)
    bewege(w, 250, 200, stift(0.01))
    laufe(w, GNADE - 0.05)
    expect(w.griff?.gegriffen).toBe(true)
    expect(laufe(w, 0.1)).toEqual(['gefallen'])
    expect(w.griffe.at(-1)?.art).toBe('abgerutscht')
    // C2: es liegt wieder an seinem Platz, nichts ist weg.
    expect(d.abgegeben).toBe(false)
    laufe(w, HUEPF_SEK + 0.1)
    expect(d.huepfer).toBeNull()
  })

  it('lässt ein zu fest gedrücktes Ding wegflutschen', () => {
    const w = bereit()
    greife(w, markiert(w))
    bewege(w, 250, 200, stift(1))
    laufe(w, GNADE + 0.05)
    expect(w.griffe.at(-1)?.art).toBe('geflutscht')
  })

  it('legt beim Abheben über der Kiste ab', () => {
    const w = bereit()
    const d = markiert(w)
    expect(lege(w, d)).toBe('abgelegt')
    expect(d.abgegeben).toBe(true)
    expect(w.griffe.at(-1)).toMatchObject({ art: 'abgelegt', ablage: KISTE, aufsetzen: { x: d.x, y: d.y } })
    expect(w.griffe.at(-1)?.greifDruck).toBeCloseTo(passend(d))
    expect(w.funken.length).toBeGreaterThan(0)
  })

  it('legt auch ab, wenn über der Kiste nur der Druck nachlässt', () => {
    const w = bereit()
    const d = markiert(w)
    greife(w, d)
    bewege(w, KISTE.x, KISTE.y, stift(passend(d)))
    bewege(w, KISTE.x, KISTE.y, stift(0.01))
    expect(laufe(w, GNADE + 0.05)).toContain('abgelegt')
  })

  it('bringt das Ding beim Abheben neben der Kiste zurück', () => {
    const w = bereit()
    const d = markiert(w)
    greife(w, d)
    bewege(w, 300, 190, stift(passend(d)))
    expect(hebeAb(w)).toBe('gefallen')
    expect(w.griffe.at(-1)?.art).toBe('zurueck')
    expect(d.abgegeben).toBe(false)
    expect(lege(w, d)).toBe('abgelegt')
  })

  it('übersieht den Nulldruck, den der Stift beim Abheben meldet', () => {
    const w = bereit()
    const d = markiert(w, 'leicht')
    greife(w, d)
    bewege(w, KISTE.x, KISTE.y, ersatz(0.5))
    expect(w.griff?.druck).toBeCloseTo(0.3)
    expect(w.synthetisch).toBe(false)
  })

  it('reagiert mit der Maus sofort auf eine Zifferntaste', () => {
    const w = bereit()
    const d = markiert(w, 'leicht')
    setzeAuf(w, d.x, d.y, ersatz(0.5), 'mouse')
    laufe(w, 0.3)
    expect(w.griff?.gegriffen).toBe(false)
    stelleDruck(w, ersatz(0.3))
    laufe(w, greifzeit(3) + 0.05)
    expect(w.griff?.gegriffen).toBe(true)
    expect(w.synthetisch).toBe(true)
  })

  it('verlangt vom Finger keinen Druck und sagt das im Ergebnis', () => {
    const w = bereit()
    expect(lege(w, markiert(w, 'leicht'), ersatz(0.5), 'touch')).toBe('abgelegt')
    expect(ergebnis(w, 1000, false).extra.druckGeprueft).toBe(false)
  })

  it('legt beim Anhalten alles zurück, ohne es als Fehlversuch zu zählen', () => {
    const w = bereit()
    const d = markiert(w)
    greife(w, d)
    bewege(w, KISTE.x, KISTE.y, stift(passend(d)))
    legeZurueck(w)
    expect(w.griff).toBeNull()
    expect(d.abgegeben).toBe(false)
    expect(d.fehlversuche).toBe(0)
    // Weiterspielen ohne neues Aufsetzen bewegt nichts mehr.
    bewege(w, 400, 400, stift(passend(d)))
    expect(w.griff).toBeNull()
  })
})

describe('Hilfe statt Abbruch (C2)', () => {
  it('zeigt nach drei Fehlversuchen den Druckbalken und legt nach fünf selbst ab', () => {
    const w = bereit()
    const d = markiert(w)
    for (let i = 1; i <= GEHOLFEN_AB; i++) {
      expect(hilfeFuer(w)).toBe(i > HILFE_AB ? d : null)
      greifeZuLeicht(w, d)
    }
    expect(d.abgegeben).toBe(true)
    const e = ergebnis(w, 1000, false)
    expect(e.extra).toMatchObject({ geholfen: 1, abgelegt: 0, abgerutscht: GEHOLFEN_AB })
    expect(w.griffe.at(-1)?.art).toBe('geholfen')
  })

  it('macht die Toleranz dabei nicht heimlich weiter', () => {
    const w = bereit()
    const d = markiert(w, 'leicht')
    for (let i = 0; i < HILFE_AB; i++) greifeZuLeicht(w, d)
    greife(w, d, stift(bandOben(3, 'leicht') + 0.02))
    expect(w.griff?.gegriffen).toBe(false)
  })
})

describe('Taschen und Tribüne', () => {
  it('schickt nach dem letzten Ding den Fan weiter und bringt die nächste Tasche', () => {
    const w = bereit()
    leere(w)
    expect(laufe(w, 0.05)).toContain('tascheLeer')
    expect(w.phase).toBe('geht')
    expect(w.taschen).toBe(1)
    // Solange nimmt der Tisch nichts an und zählt auch nichts.
    const vorher = w.aufsetzer
    setzeAuf(w, 500, 400, stift(0.5), 'pen')
    expect(w.aufsetzer).toBe(vorher)

    laufe(w, GEHT_SEK + KOMMT_SEK + 0.1)
    expect(w.phase).toBe('kontrolle')
    expect(w.dinge).toEqual(packeTasche(3, 1))
  })

  it('gibt jede vierte Tasche einem Spieler, der Kader wiederholt sich', () => {
    const w = neueWelt(3, hsv)
    const spielerBei = (n: number) => {
      w.nummer = n
      return spielerDerTasche(w)
    }
    expect([0, 1, 2].map(spielerBei)).toEqual([null, null, null])
    expect(spielerBei(3)).toBe(hsv.kader[0])
    expect(spielerBei(7)).toBe(hsv.kader[1])
    expect(spielerBei(3 + 4 * hsv.kader.length)).toBe(hsv.kader[0])
  })

  it('jubelt einmal, wenn die Tribüne voll ist', () => {
    const w = bereit()
    w.taschen = REIHEN - 1
    leere(w)
    laufe(w, 0.05)
    expect(w.laolaUhr).toBeGreaterThan(0)
  })

  it('begrenzt die Funken und lässt sie bei wenig Bewegung weg', () => {
    const w = bereit(5)
    leere(w)
    expect(w.funken.length).toBeLessThanOrEqual(FUNKEN_MAX)
    const ruhig = bereit(5)
    ruhig.wenigerBewegung = true
    lege(ruhig, markiert(ruhig))
    expect(ruhig.funken).toHaveLength(0)
  })
})

describe('Ende an einem sauberen Moment', () => {
  it('lässt einen laufenden Griff zu Ende gehen', () => {
    const w = bereit()
    const d = markiert(w)
    greife(w, d)
    beginneSchluss(w)
    laufe(w, 0.5)
    expect(istFertig(w)).toBe(false)
    bewege(w, KISTE.x, KISTE.y, stift(passend(d)))
    hebeAb(w)
    laufe(w, HUEPF_SEK + 0.1)
    expect(istFertig(w)).toBe(true)
    expect(ergebnis(w, 1000, false).extra.abgelegt).toBe(1)
  })

  it('nimmt danach keinen neuen Griff mehr an', () => {
    const w = bereit()
    beginneSchluss(w)
    const d = markiert(w)
    setzeAuf(w, d.x, d.y, stift(0.5), 'pen')
    expect(w.griff).toBeNull()
    expect(istFertig(w)).toBe(true)
  })

  it('wartet nicht endlos auf einen festgehaltenen Stift', () => {
    const w = bereit()
    greife(w, markiert(w))
    beginneSchluss(w)
    laufe(w, NACHSPIEL_SEK + HUEPF_SEK + 0.2)
    expect(istFertig(w)).toBe(true)
  })

  it('lässt den Fan noch durchs Drehkreuz', () => {
    const w = bereit()
    leere(w)
    beginneSchluss(w)
    laufe(w, HUEPF_SEK + 0.1)
    expect(istFertig(w)).toBe(false)
    laufe(w, GEHT_SEK)
    expect(istFertig(w)).toBe(true)
  })
})

describe('Ergebnis', () => {
  it('liefert ohne jeden Griff Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(2), 1234, true)
    expect(e).toMatchObject({
      spielId: 'einlass', dauerMs: 1234, vollstaendigkeit: 0, genauigkeit: 0,
      druckMittel: 0, druckStreuung: 0, stufe: 2, abgebrochen: true,
    })
  })

  it('rechnet nur begonnene Taschen an und meldet die Messwerte der Griffe', () => {
    const w = bereit()
    leere(w)
    laufe(w, GEHT_SEK + KOMMT_SEK + 0.2)
    // Die zweite Tasche steht da, ist aber unberührt.
    const e = ergebnis(w, 1000, false)
    expect(e.vollstaendigkeit).toBe(1)
    expect(e.genauigkeit).toBe(1)
    expect(e.synthetischerDruck).toBe(false)
    expect(e.extra).toMatchObject({
      taschen: 1, abgelegt: 3, aufsetzer: 3, daneben: 0, objektRadius: 25, kisteRadius: 71,
      greifzeitMs: 400, druckGeprueft: true,
    })
    expect(e.extra.griffe).toHaveLength(3)
  })
})
