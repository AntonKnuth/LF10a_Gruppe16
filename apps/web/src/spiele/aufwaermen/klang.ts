/**
 * Klang des Aufwärm-Parcours. A4: nur funktional, keine Hintergrundmusik, abschaltbar.
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
  /** Kurzer Piep beim Umkurven eines Hütchens — die Rückmeldung aus A1 zum Hinhören. */
  huetchen: () => ton(740, 0.09),
  /** Durchgang geschafft: aufsteigender Dreiklang, kein Fanfarenstoß. */
  geschafft: () => {
    ton(659, 0.1)
    ton(880, 0.1, { spaeter: 0.09 })
    ton(1175, 0.22, { laut: 0.13, spaeter: 0.18 })
  },
}
