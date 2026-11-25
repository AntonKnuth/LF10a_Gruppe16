import { describe, expect, it } from 'vitest'
import { hsv } from '../../content/vereine/hsv'
import type { Druck } from '../../eingabe'
import { VORGABE_REGLER } from '../regler'
import {
  ABPFIFF_SEK, ANLAUF, BALL, BALL_R, BAELLE_JE_RUNDE, KREIS_R, LOCKERN_SEK, NACHLEGEN_SEK,
  REAKTION_SEK, REICHWEITE, abheben, abstand, aktualisiere, aufsetzen, beginneAbpfiff, cvGrenze,
  dekoAus, ergebnis, fenster, hoehe, istWappen, neueWelt, sprungZiel, treffpunkt, urteil, verwirf,
  ziehe, ziel, zielName, zielRadius, type Welt,
} from './welt'

const stift = (wert = 0.5): Druck => ({ wert, synthetisch: false })

const laufe = (w: Welt, sekunden: number) => {
  for (let i = 0; i < Math.round(sekunden * 60); i++) aktualisiere(w, 1 / 60)
}

/** Läuft, bis der nächste Ball bereitliegt — höchstens 15 Sekunden. */
const bisBereit = (w: Welt) => {
  for (let i = 0; i < 15 * 60 && w.phase !== 'bereit'; i++) aktualisiere(w, 1 / 60)
}

type Strich = {
  /** Dauer des Anlaufs vom Ballrand bis zum Schusskreis. */
  dauer?: number
  grad?: number
  /** Andruck je Strecke: 0 am Ballrand, 1 am Schusskreis. */
  druck?: (u: number) => number
  /** Bis zu diesem Abstand vom Ball wird gezogen. */
  bis?: number
  synthetisch?: boolean
  /** So lange bleibt der Stift vorher auf dem Ball liegen. */
  warten?: number
}

/** Zieht einen gleichmäßigen Strich aus der Ballmitte. */
function strich(w: Welt, s: Strich = {}) {
  const { dauer = 300, grad = 0, druck = () => 0.5, bis = KREIS_R + 20, synthetisch = false, warten = 0 } = s
  const winkel = (grad * Math.PI) / 180
  const d = (u: number): Druck => ({ wert: druck(u), synthetisch })
  aufsetzen(w, BALL.x, BALL.y, d(0), 'pen', 0)
  for (let r = 4; r <= bis; r += 4) {
    const t = warten + ((r - BALL_R) / ANLAUF) * dauer + 1000
    ziehe(w, BALL.x + Math.sin(winkel) * r, BALL.y - Math.cos(winkel) * r, d((r - BALL_R) / ANLAUF), t)
  }
  abheben(w)
}

/** Ein Schuss samt Reaktion und Nachlegen. */
const schuss = (w: Welt, s: Strich = {}) => {
  strich(w, s)
  bisBereit(w)
}

/** Eine Dauer, die sicher zu langsam ist. */
const LAHM = 1500

describe('Urteil', () => {
  it('wertet Tempo im Fenster, Richtung ins Tor und gleichmäßigen Druck als Tor', () => {
    expect(urteil(3, 300, 0, 0.05)).toBe('tor')
  })

  it('nennt je Fehler seine Ursache', () => {
    expect(urteil(3, 50, 0, 0)).toBe('drueber')
    expect(urteil(3, 300, 60, 0)).toBe('vorbei')
    expect(urteil(3, 900, 0, 0)).toBe('gehalten')
    expect(urteil(3, 300, 0, 0.5)).toBe('abgewehrt')
  })

  it('nennt nur eine Ursache, auch wenn zwei Dinge nicht passen', () => {
    expect(urteil(3, 50, 60, 0.5)).toBe('drueber')
    expect(urteil(3, 900, 60, 0.5)).toBe('vorbei')
  })

  it('lässt den schnelleren Strich höher fliegen', () => {
    expect(treffpunkt(3, 200, 0).y).toBeLessThan(treffpunkt(3, 500, 0).y)
    expect(hoehe(3, 100)).toBeCloseTo(1)
    expect(hoehe(3, 640)).toBeCloseTo(0)
  })

  it('trifft die Marke, wenn der Strich auf sie zeigt und das Tempo passt', () => {
    const w = neueWelt(3)
    const z = ziel(w)
    const grad = (Math.atan2(z.x - BALL.x, BALL.y - z.y) * 180) / Math.PI
    // Die erste Marke bei Stufe 3 liegt unten: zügig, aber nicht zu schnell.
    expect(zielName(w)).toBe('ul')
    strich(w, { dauer: 540, grad })
    expect(abstand(w.treff, z)).toBeLessThan(zielRadius(3))
    bisBereit(w)
    expect(ergebnis(w, 0, false).extra).toMatchObject({ tore: 1, winkel: 1 })
  })
})

