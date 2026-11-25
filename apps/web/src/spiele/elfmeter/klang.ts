/**
 * Klang von „Elfmeter". A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `ton()` und `rauschen()` stehen so ähnlich in `ballhochhalten/klang.ts`. Bewusst kopiert: die
 * Minispiele sollen einzeln baubar bleiben (CLAUDE.md, Arbeitsteilung).
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

function rauschen(dauer: number, laut: number, hochpass: number) {
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
  filter.frequency.value = hochpass
  const g = a.createGain()
  g.gain.value = pegel
  quelle.connect(filter)
  filter.connect(g)
  g.connect(a.destination)
  quelle.start()
}

const netz = () => rauschen(0.25, 0.12, 900)

export const klang = {
  schuss: () => {
    ton(240, 0.14, 'sine', 0.2, 0, 110)
    rauschen(0.04, 0.08, 1500)
  },
  tor: () => {
    netz()
    ton(659, 0.1)
    ton(880, 0.16, 'sine', 0.14, 0.09)
  },
  marke: () => {
    netz()
    ton(784, 0.09)
    ton(988, 0.09, 'sine', 0.14, 0.08)
    ton(1319, 0.22, 'sine', 0.13, 0.16)
  },
  wappen: () => {
    netz()
    ton(659, 0.1)
    ton(880, 0.1, 'sine', 0.14, 0.08)
    ton(1175, 0.1, 'sine', 0.13, 0.16)
    ton(1319, 0.3, 'sine', 0.13, 0.24)
  },
  /* Die vier übrigen sind sachliche Geräusche und keine Fehlertöne (C2). */
  /** Handschuhe klatschen um den Ball. */
  gehalten: () => rauschen(0.07, 0.14, 600),
  abgewehrt: () => {
    rauschen(0.05, 0.14, 700)
    ton(200, 0.1, 'sine', 0.1, 0, 130)
  },
  /** Pfosten: „Klong". */
  vorbei: () => {
    ton(523, 0.3, 'triangle', 0.12)
    ton(1309, 0.18, 'sine', 0.05)
  },
  /** Über die Latte: ein Fan fängt den Ball. */
  drueber: () => ton(330, 0.22, 'sine', 0.1, 0, 620),
  /** Weicher Doppelpfiff statt schrillem Stoß. */
  abpfiff: () => {
    ton(1480, 0.15, 'triangle', 0.05)
    ton(1400, 0.44, 'triangle', 0.055, 0.19)
  },
}
