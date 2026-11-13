/**
 * Klang des Aufwärm-Parcours. A4: nur funktional, keine Hintergrundmusik, abschaltbar.
 * Synthetisch über WebAudio — keine Audiodateien nötig.
 *
 * Lautstärke und Stummschaltung kommen aus `bedienung.ts` und werden bei **jedem** Ton neu
 * gelesen: die Bildschleife läuft außerhalb von React, eine zwischengespeicherte Kopie wäre
 * nach einer Änderung im Pausenmenü sofort veraltet.
 *
 * ponytail: `ton()` steht so ähnlich auch in `ballhochhalten/klang.ts`. Bewusst nicht
 * zusammengezogen — die Minispiele sollen einzeln baubar bleiben (CLAUDE.md, Arbeitsteilung),
 * und zwanzig Zeilen doppelt sind billiger als ein geteiltes Modul, an dem drei Leute
 * gleichzeitig arbeiten. Beim dritten Spiel mit eigenem Klang nach `spiele/klang.ts` heben.
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

function ton(freq: number, dauer: number, laut = 0.14, spaeter = 0) {
  const pegel = laut * tonLautstaerke()
  if (pegel <= 0) return
  const a = weckeKlang()
  if (!a) return
  const t0 = a.currentTime + spaeter
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(pegel, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dauer + 0.03)
}

export const klang = {
  /** Kurzer Piep beim Umkurven eines Hütchens — die Rückmeldung aus A1 zum Hinhören. */
  huetchen: () => ton(740, 0.09),
  /** Durchgang geschafft: aufsteigender Dreiklang, kein Fanfarenstoß. */
  geschafft: () => {
    ton(659, 0.1)
    ton(880, 0.1, 0.14, 0.09)
    ton(1175, 0.22, 0.13, 0.18)
  },
}
