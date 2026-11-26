/**
 * Klang von „Elfmeter". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen. `rauschen()` ist je Spiel
 * leicht anders und bleibt deshalb hier.
 */

import { tonLautstaerke } from '../../bedienung'
import { ton, weckeKlang } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

function rauschen(dauer: number, laut: number, hochpass: number) {
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
  filter.frequency.value = hochpass
  const g = a.createGain()
  g.gain.value = pegel
  quelle.connect(filter)
  filter.connect(g)
  g.connect(a.destination)
  quelle.start()
}

const netz = () => rauschen(0.25, 0.12, 900)

export const klang = {
  schuss: () => {
    ton(240, 0.14, { laut: 0.2, bis: 110 })
    rauschen(0.04, 0.08, 1500)
  },
  tor: () => {
    netz()
    ton(659, 0.1)
    ton(880, 0.16, { spaeter: 0.09 })
  },
  marke: () => {
    netz()
    ton(784, 0.09)
    ton(988, 0.09, { spaeter: 0.08 })
    ton(1319, 0.22, { laut: 0.13, spaeter: 0.16 })
  },
  wappen: () => {
    netz()
    ton(659, 0.1)
    ton(880, 0.1, { spaeter: 0.08 })
    ton(1175, 0.1, { laut: 0.13, spaeter: 0.16 })
    ton(1319, 0.3, { laut: 0.13, spaeter: 0.24 })
  },
  /* Die vier übrigen sind sachliche Geräusche und keine Fehlertöne (C2). */
  /** Handschuhe klatschen um den Ball. */
  gehalten: () => rauschen(0.07, 0.14, 600),
  abgewehrt: () => {
    rauschen(0.05, 0.14, 700)
    ton(200, 0.1, { laut: 0.1, bis: 130 })
  },
  /** Pfosten: „Klong". */
  vorbei: () => {
    ton(523, 0.3, { art: 'triangle', laut: 0.12 })
    ton(1309, 0.18, { laut: 0.05 })
  },
  /** Über die Latte: ein Fan fängt den Ball. */
  drueber: () => ton(330, 0.22, { laut: 0.1, bis: 620 }),
  /** Weicher Doppelpfiff statt schrillem Stoß. */
  abpfiff: () => {
    ton(1480, 0.15, { art: 'triangle', laut: 0.05 })
    ton(1400, 0.44, { art: 'triangle', laut: 0.055, spaeter: 0.19 })
  },
}
