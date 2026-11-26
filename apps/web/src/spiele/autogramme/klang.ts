/**
 * Klang der „Autogrammstunde". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 *
 * Es gibt keinen Ton fürs Danebenschreiben: das kostet nur Zeit, nie etwas anderes (C2).
 */

import { ton } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

export const klang = {
  /** Ein Drittel des Autogramms geschrieben: ein einzelnes, leises Tick. */
  etappe: () => ton(660, 0.08, { laut: 0.1 }),
  /** Autogramm fertig: heller Dreiklang, kein Fanfarenstoß. */
  fertig: () => {
    ton(784, 0.1)
    ton(988, 0.1, { spaeter: 0.09 })
    ton(1319, 0.24, { laut: 0.13, spaeter: 0.18 })
  },
}
