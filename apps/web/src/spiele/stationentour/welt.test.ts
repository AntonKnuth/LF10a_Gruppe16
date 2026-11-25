import { describe, expect, it } from 'vitest'
import { vereine } from '../../content'
import type { Fakt, Verein } from '../../content/typen'
import type { Druck } from '../../eingabe'
import { VORGABE_REGLER, type Regler } from '../regler'
import { hatVorlage, laenge, punktBei } from '../schrift'
import {
  ABGANG_SEK, ANLAUF_SEK, BALL_AB_FEHLSTARTS, BESUCHER_MAX, BESUCHER_START, FAKT_SEK,
  FUNKEN_JE_ZEICHEN, HALTEN_SEK, HILFE_SEK, HILFE_TEXT, RUNDE_TEXT, SCHLUSS_SEK, SCHLUSS_TEXT,
  VERKRAMPFT_SEK, WARTE_TEXT, WORTFELD, aktiverStrich, aktualisiere, beende, ergebnis, faktVon,
  hebeAb, hilfeVon, legeAus, neueWelt, schreibe, setzeAn, spitze, startradius, tour, tourLaenge,
  vorgaben, wortAnteil, type Ereignis, type Welt,
} from './welt'

const d = (wert = 0.5): Druck => ({ wert, synthetisch: true })
const BILD = 1 / 60
const regler = (r: Partial<Regler>): Regler => ({ ...VORGABE_REGLER, ...r })

/** Ein Verein mit genau diesen Wörtern — die Fakten sind reiner Content. */
const mitWoertern = (...woerter: string[]): Verein => ({
  ...vereine[0],
  fakten: woerter.map((wort): Fakt => ({ text: `Hier steht ${wort}.`, wort })),
})

const laufe = (w: Welt, sekunden: number) => {
  const meldungen: (Ereignis | undefined)[] = []
  for (let i = 0; i < Math.round(sekunden * 60); i++) meldungen.push(aktualisiere(w, BILD))
  return meldungen.filter(Boolean)
}

/**
 * Fährt den aktiven Strich ab der Spitze mit `tempo` nach, höchstens bis zum Anteil `bis`. Je Bild
 * ein Zeigerpunkt, danach rechnet die Welt ein Bild weiter — wie im Spiel.
 */
const fahreStrich = (w: Welt, tempo = 110, bis = 1, druck = 0.5): (Ereignis | undefined)[] => {
  const s = aktiverStrich(w)
  const ziel = laenge(s) * bis
  const p0 = spitze(w)
  const meldungen = [setzeAn(w, p0.x, p0.y)]
  for (let l = w.fortschritt; ; l += tempo * BILD) {
    const p = punktBei(s, Math.min(l, ziel))
    const e = schreibe(w, p.x, p.y, d(druck))
    meldungen.push(e, aktualisiere(w, BILD))
    if (e === 'strich' || e === 'zeichen' || e === 'wort' || l >= ziel) break
  }
  hebeAb(w)
  return meldungen.filter(Boolean)
}

const schreibeWort = (w: Welt, tempo = 110) => {
  const meldungen: (Ereignis | undefined)[] = []
  // Die Obergrenze fängt einen Strich ab, der sich nicht fertig fahren lässt.
  for (let i = 0; i < 40 && w.phase === 'schreiben'; i++) meldungen.push(...fahreStrich(w, tempo))
  return meldungen
}

/** Ein langer gerader Strich, damit sich das Tempo messen lässt. */
const langerStrich = (stufe = 3, r = VORGABE_REGLER) => {
  const w = neueWelt(stufe, mitWoertern('I1'), r)
  w.zeichen[0].striche[0] = [{ x: 100, y: 100 }, { x: 1600, y: 100 }]
  setzeAn(w, 100, 100)
  return w
}