describe('Stufe', () => {
  it('wird mit steigender Stufe enger', () => {
    expect(fenster(5).max).toBeLessThan(fenster(1).max)
    expect(fenster(5).min).toBeGreaterThan(fenster(1).min)
    expect(cvGrenze(5)).toBeLessThan(cvGrenze(1))
    expect(zielRadius(5)).toBeLessThan(zielRadius(1))
  })

  it('regelt sich während des Spiels nicht selbst nach', () => {
    const w = neueWelt(3)
    for (let i = 0; i < 20; i++) schuss(w, { dauer: i % 2 ? LAHM : 300 })
    expect(w.liste).toHaveLength(20)
    expect(w.stufe).toBe(3)
    expect(fenster(w.stufe, w.regler)).toEqual(fenster(3))
  })
})

describe('Strich', () => {
  it('beginnt nur am Ball', () => {
    const w = neueWelt(3)
    expect(aufsetzen(w, BALL.x + REICHWEITE + 10, BALL.y, stift(), 'pen', 0)).toBe(false)
    abheben(w)
    expect(w.ansaetze).toBe(0)
    expect(w.puff.uhr).toBeGreaterThan(0)
  })

  it('schießt schon beim Verlassen des Kreises, nicht erst beim Abheben', () => {
    const w = neueWelt(3)
    aufsetzen(w, BALL.x, BALL.y, stift(), 'pen', 0)
    ziehe(w, BALL.x, BALL.y - 100, stift(), 100)
    expect(ziehe(w, BALL.x, BALL.y - KREIS_R - 5, stift(), 200)).toBe('schuss')
    expect(w.phase).toBe('flug')
  })

  it('schießt nicht zur Seite oder nach unten', () => {
    const w = neueWelt(3)
    strich(w, { grad: 180 })
    expect(w.liste).toHaveLength(0)
    expect(w.ansaetze).toBe(1)
    expect(w.phase).toBe('bereit')
    expect(w.ansage).toBe('Zieh Richtung Tor!')
  })

  it('misst nur den Anlauf — langes Zielen auf dem Ball zählt nicht als langsam', () => {
    const w = neueWelt(3)
    strich(w, { dauer: 300, warten: 2000 })
    expect(w.liste[0].dauerMs).toBeGreaterThan(285)
    expect(w.liste[0].dauerMs).toBeLessThan(315)
  })

  it('misst gleich, egal wie grob die Abtastung ist', () => {
    const w = neueWelt(3)
    aufsetzen(w, BALL.x, BALL.y, stift(), 'mouse', 0)
    // Die Maus liegt zwei Sekunden still und meldet solange nichts.
    for (let i = 0; i <= 6; i++) {
      ziehe(w, BALL.x, BALL.y - 30 - i * 30, stift(), 2000 + i * 66)
    }
    // 30 Pixel in 66 ms sind rund 299 ms für die 136 Pixel Anlauf.
    expect(w.liste[0].dauerMs).toBeCloseTo(299, -1)
  })

  it('wertet ein Wegwischen ohne Abtastung unterwegs als zu schnell', () => {
    const w = neueWelt(3)
    aufsetzen(w, BALL.x, BALL.y, stift(), 'mouse', 0)
    ziehe(w, BALL.x, BALL.y - 300, stift(), 8)
    expect(w.urteil).toBe('drueber')
    expect(w.liste[0].druckCv).toBe(0)
  })

  it('lässt auch neben der Ballmitte aufsetzen, ohne die Richtung zu verziehen', () => {
    const w = neueWelt(3)
    aufsetzen(w, BALL.x + 45, BALL.y, stift(), 'pen', 0)
    for (let i = 1; i <= 20; i++) ziehe(w, BALL.x + 45, BALL.y - i * 10, stift(), i * 20)
    expect(w.liste[0].richtungGrad).toBeCloseTo(0)
    expect(w.liste[0].urteil).toBe('tor')
  })

  it('lässt den Druckanstieg beim Aufsetzen aus der Schwankung heraus', () => {
    const w = neueWelt(3)
    strich(w, { druck: (u) => (u < 0.28 ? 0.1 + Math.max(0, u) : 0.6) })
    expect(w.liste[0].druckCv).toBeCloseTo(0)
    expect(w.liste[0].urteil).toBe('tor')
  })

  it('erkennt schwankenden Druck', () => {
    const w = neueWelt(3)
    strich(w, { druck: (u) => (u < 0.65 ? 0.2 : 0.9) })
    expect(w.liste[0].urteil).toBe('abgewehrt')
  })

  it('zählt Abheben vor dem Kreis als Ansatz ohne Schuss', () => {
    const w = neueWelt(3)
    strich(w, { bis: 100 })
    expect(w.phase).toBe('bereit')
    expect(w.ansage).toBe('Zieh bis über den Kreis!')
    strich(w)
    expect(ergebnis(w, 0, false).vollstaendigkeit).toBeCloseTo(0.5)
  })

  it('zählt einen verworfenen Strich nicht — Anhalten war kein Zögern', () => {
    const w = neueWelt(3)
    aufsetzen(w, BALL.x, BALL.y, stift(), 'pen', 0)
    ziehe(w, BALL.x, BALL.y - 80, stift(), 50)
    verwirf(w)
    abheben(w)
    expect(w.ansaetze).toBe(0)
    expect(w.phase).toBe('bereit')
  })

  it('nimmt während des Flugs keinen neuen Strich an', () => {
    const w = neueWelt(3)
    strich(w)
    expect(aufsetzen(w, BALL.x, BALL.y, stift(), 'pen', 5000)).toBe(false)
    expect(w.phase).toBe('flug')
  })
})

