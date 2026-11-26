/**
 * Klang der „Stadionführung". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen. `rauschen()` ist je Spiel
 * leicht anders und bleibt deshalb hier.
 *
 * Es gibt keinen Ton für ein falsches Tempo oder einen falschen Start (C2).
 */

import { tonLautstaerke } from '../../bedienung'
import { ton as tonBasis, type TonOptionen, weckeKlang } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

/** Wie `ton()`, aber mit 0.01 s Einblenden: dieses Spiel hat es immer so gehabt. */
const ton = (hz: number, dauer: number, opt: TonOptionen = {}) =>
  tonBasis(hz, dauer, { anlauf: 0.01, ...opt })

/** Klatschende Menge: Rauschen ohne tiefe Anteile, das leiser wird. */
function rauschen(dauer: number, laut: number) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const n = Math.floor(a.sampleRate * dauer)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const quelle = a.createBufferSource()
  quelle.buffer = buf
  const filter = a.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1100
  const g = a.createGain()
  g.gain.value = pegel
  quelle.connect(filter)
  filter.connect(g)
  g.connect(a.destination)
  quelle.start()
}

/** Tonleiter für die Zeichen eines Wortes; das längste Wort hat sechs. */
const LEITER = [523, 587, 659, 784, 880, 1047]

export const klang = {
  /** Strich fertig: leises Klicken der Tafel. */
  strich: () => ton(440, 0.05, { art: 'triangle', laut: 0.1 }),
  /** Zeichen fertig: jedes im Wort eine Stufe höher. */
  zeichen: (nr: number) =>
    ton(LEITER[Math.min(nr, LEITER.length - 1)], 0.18, { art: 'triangle', laut: 0.15 }),
  /** Wort fertig: Applaus. Danach liest der Stadionsprecher den Fakt vor. */
  wort: () => {
    ton(1047, 0.25)
    rauschen(0.8, 0.12)
  },
  schluss: () => rauschen(0.8, 0.1),
}