/** Fährt auf dem langen Strich `sek` lang mit `tempo` weiter. */
const ziehe = (w: Welt, tempo: number, sek: number, druck = 0.5) => {
  const meldungen: (Ereignis | undefined)[] = []
  for (let i = 0; i < Math.round(sek * 60); i++) {
    schreibe(w, (w.letzter?.x ?? 100) + tempo * BILD, 100, d(druck))
    meldungen.push(aktualisiere(w, BILD))
  }
  return meldungen.filter(Boolean)
}

describe('Content', () => {
  const alle = vereine.flatMap((v) => v.fakten)

  it('hat nur Schlüsselwörter, die sich schreiben lassen und im Fakt vorkommen', () => {
    for (const f of alle) {
      expect([f.wort, hatVorlage(f.wort)]).toEqual([f.wort, true])
      expect([f.wort, /^[A-Z0-9]{2,6}$/.test(f.wort)]).toEqual([f.wort, true])
      // Der Tausenderpunkt wird nicht geschrieben.
      const text = f.text.replace(/(\d)\.(\d)/g, '$1$2').toUpperCase()
      expect([f.wort, text.includes(f.wort)]).toEqual([f.wort, true])
    }
  })

  it('hat je Verein mindestens zwei Fakten, damit nie dasselbe Wort zweimal hintereinander kommt', () => {
    for (const v of vereine) expect([v.id, v.fakten.length >= 2]).toEqual([v.id, true])
  })

  it('passt auf jeder Stufe ins Wortfeld', () => {
    for (const stufe of [1, 2, 3, 4, 5]) {
      for (const wort of [...alle.map((f) => f.wort), 'WWWWWW']) {
        const hoehe = vorgaben(stufe, VORGABE_REGLER).glyphHoehe
        for (const q of legeAus(wort, hoehe).flatMap((z) => z.striche.flat())) {
          const passt = q.x >= WORTFELD.x - 1 && q.x <= WORTFELD.x + WORTFELD.b + 1 &&
            q.y >= WORTFELD.y - 1 && q.y <= WORTFELD.y + WORTFELD.h + 1
          expect([wort, stufe, passt]).toEqual([wort, stufe, true])
        }
      }
    }
  })

  it('lässt sich mit jedem Verein auf jeder Stufe eine ganze Tour lang spielen', () => {
    for (const v of vereine) {
      for (const stufe of [1, 2, 3, 4, 5]) {
        const w = neueWelt(stufe, v)
        for (let i = 0; i < tourLaenge(w); i++) {
          schreibeWort(w)
          laufe(w, FAKT_SEK + 0.1)
        }
        expect([v.id, stufe, w.stationenFertig, tour(w)]).toEqual([v.id, stufe, tourLaenge(w), 1])
        expect(ergebnis(w).genauigkeit).toBe(1)
      }
    }
  })
})

describe('Nachspuren', () => {
  it('füllt sich nur auf der Vorlage; daneben zählt es nur in die Genauigkeit', () => {
    const w = neueWelt(3, mitWoertern('1887'))
    fahreStrich(w, 110, 0.5)
    const halb = w.fortschritt
    expect(halb).toBeGreaterThan(0)
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    schreibe(w, p.x, p.y, d())
    schreibe(w, p.x + 200, p.y + 20, d())
    // Auf den ersten Pixeln liegt der Stift noch auf der Vorlage, danach nicht mehr.
    expect(w.fortschritt - halb).toBeLessThan(5)
    expect(w.probenDrin).toBe(w.proben - 1)
    expect(w.tinte.at(-1)!.drin).toBe(false)
  })

  it('lässt sich nicht durch die 0 hindurch abkürzen', () => {
    const w = neueWelt(3, mitWoertern('00'))
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    for (let y = p.y; y <= p.y + 110; y += 5) schreibe(w, p.x, y, d())
    expect(w.fortschritt).toBeLessThan(0.2 * laenge(aktiverStrich(w)))
  })

  it('bewirkt beim Aufsetzen fern der Spitze nichts außer der Hilfe', () => {
    const w = neueWelt(3)
    setzeAn(w, 5, 5)
    schreibe(w, 5, 5, d())
    expect([w.fortschritt, w.faehrt, hilfeVon(w), w.woerter.length]).toEqual([0, false, 1, 0])
  })

  it('geht nach dem Absetzen an derselben Stelle weiter', () => {
    const w = neueWelt(3, mitWoertern('1I'))
    fahreStrich(w, 110, 0.6)
    const bis = w.fortschritt
    laufe(w, 2)
    expect(w.fortschritt).toBe(bis)
    expect(fahreStrich(w)).toEqual(['zeichen'])
  })

  it('kommt auch mit weit auseinanderliegenden Abtastungen einer schnellen Maus voran', () => {
    const w = neueWelt(3, mitWoertern('1I'))
    expect(fahreStrich(w, 4000)).toEqual(['zeichen'])
  })

  it('führt innerhalb eines Zeichens auch ohne Abheben zum nächsten Strich', () => {
    const w = neueWelt(3, mitWoertern('LT'))
    fahreStrich(w)
    const [eins, zwei] = w.zeichen[1].striche
    setzeAn(w, eins[0].x, eins[0].y)
    const meldungen: (Ereignis | undefined)[] = []
    for (const s of [eins, zwei]) {
      for (let l = 0; l <= laenge(s); l += 4) {
        const p = punktBei(s, l)
        meldungen.push(schreibe(w, p.x, p.y, d()))
      }
    }
    expect(meldungen.filter(Boolean)).toEqual(['strich', 'wort'])
  })
})