describe('Kein Verliererzustand (C2)', () => {
  it('legt nach einem gehaltenen Ball sofort den nächsten hin', () => {
    const w = neueWelt(3)
    strich(w, { dauer: LAHM })
    laufe(w, 0.6 + REAKTION_SEK + NACHLEGEN_SEK)
    expect(w.phase).toBe('bereit')
  })

  it('nimmt nie ein Tor zurück', () => {
    const w = neueWelt(3)
    let vorher = 0
    for (let i = 0; i < 12; i++) {
      schuss(w, { dauer: i % 3 === 0 ? 300 : LAHM, grad: i % 3 === 1 ? 60 : 0 })
      expect(w.tore).toBeGreaterThanOrEqual(vorher)
      vorher = w.tore
    }
    expect(w.tore).toBe(4)
  })

  it('zeigt die Hilfe nach drei Schüssen ohne Tor, nicht schon nach zwei', () => {
    const w = neueWelt(3)
    schuss(w, { dauer: LAHM })
    schuss(w, { dauer: LAHM })
    expect(w.hilfe).toBe(false)
    schuss(w, { dauer: LAHM })
    expect(w.hilfe).toBe(true)
    // Die Anforderung bleibt dieselbe, nur die Hilfe steht dabei.
    schuss(w)
    expect(w.liste.map((s) => s.hilfe)).toEqual([false, false, false, true])
    expect(w.liste[3].urteil).toBe('tor')
    expect(w.fehlInFolge).toBe(0)
  })

  it('lässt den Torwart vorhersagbar springen', () => {
    expect(sprungZiel('gehalten', { x: 520, y: 310 }).x).toBe(520)
    expect(sprungZiel('abgewehrt', { x: 380, y: 200 }).x).toBe(380)
    expect(sprungZiel('tor', { x: 600, y: 200 }).x).toBeLessThan(450)
    expect(sprungZiel('tor', { x: 300, y: 200 }).x).toBeGreaterThan(450)
    expect(sprungZiel('tor', { x: 450, y: 200 }).x).toBeLessThan(450)
  })
})

