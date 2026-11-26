/**
 * Gemeinsamer Ton für alle Minispiele. A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * Vorher stand dieser Code in jedem `klang.ts`, und `ton()` hatte je Spiel eine andere
 * Parameterreihenfolge. Jetzt gibt es eine Stelle; die Einstellungen stehen als benannte
 * Felder in einem Objekt, damit sich nichts mehr verwechseln lässt.
 */

import { tonLautstaerke } from '../bedienung'

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

export type TonOptionen = {
  /** Wellenform. Vorgabe: Sinus. */
  art?: OscillatorType
  /** Lautstärke vor der Lautstärke aus dem Pausenmenü, 0 bis 1. Vorgabe 0.14. */
  laut?: number
  /** Verzögerung in Sekunden, damit sich mehrere Töne zu einer Folge reihen lassen. */
  spaeter?: number
  /** Endfrequenz: der Ton gleitet von `hz` dorthin. Ohne Angabe bleibt er auf `hz`. */
  bis?: number
  /** Einblenddauer in Sekunden. Ohne sie knackt der Ton beim Einsetzen. Vorgabe 0.015. */
  anlauf?: number
}

/** Ein einzelner Ton: `hz` Hertz, `dauer` Sekunden lang, Rest siehe `TonOptionen`. */
export function ton(hz: number, dauer: number, opt: TonOptionen = {}) {
  const { art = 'sine', laut = 0.14, spaeter = 0, bis, anlauf = 0.015 } = opt
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const t0 = a.currentTime + spaeter
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = art
  o.frequency.setValueAtTime(hz, t0)
  // Mindestens 50 Hz: exponentielles Gleiten verträgt weder 0 noch negative Werte.
  if (bis !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(50, bis), t0 + dauer)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(pegel, t0 + anlauf)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dauer + 0.03)
}
