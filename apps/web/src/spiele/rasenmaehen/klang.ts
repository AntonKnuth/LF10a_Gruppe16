/**
 * Klang von „Platzwart". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 *
 * Zu leicht oder zu fest gemäht bleibt still: kein Strafton, die Stelle wird einfach nochmal
 * befahren (C2). Wie oft der Schnitt-Ton kommen darf, begrenzt der Aufrufer in `index.tsx`.
 */

import { ton } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

export const klang = {
  /** Sauber geschnitten: ein kurzes, leises Tick. */
  schnitt: () => ton(560, 0.06, { laut: 0.08 }),
  /** Platz fertig: heller Dreiklang, kein Fanfarenstoß. */
  platz: () => {
    ton(784, 0.1)
    ton(988, 0.1, { spaeter: 0.09 })
    ton(1319, 0.24, { laut: 0.13, spaeter: 0.18 })
  },
}
