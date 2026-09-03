/**
 * Klang des Minispiels. A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Alles synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
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

function ton(freq: number, dauer: number, art: OscillatorType = 'sine', laut = 0.16, spaeter = 0, nach = 0) {
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

/** `anstieg` blendet das Rauschen ein, statt es losbrechen zu lassen. */
function rauschen(dauer: number, laut = 0.18, hp = 800, anstieg = 0, spaeter = 0) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const n = Math.floor(a.sampleRate * dauer)
  const anN = Math.floor(anstieg * a.sampleRate)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) {
    const auf = anN ? Math.min(1, i / anN) : 1
    d[i] = (Math.random() * 2 - 1) * auf * (1 - i / n)
  }
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = hp
  const g = a.createGain()
  g.gain.value = pegel
  src.connect(f)
  f.connect(g)
  g.connect(a.destination)
  src.start(a.currentTime + spaeter)
}

export const klang = {
  schuss: (kraft: number) => {
    ton(300 + kraft * 260, 0.16, 'sine', 0.18, 0, 120 + kraft * 90)
    rauschen(0.05, 0.1, 1500)
  },
  laden: () => ton(420, 0.08, 'triangle', 0.06),
  zone: () => {
    ton(660, 0.1, 'sine', 0.16)
    ton(880, 0.16, 'sine', 0.14, 0.09)
  },
  kern: () => {
    ton(784, 0.09, 'sine', 0.16)
    ton(988, 0.09, 'sine', 0.16, 0.08)
    ton(1319, 0.2, 'sine', 0.15, 0.16)
  },
  platzen: () => {
    rauschen(0.09, 0.22, 1100)
    ton(880, 0.05, 'square', 0.06)
  },
  decke: () => {
    ton(180, 0.12, 'square', 0.1, 0, 90)
    rauschen(0.06, 0.1, 500)
  },
  boden: () => {
    ton(220, 0.18, 'sine', 0.16, 0, 90)
    ton(160, 0.3, 'triangle', 0.12, 0.12, 70)
  },
  /** Wappenballon: heller Dreiklang statt nur Platzen. */
  wappen: () => {
    rauschen(0.09, 0.18, 1100)
    ton(659, 0.1, 'sine', 0.14)
    ton(880, 0.1, 'sine', 0.14, 0.08)
    ton(1175, 0.22, 'sine', 0.13, 0.16)
  },
  /**
   * Schlusspfiff. Weicher Doppelpfiff statt schrillem Stoß, und der Jubel schwillt
   * verzögert an — ein Ausbruch direkt nach dem Pfiff erschreckt.
   */
  abpfiff: () => {
    ton(1480, 0.15, 'triangle', 0.05)
    ton(1400, 0.44, 'triangle', 0.055, 0.19)
    rauschen(2.7, 0.07, 300, 1.1, 0.9)
  },
}
