/**
 * Klang von „Dribbeln mit Pfiff". A4: nur funktional, keine Hintergrundmusik, abschaltbar — jeder
 * Pfiff ist zusätzlich als Ring am Ball zu sehen, das Spiel geht also auch ohne Ton.
 *
 * `ton()` kommt aus `../ton.ts`, geteilt von allen Minispielen.
 * Die Lautstärke wird bei jedem Ton neu gelesen, weil sie sich im Pausenmenü ändern kann.
 */

import { ton } from '../ton'
export { weckeKlang, schliesseKlang } from '../ton'

/** Zwei knapp verstimmte Töne schweben gegeneinander — das trillert wie die Erbse in der Pfeife. */
function pfeife(dauer: number, spaeter = 0) {
  ton(1480, dauer, { art: 'triangle', laut: 0.07, spaeter })
  ton(1520, dauer, { art: 'triangle', laut: 0.07, spaeter })
}

export const klang = {
  pfiff: () => pfeife(0.35),
  doppelpfiff: () => {
    pfeife(0.12)
    pfeife(0.12, 0.18)
  },
  /** „Tock": die Spitze steht. */
  gestoppt: () => ton(520, 0.06),
  /** Leises Kullern, kein Fehlerton (C2). */
  kullern: () => {
    for (let i = 0; i < 4; i++) ton(260 - i * 25, 0.07, { laut: 0.06, spaeter: i * 0.11 })
  },
  huetchen: () => ton(740, 0.09),
  /** Pass angekommen: aufsteigender Dreiklang. */
  pass: () => {
    ton(659, 0.1)
    ton(880, 0.1, { spaeter: 0.09 })
    ton(1175, 0.22, { laut: 0.13, spaeter: 0.18 })
  },
}