describe('Ablauf', () => {
  it('meldet Strich, Zeichen und Wort und zeigt danach den ganzen Fakt', () => {
    const w = neueWelt(3, mitWoertern('T1', 'OK'))
    expect(schreibeWort(w)).toEqual(['strich', 'zeichen', 'wort'])
    expect([w.phase, faktVon(w).text, wortAnteil(w)]).toEqual(['fakt', 'Hier steht T1.', 1])
    laufe(w, FAKT_SEK + 0.1)
    expect([w.phase, faktVon(w).wort]).toEqual(['schreiben', 'OK'])
  })

  it('nimmt die Fakten immer in derselben Reihenfolge und beginnt danach von vorn', () => {
    const w = neueWelt(1, mitWoertern('11', '17', '71'))
    const woerter: string[] = []
    for (let i = 0; i < 5; i++) {
      woerter.push(faktVon(w).wort)
      schreibeWort(w)
      laufe(w, FAKT_SEK + 0.1)
    }
    expect(woerter).toEqual(['11', '17', '71', '11', '17'])
    expect(ergebnis(w).extra.woerter).toEqual(woerter)
  })

  it('macht aus zwei Fakten eine Tour von vier Stationen und meldet die neue Runde', () => {
    const w = neueWelt(1, mitWoertern('11', '17'))
    expect(tourLaenge(w)).toBe(4)
    for (let i = 0; i < 4; i++) {
      expect([i, tour(w), w.blase?.text === RUNDE_TEXT]).toEqual([i, 0, false])
      schreibeWort(w)
      laufe(w, FAKT_SEK + 0.1)
    }
    expect([tour(w), w.blase?.text]).toEqual([1, RUNDE_TEXT])
  })

  it('läuft ohne Verein mit Ersatzfakt und lässt aus, was sich nicht schreiben lässt', () => {
    expect(hatVorlage(faktVon(neueWelt(3)).wort)).toBe(true)
    expect(neueWelt(3, mitWoertern('É1', '', '17')).fakten.map((f) => f.wort)).toEqual(['17'])
  })
})

