/**
 * Klang von „Einlasskontrolle". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 *
 * Kein Alarm und kein Strafton (C2): wer ein erlaubtes Ding antippt, hört nichts.
 */

import { ton } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

export const klang = {
  /** Stift auf einem markierten Ding: ein leises Tick. */
  aufgesetzt: () => ton(620, 0.05, { laut: 0.07 }),
  /** Das Ding hängt am Stift. */
  gegriffen: () => ton(440, 0.07, { art: 'triangle', bis: 660 }),
  /** Abgerutscht oder geflutscht: weiches Plopp, es liegt ja wieder da (C2). */
  gefallen: () => ton(260, 0.14, { laut: 0.1, bis: 160 }),
  /** In der Kiste. */
  abgelegt: () => {
    ton(988, 0.1)
    ton(1319, 0.2, { laut: 0.13, spaeter: 0.08 })
  },
  /** Tasche leer: das Drehkreuz klackt zweimal. Erst nach dem Pling der Kiste. */
  tascheLeer: () => {
    ton(300, 0.05, { art: 'square', laut: 0.06, spaeter: 0.4 })
    ton(360, 0.05, { art: 'square', laut: 0.06, spaeter: 0.55 })
  },
}
