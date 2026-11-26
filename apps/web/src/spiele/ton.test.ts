import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Die Lautstärke kommt sonst aus localStorage; hier lässt sie sich einfach vorgeben.
const einstellung = vi.hoisted(() => ({ lautstaerke: 1 }))
vi.mock('../bedienung', () => ({ tonLautstaerke: () => einstellung.lautstaerke }))

import { ton, weckeKlang, schliesseKlang } from './ton'
import { baueAudioAttrappe, type Attrappe } from './audioAttrappe'

let audio: Attrappe

/** weckeKlang() meldet den echten Typ; im Test ist es die Attrappe. */
const wecke = () => weckeKlang() as unknown as InstanceType<Attrappe['AudioContext']> | null

beforeEach(() => {
  einstellung.lautstaerke = 1
  audio = baueAudioAttrappe()
  vi.stubGlobal('AudioContext', audio.AudioContext)
})

afterEach(() => {
  schliesseKlang()
  vi.unstubAllGlobals()
})

describe('ton', () => {
  it('setzt Frequenz, Wellenform, Dauer und Lautstärke wie angegeben', () => {
    ton(660, 0.5, { art: 'square', laut: 0.2 })
    const [o] = audio.oszillatoren
    expect(o.type).toBe('square')
    expect(o.frequenzSetzt).toEqual([{ wert: 660, zeit: 0 }])
    expect(o.frequenzGleitet).toEqual([])
    expect(o.gestartetBei).toBe(0)
    expect(o.gestopptBei).toBeCloseTo(0.53)
    // Einblenden bis zur Lautstärke, danach Ausklingen bis zur Dauer.
    expect(audio.verstaerker[0].gleitet).toEqual([
      { wert: 0.2, zeit: 0.015 },
      { wert: 0.0001, zeit: 0.5 },
    ])
  })

  it('nimmt ohne Angaben Sinus, 0.14 Lautstärke und 0.015 s Einblenden', () => {
    ton(440, 0.1)
    expect(audio.oszillatoren[0].type).toBe('sine')
    expect(audio.verstaerker[0].gleitet[0]).toEqual({ wert: 0.14, zeit: 0.015 })
  })

  it('verschiebt Beginn und Ende um `spaeter`', () => {
    ton(440, 0.2, { spaeter: 0.3 })
    const [o] = audio.oszillatoren
    expect(o.gestartetBei).toBeCloseTo(0.3)
    expect(o.gestopptBei).toBeCloseTo(0.53)
    expect(o.frequenzSetzt[0].zeit).toBeCloseTo(0.3)
  })

  it('gleitet mit `bis` zur Endfrequenz, aber nie unter 50 Hz', () => {
    ton(300, 0.4, { bis: 120 })
    ton(300, 0.4, { bis: 10 })
    expect(audio.oszillatoren[0].frequenzGleitet).toEqual([{ wert: 120, zeit: 0.4 }])
    expect(audio.oszillatoren[1].frequenzGleitet).toEqual([{ wert: 50, zeit: 0.4 }])
  })

  it('blendet mit `anlauf` länger oder kürzer ein', () => {
    ton(440, 0.2, { anlauf: 0.01 })
    expect(audio.verstaerker[0].gleitet[0].zeit).toBe(0.01)
  })

  it('rechnet die Lautstärke aus dem Pausenmenü ein', () => {
    einstellung.lautstaerke = 0.5
    ton(440, 0.1, { laut: 0.2 })
    expect(audio.verstaerker[0].gleitet[0].wert).toBeCloseTo(0.1)
  })

  it('macht bei ausgeschaltetem Ton nichts, nicht einmal einen AudioContext', () => {
    einstellung.lautstaerke = 0
    ton(440, 0.1)
    expect(audio.kontexte).toHaveLength(0)
    expect(audio.oszillatoren).toHaveLength(0)
  })

  it('macht ohne AudioContext im Browser nichts und stürzt nicht ab', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => ton(440, 0.1)).not.toThrow()
    expect(audio.oszillatoren).toHaveLength(0)
  })
})

describe('weckeKlang und schliesseKlang', () => {
  it('benutzt einen einzigen Kontext für alle Töne und weckt einen angehaltenen', () => {
    const a = wecke()
    a!.state = 'suspended'
    expect(wecke()).toBe(a)
    expect(audio.kontexte).toHaveLength(1)
    expect(a!.fortgesetzt).toBe(1)
  })

  it('schliesst den Kontext beim Verlassen und legt beim nächsten Mal einen neuen an', () => {
    const a = wecke()!
    schliesseKlang()
    expect(a.geschlossen).toBe(true)
    expect(wecke()).not.toBe(a)
  })

  it('liefert null, wenn es keinen AudioContext gibt', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(wecke()).toBeNull()
  })
})
