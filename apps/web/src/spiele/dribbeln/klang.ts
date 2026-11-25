/**
 * Klang von „Dribbeln mit Pfiff". A4: nur funktional, keine Hintergrundmusik, abschaltbar — jeder
 * Pfiff ist zusätzlich als Ring am Ball zu sehen, das Spiel geht also auch ohne Ton.
 *
 * Aufbau und `ton()` wie in `aufwaermen/klang.ts`; kopiert, damit das Spiel für sich allein steht.
 * Die Lautstärke wird bei jedem Ton neu gelesen, weil sie sich im Pausenmenü ändern kann.
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
  freq: number, dauer: number, laut = 0.14, spaeter = 0, art: OscillatorType = 'sine',
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
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(pegel, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dauer + 0.03)
}

/** Zwei knapp verstimmte Töne schweben gegeneinander — das trillert wie die Erbse in der Pfeife. */
function pfeife(dauer: number, spaeter = 0) {
  ton(1480, dauer, 0.07, spaeter, 'triangle')
  ton(1520, dauer, 0.07, spaeter, 'triangle')
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
    for (let i = 0; i < 4; i++) ton(260 - i * 25, 0.07, 0.06, i * 0.11)
  },
  huetchen: () => ton(740, 0.09),
  /** Pass angekommen: aufsteigender Dreiklang. */
  pass: () => {
    ton(659, 0.1)
    ton(880, 0.1, 0.14, 0.09)
    ton(1175, 0.22, 0.13, 0.18)
  },
}
