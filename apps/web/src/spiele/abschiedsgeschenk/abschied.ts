/**
 * Der Abschied im Lob nach der Urkunde: Bens Unterschrift aus den Rohdaten holen und den
 * zeitlichen Ablauf festlegen. Wie `welt.ts` ohne Canvas und ohne React, damit es testbar bleibt.
 *
 * Reihenfolge laut Ticket #8: Profi-Unterschrift (1,5 s) → Stempel → Abschiedstext.
 */

import type { SpielErgebnis } from '../../engine/segmente'
import { BAND_BREITE, bandFuer, type Rechteck, type Schriftpunkt } from './welt'

/** So lange schreibt der Profi seine Unterschrift von links nach rechts. */
export const PROFI_SCHREIBT_SEK = 1.5
/** Der Stempel schlägt direkt danach auf. */
export const STEMPEL_SEK = PROFI_SCHREIBT_SEK
/** Der Text erscheint, sobald der Stempel liegt. */
export const TEXT_SEK = STEMPEL_SEK + 0.5

export type Abschnitt = { profiAnteil: number; stempel: boolean; text: boolean }

/** Was nach `uhr` Sekunden zu sehen ist. `profiAnteil` (0–1) ist der Weg der Unterschrift. */
export function abschnitt(uhr: number): Abschnitt {
  return {
    profiAnteil: Math.min(1, Math.max(0, uhr / PROFI_SCHREIBT_SEK)),
    stempel: uhr >= STEMPEL_SEK,
    text: uhr >= TEXT_SEK,
  }
}

/** Base64 → Float32, vier Werte je Abtastung (`rohdaten.ts`). Ohne Abtastung: leere Liste. */
function liesBlob(werte: string): Float32Array {
  const roh = atob(werte)
  const bytes = new Uint8Array(roh.length)
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i)
  return new Float32Array(bytes.buffer, 0, Math.floor(bytes.length / 16) * 4)
}

/**
 * Die Striche des **letzten** Versuchs in Bühnenkoordinaten.
 *
 * Alles, was vor dem letzten Eintrag in `neustartsMs` gezogen wurde, bleibt draußen — genauso
 * rechnet der Server (`Auswertung/Unterschrift.cs`). Die Rohdaten stehen in Pixeln der
 * Spielfläche, `extra.band` ist das Band in denselben Pixeln; daraus folgt der Maßstab zur
 * Bühne. Eine Abtastung mit Druck 0 heißt „abgesetzt": der nächste Punkt beginnt einen Strich.
 */
export function unterschriftAusRohdaten(ergebnis: SpielErgebnis): Schriftpunkt[] {
  const roh = ergebnis.rohdaten
  const extra = ergebnis.extra as { band?: Rechteck; neustartsMs?: number[] }
  const band = extra.band
  if (!roh || !band || band.breite <= 0) return []

  const ziel = bandFuer(ergebnis.stufe).band
  const k = BAND_BREITE / band.breite
  const ab = Math.max(0, ...(extra.neustartsMs ?? []))

  const blob = liesBlob(roh.werte)
  const striche: Schriftpunkt[] = []
  let neu = true
  for (let i = 0; i < blob.length; i += 4) {
    const [t, x, y, druck] = [blob[i], blob[i + 1], blob[i + 2], blob[i + 3]]
    if (t < ab) continue
    if (druck <= 0) {
      neu = true
      continue
    }
    striche.push({ x: ziel.x + (x - band.x) * k, y: ziel.y + (y - band.y) * k, druck, neu })
    neu = false
  }
  return striche
}