describe('Tempo', () => {
  it('ist beim Zieltempo im Takt', () => {
    const w = langerStrich()
    ziehe(w, 110, 2)
    expect([w.tempo, w.takt.zuSchnell, w.takt.zuLangsam]).toEqual(['imTakt', 0, 0])
    expect(w.v).toBeCloseTo(110, 0)
  })

  it('meldet Hetzen erst nach der Haltezeit und lässt die Gruppe dann zurückbleiben', () => {
    const w = langerStrich()
    ziehe(w, 110, 1)
    ziehe(w, 400, HALTEN_SEK.zuSchnell - 0.02)
    expect(w.tempo).toBe('imTakt')
    ziehe(w, 400, 0.4)
    expect([w.tempo, w.blase?.text]).toEqual(['zuSchnell', WARTE_TEXT])
    // Ruhiger weiter: sie kommen von selbst wieder in Takt (C2).
    ziehe(w, 110, 1)
    expect(w.tempo).toBe('imTakt')
  })

  it('bemerkt Stillstand, obwohl dabei keine Zeigerereignisse kommen', () => {
    const w = langerStrich()
    ziehe(w, 110, 1)
    laufe(w, 0.3)
    expect(w.tempo).toBe('imTakt')
    laufe(w, 0.7)
    expect(w.tempo).toBe('zuLangsam')
  })

  it('wertet im Anlauf kein Trödeln', () => {
    const w = langerStrich()
    laufe(w, ANLAUF_SEK - 0.02)
    expect(w.takt).toEqual({ imTakt: 0, zuSchnell: 0, zuLangsam: 0 })
  })

  it('bemerkt auch viele kurze, hastige Striche mit Absetzen dazwischen', () => {
    const w = neueWelt(3, mitWoertern('111111'))
    schreibeWort(w, 1500)
    expect(w.taktGesamt.zuSchnell).toBeGreaterThan(0)
  })

  it('misst während des Absetzens nichts', () => {
    const w = langerStrich()
    ziehe(w, 400, 0.6)
    hebeAb(w)
    const vorher = { ...w.taktGesamt }
    laufe(w, 2)
    expect([w.taktGesamt, w.tempo]).toEqual([vorher, 'imTakt'])
  })

  it('hält bei keinem Tempo auf: jedes Wort wird fertig (C2)', () => {
    for (const tempo of [8, 110, 2000]) {
      const w = neueWelt(3, mitWoertern('T1', '17'))
      schreibeWort(w, tempo)
      expect([tempo, w.phase, w.stationenFertig]).toEqual([tempo, 'fakt', 1])
    }
  })
})

describe('Besucher', () => {
  it('holen nach dem Hetzen immer wieder auf', () => {
    const w = neueWelt(3, mitWoertern('HENNES'))
    schreibeWort(w, 900)
    laufe(w, FAKT_SEK - ABGANG_SEK - 0.2)
    expect(w.gruppeX).toBeCloseTo(w.fuehrerX - 60)
  })

  it('bekommen Zuwachs, wenn Ben überwiegend im Takt führt, höchstens bis zur Obergrenze', () => {
    const w = neueWelt(1, mitWoertern('11', '17'))
    for (let i = 0; i < BESUCHER_MAX; i++) {
      schreibeWort(w)
      laufe(w, FAKT_SEK + 0.1)
    }
    expect(w.besucher).toBe(BESUCHER_MAX)
  })

  it('bleiben bei falschem Tempo alle da', () => {
    for (const tempo of [8, 1200]) {
      const w = neueWelt(1, mitWoertern('11', '17'))
      schreibeWort(w, tempo)
      laufe(w, FAKT_SEK + 0.1)
      expect([tempo, w.besucher]).toEqual([tempo, BESUCHER_START])
    }
  })

  it('kommen mit dem konstanten Ersatzdruck der Maus genauso dazu', () => {
    const w = neueWelt(1, mitWoertern('17', '11'))
    schreibeWort(w)
    expect(w.besucher).toBe(BESUCHER_START + 1)
    expect(ergebnis(w).extra.anteilDruckImBand).toBe(1)
    expect(ergebnis(w).synthetischerDruck).toBe(true)
  })
})

