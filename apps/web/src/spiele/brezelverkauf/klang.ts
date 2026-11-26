/**
 * Klang von „Brezelverkauf". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 */

import { ton } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

export const klang = {
  /** Ware übergeben: kurzer heller Dreiklang. */
  abgabe: () => {
    ton(784, 0.09)
    ton(988, 0.09, { spaeter: 0.08 })
    ton(1319, 0.2, { laut: 0.13, spaeter: 0.16 })
  },
  /**
   * Zusammenstoß: dumpf und tief, ausdrücklich **kein** schriller Fehlerton. Es ist ein
   * Rempler im Gedränge, kein Scheitern (C2).
   */
  stoss: () => {
    ton(150, 0.16, { art: 'square', laut: 0.09, bis: 70 })
    ton(90, 0.24, { art: 'triangle', laut: 0.1, spaeter: 0.02, bis: 55 })
  },
}