describe('Runden', () => {
  it('hat in zwei Welten dieselbe Zielfolge', () => {
    const folge = (stufe: number) => {
      const w = neueWelt(stufe)
      const namen: string[] = []
      for (let i = 0; i < 10; i++) {
        namen.push(zielName(w))
        schuss(w)
      }
      return namen
    }
    expect(folge(3)).toEqual(folge(3))
    expect(new Set(folge(1))).toEqual(new Set(['links', 'mitte', 'rechts']))
    expect(new Set(folge(3)).size).toBe(5)
  })

  it('macht den fünften Ball zum Wappenschuss und lockert danach die Hand (B3)', () => {
    const w = neueWelt(3)
    for (let i = 0; i < BAELLE_JE_RUNDE - 1; i++) schuss(w)
    expect(istWappen(w)).toBe(true)
    strich(w)
    laufe(w, 0.6 + REAKTION_SEK)
    expect(w.phase).toBe('lockern')
    expect(w.liste.map((s) => s.wappen)).toEqual([false, false, false, false, true])
    laufe(w, LOCKERN_SEK + NACHLEGEN_SEK + 0.1)
    expect(w.phase).toBe('bereit')
    expect(istWappen(w)).toBe(false)
  })
})

describe('Ende', () => {
  it('lässt den Ball zu Ende fliegen und pfeift dann ab', () => {
    const w = neueWelt(3)
    strich(w)
    beginneAbpfiff(w)
    aktualisiere(w, 1 / 60)
    expect(w.phase).toBe('flug')
    laufe(w, 0.6 + REAKTION_SEK)
    expect(w.phase).toBe('abpfiff')
    expect(w.tore).toBe(1)
    expect(w.fertig).toBe(false)
    laufe(w, ABPFIFF_SEK + 0.1)
    expect(w.fertig).toBe(true)
  })

  it('lässt einen angefangenen Strich noch zu, wartet aber nicht ewig', () => {
    const w = neueWelt(3)
    aufsetzen(w, BALL.x, BALL.y, stift(), 'pen', 0)
    beginneAbpfiff(w)
    laufe(w, 1)
    expect(w.phase).toBe('zieht')
    laufe(w, 3)
    expect(w.phase).toBe('abpfiff')
  })

  it('jubelt am Ende unabhängig vom Ergebnis (C3)', () => {
    const gut = neueWelt(3)
    schuss(gut)
    const schlecht = neueWelt(3)
    schuss(schlecht, { dauer: LAHM })
    for (const w of [gut, schlecht]) {
      beginneAbpfiff(w)
      aktualisiere(w, 1 / 60)
    }
    expect(gut.blase).toEqual(schlecht.blase)
  })

  it('rechnet den Schlussjubel nicht zur Spielzeit', () => {
    const w = neueWelt(3)
    laufe(w, 1)
    beginneAbpfiff(w)
    laufe(w, ABPFIFF_SEK + 1)
    expect(w.zeitGesamt).toBeCloseTo(1, 1)
  })
})

describe('Ergebnis', () => {
  it('liefert ohne einen einzigen Schuss Nullen statt NaN', () => {
    const e = ergebnis(neueWelt(3), 0, true)
    expect(e.genauigkeit).toBe(0)
    expect(e.vollstaendigkeit).toBe(0)
    expect(e.druckMittel).toBe(0)
    expect(e.abgebrochen).toBe(true)
  })

  it('markiert Ersatzdruck als synthetisch und bleibt damit spielbar', () => {
    const w = neueWelt(5)
    strich(w, { dauer: 270, synthetisch: true })
    const e = ergebnis(w, 100, false)
    expect(e.synthetischerDruck).toBe(true)
    expect(e.stufe).toBe(5)
    // Konstanter Ersatzdruck schwankt nicht, ein Tor ist also auch mit der Maus möglich.
    expect(w.urteil).toBe('tor')
  })

  it('legt Messfakten je Schuss in extra ab', () => {
    const w = neueWelt(3)
    strich(w, { dauer: 300, grad: 10 })
    const { liste } = ergebnis(w, 0, false).extra as { liste: Welt['liste'] }
    expect(liste[0]).toMatchObject({ nr: 1, ziel: 'ul', wappen: false, hilfe: false, urteil: 'tor' })
    expect(liste[0].richtungGrad).toBeCloseTo(10)
    expect(liste[0].zielGrad).toBeLessThan(0)
    expect(liste[0].druckMittel).toBeCloseTo(0.5)
  })
})

