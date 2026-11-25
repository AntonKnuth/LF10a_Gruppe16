/**
 * Klang von „Einlasskontrolle". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` steht bewusst auch in den Klängen der anderen Spiele: die Minispiele sollen
 * einzeln baubar bleiben (CLAUDE.md, Arbeitsteilung).
 *
 * Kein Alarm und kein Strafton (C2): wer ein erlaubtes Ding antippt, hört nichts.
 */

import { tonLautstaerke } from '../../bedienung'

let actx: AudioContext | null = null

/** Muss aus einer Nutzergeste heraus laufen, sonst bleibt der Kontext angehalten. */
export function weckeKlang() {
  if (typeof AudioContext === 'undefined') return null
  actx ??= new AudioContext()
  if (actx.state === 'suspended') void actx.resume()
  return actx
}

export function schliesseKlang() {
  void actx?.close()
  actx = null
}

function ton(
  freq: number, dauer: number, art: OscillatorType = 'sine', laut = 0.14, spaeter = 0, nach = 0,
) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const t0 = a.currentTime + spaeter
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = art
  o.frequency.setValueAtTime(freq, t0)
  if (nach) o.frequency.exponentialRampToValueAtTime(Math.max(50, nach), t0 + dauer)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(pegel, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dauer + 0.03)
}

export const klang = {
  /** Stift auf einem markierten Ding: ein leises Tick. */
  aufgesetzt: () => ton(620, 0.05, 'sine', 0.07),
  /** Das Ding hängt am Stift. */
  gegriffen: () => ton(440, 0.07, 'triangle', 0.14, 0, 660),
  /** Abgerutscht oder geflutscht: weiches Plopp, es liegt ja wieder da (C2). */
  gefallen: () => ton(260, 0.14, 'sine', 0.1, 0, 160),
  /** In der Kiste. */
  abgelegt: () => {
    ton(988, 0.1)
    ton(1319, 0.2, 'sine', 0.13, 0.08)
  },
  /** Tasche leer: das Drehkreuz klackt zweimal. Erst nach dem Pling der Kiste. */
  tascheLeer: () => {
    ton(300, 0.05, 'square', 0.06, 0.4)
    ton(360, 0.05, 'square', 0.06, 0.55)
  },
}
