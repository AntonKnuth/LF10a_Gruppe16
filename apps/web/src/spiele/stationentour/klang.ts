/**
 * Klang der „Stadionführung". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` und `rauschen()` stehen bewusst auch in den Klängen der anderen Spiele: die Minispiele
 * sollen einzeln baubar bleiben (CLAUDE.md, Arbeitsteilung).
 *
 * Es gibt keinen Ton für ein falsches Tempo oder einen falschen Start (C2).
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

function ton(freq: number, dauer: number, art: OscillatorType = 'sine', laut = 0.14) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const t0 = a.currentTime
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

/** Klatschende Menge: Rauschen ohne tiefe Anteile, das leiser wird. */
function rauschen(dauer: number, laut: number) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const n = Math.floor(a.sampleRate * dauer)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const quelle = a.createBufferSource()
  quelle.buffer = buf
  const filter = a.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1100
  const g = a.createGain()
  g.gain.value = pegel
  quelle.connect(filter)
  filter.connect(g)
  g.connect(a.destination)
  quelle.start()
}

/** Tonleiter für die Zeichen eines Wortes; das längste Wort hat sechs. */
const LEITER = [523, 587, 659, 784, 880, 1047]

export const klang = {
  /** Strich fertig: leises Klicken der Tafel. */
  strich: () => ton(440, 0.05, 'triangle', 0.1),
  /** Zeichen fertig: jedes im Wort eine Stufe höher. */
  zeichen: (nr: number) => ton(LEITER[Math.min(nr, LEITER.length - 1)], 0.18, 'triangle', 0.15),
  /** Wort fertig: Applaus. Danach liest der Stadionsprecher den Fakt vor. */
  wort: () => {
    ton(1047, 0.25)
    rauschen(0.8, 0.12)
  },
  schluss: () => rauschen(0.8, 0.1),
}