describe('Druck', () => {
  it('liegt bei gleichmäßigem Druck im Band und beim Sprung daneben', () => {
    const w = langerStrich()
    ziehe(w, 110, 1)
    expect(w.druckDrinSek).toBeCloseTo(w.druckSek)
    const drin = w.druckDrinSek
    ziehe(w, 110, 0.3, 0.9)
    expect(w.druckDrinSek).toBeCloseTo(drin)
  })

  it('erinnert bei langem festem Druck genau einmal je Station ans Lockerlassen (B3)', () => {
    const w = langerStrich()
    expect(ziehe(w, 110, VERKRAMPFT_SEK - 0.1, 0.9)).toEqual([])
    expect(ziehe(w, 110, 6, 0.9)).toEqual(['locker'])
    expect(w.verkrampfungsHinweise).toBe(1)
  })
})

describe('Hilfe (C2)', () => {
  it('lässt nach einer Weile ohne Stift den Startpunkt pulsieren und sagt es genau einmal', () => {
    const w = neueWelt(3)
    expect(laufe(w, HILFE_SEK - 0.2)).toEqual([])
    expect(laufe(w, 0.4)).toEqual(['hilfe'])
    expect([hilfeVon(w), w.blase?.text]).toEqual([1, HILFE_TEXT])
    expect(laufe(w, 30)).toEqual([])
  })

  it('macht den Strich nach mehreren Fehlstarts vor, aber nie selbst fertig', () => {
    const w = neueWelt(3)
    for (let i = 0; i < BALL_AB_FEHLSTARTS; i++) {
      setzeAn(w, 5, 5)
      hebeAb(w)
    }
    expect(hilfeVon(w)).toBe(2)
    laufe(w, 60)
    expect([w.phase, wortAnteil(w)]).toEqual(['schreiben', 0])
    fahreStrich(w)
    expect(hilfeVon(w)).toBe(0)
  })
})

describe('Stufe und Regler (B1)', () => {
  it('verhält sich bei den Vorgaben so, wie es die Stufe allein vorgibt', () => {
    expect(vorgaben(3, VORGABE_REGLER)).toEqual({
      glyphHoehe: 110, toleranz: 22, zielTempo: 110, tempoBand: 0.3, druckBand: 0.1, mindestTakt: 0.7,
    })
    expect(vorgaben(5, VORGABE_REGLER).toleranz).toBeLessThan(vorgaben(1, VORGABE_REGLER).toleranz)
    expect(vorgaben(9, VORGABE_REGLER)).toEqual(vorgaben(5, VORGABE_REGLER))
  })

  it('verbreitert die Spur, verschiebt den Takt und hebt die Schwelle für neue Besucher', () => {
    expect(vorgaben(4, regler({ toleranz: 1.5 })).toleranz).toBe(24)
    expect(vorgaben(3, regler({ zielgeschwindigkeit: 2 })).zielTempo).toBe(220)
    expect(vorgaben(1, regler({ mindesttrefferquote: 0.8 })).mindestTakt).toBe(0.8)
    // Unter der Vorgabe wirkt die Quote nicht.
    expect(vorgaben(1, regler({ mindesttrefferquote: 0.1 })).mindestTakt).toBe(0.5)
  })

  it('bewertet das Tempo am eingestellten Zieltempo', () => {
    const w = langerStrich(3, regler({ zielgeschwindigkeit: 2 }))
    ziehe(w, 220, 2)
    expect(w.tempo).toBe('imTakt')
    ziehe(w, 110, 2)
    expect(w.tempo).toBe('zuLangsam')
  })

  it('bleibt mit den äußersten Reglern spielbar, und ein neuer Besucher bleibt erreichbar', () => {
    for (const faktor of [0.1, 3]) {
      for (const stufe of [1, 3, 5]) {
        for (const v of vereine) {
          const r = { toleranz: faktor, zielgeschwindigkeit: faktor, mindesttrefferquote: 1 }
          const w = neueWelt(stufe, v, r)
          schreibeWort(w, w.vorgaben.zielTempo)
          expect([faktor, stufe, v.id, w.phase]).toEqual([faktor, stufe, v.id, 'fakt'])
          expect(startradius(w)).toBeGreaterThanOrEqual(18)
          expect([faktor, stufe, v.id, w.besucher]).toEqual([faktor, stufe, v.id, BESUCHER_START + 1])
        }
      }
    }
  })
})

