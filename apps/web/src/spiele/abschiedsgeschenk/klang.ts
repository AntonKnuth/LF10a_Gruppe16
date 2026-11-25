/**
 * Klang der Urkunde. A4: nur funktional, leise, keine Fanfare — die kommt erst im Lob.
 * Synthetisch über WebAudio, keine Audiodateien.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * `rauschen()` steht so ähnlich auch in `ballhochhalten/klang.ts` — bewusst doppelt, damit die
 * Minispiele einzeln baubar bleiben (siehe `aufwaermen/klang.ts`).
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

/** Gefiltertes Rauschen, das ausklingt. `anstieg` blendet es ein. */
function rauschen(dauer: number, laut: number, hp: number, anstieg = 0) {
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
  src.start()
}

export const klang = {
  /** Die Feder setzt auf: kurzes, hohes Kratzen je Strichanfang. */
  kratzen: () => rauschen(0.06, 0.05, 3000),
  /** Die Urkunde rollt sich ein. */
  rascheln: () => rauschen(0.5, 0.06, 1200, 0.12),
}
