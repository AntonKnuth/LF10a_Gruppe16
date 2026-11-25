import { describe, expect, it } from 'vitest'
import { vereine } from '../content'
import { spieleDesTages, standardEinstellungen } from '../engine/tagesplan'
import { KATALOG, spielIds } from './katalog'
import { SPIELE } from './index'
import { Platzhalter } from './Platzhalter'

describe('Spiele in Arbeit', () => {
  it('sind genau die, die noch den Platzhalter zeigen', () => {
    for (const id of spielIds) {
      expect([id, SPIELE[id].Komponente === Platzhalter]).toEqual([id, KATALOG[id].inArbeit === true])
    }
  })

  it('kommen an keinem Trainingstag irgendeines Vereins vor', () => {
    for (const verein of vereine) {
      for (const tag of [1, 2, 3, 4, 5]) {
        const ids = spieleDesTages(verein.id, tag, standardEinstellungen)
        expect(ids.filter((id) => KATALOG[id].inArbeit)).toEqual([])
        // Trotz des kleineren Topfes wiederholt sich an keinem Tag eine Übung.
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })
})
