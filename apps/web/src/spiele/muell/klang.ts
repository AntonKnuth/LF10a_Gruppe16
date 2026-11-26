/**
 * Klang von „Platz aufräumen". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 */

import { ton as tonBasis, type TonOptionen } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

/** Wie `ton()`, aber mit 0.01 s Einblenden: dieses Spiel hat es immer so gehabt. */
const ton = (hz: number, dauer: number, opt: TonOptionen = {}) =>
  tonBasis(hz, dauer, { anlauf: 0.01, ...opt })

export const klang = {
  /** Kreis ist zu: ein kurzes „klick" im selben Moment — die Rückmeldung aus A1. */
  zu: () => ton(1200, 0.05, { art: 'triangle', laut: 0.12 }),
  /** Zu groß: ein weicher, tiefer Ton. Kein Fehlerbrummen — es ist ein Hinweis, kein Urteil (C2). */
  zuGross: () => ton(330, 0.14, { laut: 0.08 }),
  /** Die Kamera fährt los. Leise, damit sie bei vielen Kreisen nicht nervt. */
  surr: () => ton(180, 0.35, { art: 'sawtooth', laut: 0.04, bis: 260 }),
  /** Der Greifer holt den Müll. */
  plopp: () => ton(520, 0.12, { bis: 900 }),
  /** Abschnitt sauber: aufsteigender Dreiklang, kein Fanfarenstoß. */
  sauber: () => {
    ton(659, 0.1)
    ton(880, 0.1, { spaeter: 0.09 })
    ton(1175, 0.22, { laut: 0.13, spaeter: 0.18 })
  },
}
