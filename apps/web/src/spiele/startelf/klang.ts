/**
 * Klang der „Startelf". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 *
 * Es gibt keinen Ton für einen falschen Start: der grüne Punkt zeigt, wo es losgeht (C2).
 */

import { ton as tonBasis, type TonOptionen } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

/** Wie `ton()`, aber mit 0.01 s Einblenden: dieses Spiel hat es immer so gehabt. */
const ton = (hz: number, dauer: number, opt: TonOptionen = {}) =>
  tonBasis(hz, dauer, { anlauf: 0.01, ...opt })

export const klang = {
  /** Strich fertig: kurzer Kreideklick. */
  strich: () => ton(660, 0.06, { art: 'triangle', laut: 0.12 }),
  /** Zeichen fertig: eine Terz höher als der Klick. */
  zeichen: () => ton(832, 0.12, { art: 'triangle' }),
  /** Spieler fertig: zwei Töne, danach spricht der Stadionsprecher. */
  spieler: () => {
    ton(784, 0.1)
    ton(1047, 0.2, { spaeter: 0.1 })
  },
  /** Die Tafel ist voll: Einlauf der Mannschaft. */
  tafel: () => {
    ton(523, 0.14)
    ton(659, 0.14, { spaeter: 0.14 })
    ton(784, 0.14, { spaeter: 0.28 })
    ton(1047, 0.4, { laut: 0.13, spaeter: 0.42 })
  },
}
