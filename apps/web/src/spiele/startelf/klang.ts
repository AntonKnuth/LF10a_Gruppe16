/**
 * Klang der „Startelf". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` steht bewusst auch in den Klängen der anderen Spiele: die Minispiele sollen
 * einzeln baubar bleiben (CLAUDE.md, Arbeitsteilung).
 *
 * Es gibt keinen Ton für einen falschen Start: der grüne Punkt zeigt, wo es losgeht (C2).
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

function ton(freq: number, dauer: number, art: OscillatorType = 'sine', laut = 0.14, spaeter = 0) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const t0 = a.currentTime + spaeter
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = art
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(pegel, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dauer + 0.03)
}

export const klang = {
  /** Strich fertig: kurzer Kreideklick. */
  strich: () => ton(660, 0.06, 'triangle', 0.12),
  /** Zeichen fertig: eine Terz höher als der Klick. */
  zeichen: () => ton(832, 0.12, 'triangle', 0.14),
  /** Spieler fertig: zwei Töne, danach spricht der Stadionsprecher. */
  spieler: () => {
    ton(784, 0.1)
    ton(1047, 0.2, 'sine', 0.14, 0.1)
  },
  /** Die Tafel ist voll: Einlauf der Mannschaft. */
  tafel: () => {
    ton(523, 0.14)
    ton(659, 0.14, 'sine', 0.14, 0.14)
    ton(784, 0.14, 'sine', 0.14, 0.28)
    ton(1047, 0.4, 'sine', 0.13, 0.42)
  },
}