describe('Verein', () => {
  it('stellt den Torwart des Vereins ins Tor', () => {
    expect(dekoAus(hsv)).toMatchObject({ torwart: 'Daniel', kuerzel: 'HSV', primaer: '#0a3a82' })
    expect(neueWelt(3, hsv).blase?.text).toContain('Daniel')
  })

  it('kommt ohne Nummer 1 und ohne Sprüche aus', () => {
    const leer = { ...hsv, kader: [], sprueche: [] }
    expect(dekoAus(leer).torwart).toBe('Torwart')

    // Stufe 1, fünf Schüsse auf die jeweilige Marke: der letzte trifft das Wappen.
    const w = neueWelt(1, leer)
    for (let i = 0; i < BAELLE_JE_RUNDE; i++) {
      const z = ziel(w)
      schuss(w, { dauer: 400, grad: (Math.atan2(z.x - BALL.x, BALL.y - z.y) * 180) / Math.PI })
    }
    expect(w.wappentreffer).toBe(1)
  })

  it('zeigt beim Wappentreffer einen Spruch mit Übersetzung', () => {
    const w = neueWelt(1, { ...hsv, sprueche: [hsv.sprueche[3]] })
    for (let i = 0; i < BAELLE_JE_RUNDE - 1; i++) schuss(w)
    const z = ziel(w)
    strich(w, { dauer: 400, grad: (Math.atan2(z.x - BALL.x, BALL.y - z.y) * 180) / Math.PI })
    laufe(w, 0.6)
    expect(w.blase).toMatchObject({ text: 'Dat löppt!', klein: 'Das läuft!' })
  })
})

describe('Regler (B1)', () => {
  it('verhält sich bei den Vorgaben wie die Stufe allein', () => {
    expect(fenster(3, VORGABE_REGLER)).toEqual({ min: 100, max: 640 })
    expect(zielRadius(3, VORGABE_REGLER)).toBe(65)
    expect(cvGrenze(3, VORGABE_REGLER)).toBeCloseTo(0.22)
  })

  it('macht mit mehr Toleranz Fenster, Druckgrenze und Marke größer', () => {
    const weit = { ...VORGABE_REGLER, toleranz: 1.5 }
    expect(urteil(3, 700, 0, 0)).toBe('gehalten')
    expect(urteil(3, 700, 0, 0, weit)).toBe('tor')
    expect(urteil(3, 300, 0, 0.3)).toBe('abgewehrt')
    expect(urteil(3, 300, 0, 0.3, weit)).toBe('tor')
    expect(zielRadius(3, weit)).toBeGreaterThan(zielRadius(3))
  })

  it('lässt das Fenster auch bei kleinster Toleranz nicht umklappen', () => {
    const f = fenster(5, { ...VORGABE_REGLER, toleranz: 0.2 })
    expect(f.min).toBeLessThan(f.max)
  })

  it('verlangt mit mehr Zieltempo einen schnelleren Strich', () => {
    const schnell = { ...VORGABE_REGLER, zielgeschwindigkeit: 2 }
    expect(urteil(3, 400, 0, 0)).toBe('tor')
    expect(urteil(3, 400, 0, 0, schnell)).toBe('gehalten')
    expect(urteil(3, 70, 0, 0)).toBe('drueber')
    expect(urteil(3, 70, 0, 0, schnell)).toBe('tor')
  })

  it('wiederholt eine Runde unter der Quote genau einmal und hilft dabei', () => {
    const w = neueWelt(3, undefined, { ...VORGABE_REGLER, mindesttrefferquote: 0.8 })
    const runde = () => {
      const namen: string[] = []
      for (let i = 0; i < BAELLE_JE_RUNDE; i++) {
        namen.push(zielName(w))
        // Jeder zweite Ball geht daneben: drei von fünf, unter 80 %.
        schuss(w, { dauer: i % 2 ? LAHM : 300 })
      }
      return namen
    }
    const erste = runde()
    expect(w.hilfe).toBe(true)
    expect(runde()).toEqual(erste)
    expect(w.hilfe).toBe(false)
    expect(runde()).not.toEqual(erste)
    expect(w.wiederholungen).toBeGreaterThanOrEqual(1)
  })
})