describe('Ende', () => {
  it('wartet, bis der Stift oben ist, und lässt dann den Rest aufleuchten', () => {
    const w = neueWelt(3, mitWoertern('17'))
    fahreStrich(w)
    const p = spitze(w)
    setzeAn(w, p.x, p.y)
    beende(w)
    laufe(w, 3)
    expect(w.phase).toBe('schreiben')
    hebeAb(w)
    const dauer = w.zeitGesamt
    expect(laufe(w, 0.1)).toEqual(['schluss'])
    expect([w.phase, wortAnteil(w), w.blase?.text]).toEqual(['schluss', 1, SCHLUSS_TEXT])
    laufe(w, SCHLUSS_SEK)
    expect(w.phase).toBe('fertig')
    // Die Schlussanimation ist keine Übungszeit.
    expect(ergebnis(w).dauerMs / 1000).toBeCloseTo(dauer, 1)
  })

  it('lässt den Fakt noch zu Ende stehen und fängt kein neues Wort an', () => {
    const w = neueWelt(3, mitWoertern('17', '11'))
    schreibeWort(w)
    beende(w)
    laufe(w, FAKT_SEK - 0.2)
    expect(w.phase).toBe('fakt')
    laufe(w, 0.4)
    expect([w.phase, faktVon(w).wort]).toEqual(['schluss', '17'])
    laufe(w, SCHLUSS_SEK + 0.1)
    expect([w.phase, ergebnis(w).vollstaendigkeit]).toEqual(['fertig', 1])
  })

  it('endet auch, wenn Ben gar nichts geschrieben hat, mit Nullen statt NaN', () => {
    const w = neueWelt(3)
    beende(w)
    laufe(w, SCHLUSS_SEK + 0.2)
    const e = ergebnis(w)
    expect([w.phase, e.vollstaendigkeit, e.genauigkeit, e.abgebrochen]).toEqual(['fertig', 0, 0, false])
    expect(e.extra).toMatchObject({ anteilImTakt: 0, anteilDruckImBand: 0, stationenBegonnen: 0 })
  })
})

describe('Ergebnis', () => {
  it('zählt fertige je begonnener Station und die letzte anteilig', () => {
    const w = neueWelt(3, mitWoertern('11', '17'))
    schreibeWort(w)
    laufe(w, FAKT_SEK + 0.1)
    // Eine Station, an der noch nicht angesetzt wurde, zählt nicht als begonnen.
    expect(ergebnis(w).vollstaendigkeit).toBe(1)
    fahreStrich(w)
    const e = ergebnis(w)
    expect(e.vollstaendigkeit).toBeGreaterThan(0.6)
    expect(e.vollstaendigkeit).toBeLessThan(0.9)
    expect(e.extra).toMatchObject({
      woerter: ['11', '17'], stationenFertig: 1, stationenBegonnen: 2, gespurteStriche: 3,
    })
    expect([e.spielId, e.stufe, e.extra.vorgaben]).toEqual([
      'stationentour', 3, vorgaben(3, VORGABE_REGLER),
    ])
  })

  it('teilt die Stiftzeit vollständig auf die drei Tempozustände auf', () => {
    const w = neueWelt(2, vereine[0])
    schreibeWort(w, 180)
    const { anteilImTakt, anteilZuSchnell, anteilZuLangsam } = ergebnis(w).extra as Record<string, number>
    expect(anteilImTakt + anteilZuSchnell + anteilZuLangsam).toBeCloseTo(1)
  })
})

describe('Funken (A1)', () => {
  it('zünden je fertigem Zeichen und nicht bei prefers-reduced-motion', () => {
    const w = neueWelt(3, mitWoertern('17'))
    fahreStrich(w)
    expect(w.funken).toHaveLength(FUNKEN_JE_ZEICHEN)
    const ruhig = neueWelt(3, mitWoertern('17'))
    ruhig.wenigerBewegung = true
    fahreStrich(ruhig)
    expect(ruhig.funken).toHaveLength(0)
  })
})
