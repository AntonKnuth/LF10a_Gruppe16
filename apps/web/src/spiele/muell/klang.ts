/**
 * Klang von „Platz aufräumen". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * ponytail: `ton()` steht so ähnlich in jedem Spiel mit eigenem Klang. Bewusst nicht
 * zusammengezogen — die Minispiele sollen einzeln baubar bleiben (CLAUDE.md, Arbeitsteilung).
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

function ton(freq: number, dauer: number, laut = 0.14, spaeter = 0, form: OscillatorType = 'sine', bis = freq) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const t0 = a.currentTime + spaeter
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = form
  o.frequency.setValueAtTime(freq, t0)
  if (bis !== freq) o.frequency.exponentialRampToValueAtTime(bis, t0 + dauer)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(pegel, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dauer + 0.03)
}

export const klang = {
  /** Kreis ist zu: ein kurzes „klick" im selben Moment — die Rückmeldung aus A1. */
  zu: () => ton(1200, 0.05, 0.12, 0, 'triangle'),
  /** Zu groß: ein weicher, tiefer Ton. Kein Fehlerbrummen — es ist ein Hinweis, kein Urteil (C2). */
  zuGross: () => ton(330, 0.14, 0.08),
  /** Die Kamera fährt los. Leise, damit sie bei vielen Kreisen nicht nervt. */
  surr: () => ton(180, 0.35, 0.04, 0, 'sawtooth', 260),
  /** Der Greifer holt den Müll. */
  plopp: () => ton(520, 0.12, 0.14, 0, 'sine', 900),
  /** Abschnitt sauber: aufsteigender Dreiklang, kein Fanfarenstoß. */
  sauber: () => {
    ton(659, 0.1)
    ton(880, 0.1, 0.14, 0.09)
    ton(1175, 0.22, 0.13, 0.18)
  },
}
