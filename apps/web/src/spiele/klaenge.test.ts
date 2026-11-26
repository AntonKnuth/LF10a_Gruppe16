import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const einstellung = vi.hoisted(() => ({ lautstaerke: 1 }))
vi.mock('../bedienung', () => ({ tonLautstaerke: () => einstellung.lautstaerke }))

import { schliesseKlang } from './ton'
import { baueAudioAttrappe, type Attrappe } from './audioAttrappe'
import { klang as abschiedsgeschenk } from './abschiedsgeschenk/klang'
import { klang as aufwaermen } from './aufwaermen/klang'
import { klang as autogramme } from './autogramme/klang'
import { klang as ballhochhalten } from './ballhochhalten/klang'
import { klang as brezelverkauf } from './brezelverkauf/klang'
import { klang as dribbeln } from './dribbeln/klang'
import { klang as einlass } from './einlass/klang'
import { klang as elfmeter } from './elfmeter/klang'
import { klang as linie } from './linie/klang'
import { klang as muell } from './muell/klang'
import { klang as rasenmaehen } from './rasenmaehen/klang'
import { klang as startelf } from './startelf/klang'
import { klang as stationentour } from './stationentour/klang'

const spiele: Record<string, Record<string, (arg: number) => void>> = {
  abschiedsgeschenk, aufwaermen, autogramme, ballhochhalten, brezelverkauf, dribbeln, einlass,
  elfmeter, linie, muell, rasenmaehen, startelf, stationentour,
}

let audio: Attrappe

beforeEach(() => {
  einstellung.lautstaerke = 1
  audio = baueAudioAttrappe()
  vi.stubGlobal('AudioContext', audio.AudioContext)
})

afterEach(() => {
  schliesseKlang()
  vi.unstubAllGlobals()
})

// Der Argumentwert ist für `schuss` (Kraft 0 bis 1) und `zeichen` (Nummer im Wort) gedacht.
describe.each(Object.entries(spiele))('Klänge von %s', (_name, klang) => {
  it.each(Object.keys(klang))('%s läuft ohne Fehler und macht Ton', (eintrag) => {
    expect(() => klang[eintrag](1)).not.toThrow()
    expect(audio.oszillatoren.length + audio.rauschquellen.length).toBeGreaterThan(0)
  })

  it('bleibt bei ausgeschaltetem Ton stumm', () => {
    einstellung.lautstaerke = 0
    for (const eintrag of Object.keys(klang)) klang[eintrag](1)
    expect(audio.oszillatoren).toHaveLength(0)
    expect(audio.rauschquellen).toHaveLength(0)
  })
})
