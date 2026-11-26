/**
 * Klang von „Linie malen". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 *
 * Es gibt keinen Ton fürs Verlassen der Bahn: der Ball bleibt dann einfach stehen (C2).
 */

import { ton } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

export const klang = {
  /** Ein Viertel der Bahn geschafft: ein einzelnes, leises Tick. */
  etappe: () => ton(660, 0.08, { laut: 0.1 }),
  /** Tor: heller Dreiklang, kein Fanfarenstoß. */
  tor: () => {
    ton(784, 0.1)
    ton(988, 0.1, { spaeter: 0.09 })
    ton(1319, 0.24, { laut: 0.13, spaeter: 0.18 })
  },
}
