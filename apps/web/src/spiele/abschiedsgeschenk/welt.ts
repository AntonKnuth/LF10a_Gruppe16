/**
 * Zustand und Bewertung der „Urkunde" (Sonderspiel, Rolle `sonder`). Kennt kein Canvas und
 * kein React — damit die Logik ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Am letzten Tag bei einem Verein überreicht der Profi Ben eine Urkunde
 * „Probetraining bestanden". Ben unterschreibt sie mit seinem Spielnamen in einem Band mit
 * Lineatur wie im Schulheft. Es ist **eine** Unterschrift, immer gleich gestellt — für Thomas
 * die eine feste Schreibprobe im Ablauf, die er über Monate vergleichen kann.
 *
 * Ablauf in `schritt`:
 *   uebergabe      die Urkunde rollt auf
 *   unterschreiben Ben schreibt
 *   pruefen        ein Strich ist da und 1,2 s kam nichts mehr: groß „Fertig“, klein „Nochmal“
 *                  (höchstens zweimal). Bleibt das Band leer, kommt „Fertig“ nach 90 s von selbst.
 *   abgabe         die Urkunde rollt ein, danach `fertig`
 *
 * Bewertet wird nichts, was Ben sieht: kein Stern, kein Lob, keine Korrektur. Profi-Unterschrift
 * und Stempel kommen erst im Lob nach der Smiley-Frage (C3).
 */

import type { Spruch, Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

/** So lange rollt die Urkunde auf bzw. ein. */
export const AUFROLLEN_SEK = 0.8
export const EINROLLEN_SEK = 0.6

/** So lange Ruhe nach dem letzten Strich, bis „Fertig" erscheint. */
export const RUHE_SEK = 1.2

/** Bleibt das Band so lange leer, sagt der Profi einmal „Ein Zeichen reicht auch“. */
export const LEER_HINWEIS_SEK = 60
/** Nach dem Hinweis noch so lange, dann erscheint „Fertig“ trotzdem. */
export const LEER_FERTIG_SEK = 30
/** So oft darf Ben neu anfangen. Danach ist „Nochmal“ weg. */
export const MAX_NEUSTARTS = 2

/** Linkes Ende und Breite des Unterschriftsbands, auf jeder Stufe gleich. */
export const BAND_X = 200
export const BAND_BREITE = 460
/** Die Grundlinie bleibt auf jeder Stufe an derselben Stelle; das Band wächst nach oben. */
export const GRUNDLINIE_Y = 440

export type Rechteck = { x: number; y: number; breite: number; hoehe: number }
export type Lineatur = 'vier' | 'zwei' | 'grund'
export type Vorlage = 'nachspuren' | 'abschauen' | 'keine'

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Drei Stufen laut Ticket #3. Der Therapeut kann 1 bis 5 einstellen; 4 und 5 sehen aus wie
   Stufe 3. In `ergebnis` steht trotzdem die eingestellte Stufe — sonst stimmt der Verlauf
   nicht mit den Einstellungen überein.

   Das Band reicht von der Oberlinie bis zur Grundlinie. Die Unterkante ist also die
   Grundlinie — genauso liest es der Server (`Auswertung/Unterschrift.cs`). */
const STUFEN: { hoehe: number; lineatur: Lineatur; vorlage: Vorlage }[] = [
  { hoehe: 140, lineatur: 'vier', vorlage: 'nachspuren' },
  { hoehe: 100, lineatur: 'zwei', vorlage: 'abschauen' },
  { hoehe: 70, lineatur: 'grund', vorlage: 'keine' },
]

export function bandFuer(stufe: number): { band: Rechteck; lineatur: Lineatur; vorlage: Vorlage } {
  const s = STUFEN[Math.min(3, Math.max(1, Math.round(stufe))) - 1]
  return {
    band: { x: BAND_X, y: GRUNDLINIE_Y - s.hoehe, breite: BAND_BREITE, hoehe: s.hoehe },
    lineatur: s.lineatur,
    vorlage: s.vorlage,
  }
}

/** Die Unterlinie liegt eine halbe Bandhöhe unter der Grundlinie (Platz für g, j, y). */
export const unterlinieY = (band: Rechteck) => band.y + band.hoehe * 1.5

export const imBand = (b: Rechteck, x: number, y: number) =>
  x >= b.x && x <= b.x + b.breite && y >= b.y && y <= b.y + b.hoehe

/* ── Zustand ───────────────────────────────────────────────────────────── */

export type Schritt = 'uebergabe' | 'unterschreiben' | 'pruefen' | 'abgabe'

/** Ein Punkt der Schrift. `neu` beginnt einen Strich (Stift abgesetzt und neu aufgesetzt). */
export type Schriftpunkt = { x: number; y: number; druck: number; neu: boolean }

/** Was auf der Urkunde steht. Genau so geht es auch in `extra.urkunde` — nichts Persönliches. */
export type UrkundenKopf = {
  vereinId: string
  vereinName: string
  profi: string
  primaer: string
  sekundaer: string
}

export type Welt = {
  stufe: number
  urkunde: UrkundenKopf
  /** Wort für „Urkunde" in der Vereinssprache, falls der Verein eins mitbringt. */
  wort?: Spruch
  /** Spielname, nur für die Vorlage. Steht **nicht** im Ergebnis. */
  name: string
  band: Rechteck
  lineatur: Lineatur
  vorlage: Vorlage
  schritt: Schritt
  /** Sekunden seit Beginn des aktuellen Schritts. Treibt das Auf- und Einrollen. */
  schrittUhr: number
  schrift: Schriftpunkt[]
  /** Stift liegt auf. */
  schreibt: boolean
  letzter: { x: number; y: number } | null
  /** Sekunden ohne Eingabe seit dem letzten Absetzen. */
  ruhe: number
  /** Sekunden, die das Band leer ist (noch kein Strich im laufenden Versuch). */
  leerSek: number
  /** Der Profi hat „Ein Zeichen reicht auch“ schon gesagt. Nur einmal im ganzen Spiel. */
  hinweisGegeben: boolean
  /** Zeitpunkte der Neustarts auf der Rohdaten-Uhr. Die frühere Tinte bleibt in den Rohdaten. */
  neustartsMs: number[]
  /** Geschriebene Strecke, die ganz im Band liegt. */
  tinteImBand: number
  /** Abtastungen mit Druck, und davon die zwischen Ober- und Unterlinie. */
  abtastungen: number
  abtastungenZwischen: number
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  /** Aktive Spielzeit ohne Anhalten. */
  zeitGesamt: number
  /** Das Band in Rohdaten-Koordinaten, gemessen beim ersten Aufsetzen. */
  bandRoh: Rechteck | null
  /** Zeitpunkt von „Fertig" auf der Rohdaten-Uhr. */
  fertigMs: number | null
  /** Die Urkunde ist eingerollt; das Spiel meldet sich fertig. */
  fertig: boolean
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein, name = ''): Welt {
  const { band, lineatur, vorlage } = bandFuer(stufe)
  return {
    stufe,
    urkunde: {
      vereinId: verein?.id ?? 'verein',
      vereinName: verein?.name ?? 'Verein',
      profi: verein?.profi.name ?? 'Profi',
      primaer: verein?.farben.primaer ?? '#0a3a82',
      sekundaer: verein?.farben.sekundaer ?? '#ffffff',
    },
    wort: verein?.urkunde,
    name,
    band,
    lineatur,
    vorlage,
    schritt: 'uebergabe',
    schrittUhr: 0,
    schrift: [],
    schreibt: false,
    letzter: null,
    ruhe: 0,
    leerSek: 0,
    hinweisGegeben: false,
    neustartsMs: [],
    tinteImBand: 0,
    abtastungen: 0,
    abtastungenZwischen: 0,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    bandRoh: null,
    fertigMs: null,
    fertig: false,
  }
}

function wechsle(w: Welt, schritt: Schritt) {
  w.schritt = schritt
  w.schrittUhr = 0
}

/* ── Schreiben ─────────────────────────────────────────────────────────── */

/**
 * Stift aufgesetzt. `bandRoh` ist das Band in Rohdaten-Koordinaten; gemerkt wird nur das vom
 * **ersten** Aufsetzen — vorher steht die Urkunde noch nicht still.
 *
 * Schreibt Ben weiter, während schon „Fertig" da ist (der i-Punkt kommt oft spät), geht es
 * zurück zu `unterschreiben`. Gibt zurück, ob der Strich angenommen wurde.
 */
export function setzeAn(w: Welt, bandRoh: Rechteck): boolean {
  if (w.schritt === 'pruefen') wechsle(w, 'unterschreiben')
  if (w.schritt !== 'unterschreiben') return false
  w.bandRoh ??= bandRoh
  w.schreibt = true
  w.letzter = null
  w.ruhe = 0
  w.leerSek = 0
  return true
}

export function hebeAb(w: Welt) {
  w.schreibt = false
  w.letzter = null
  w.ruhe = 0
}

/** Ein Zeigerpunkt bei aufliegendem Stift, in Bühnenkoordinaten. */
export function schreibe(w: Welt, x: number, y: number, d: Druck) {
  if (!w.schreibt) return
  w.schrift.push({ x, y, druck: d.wert, neu: w.letzter === null })
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.ruhe = 0

  w.abtastungen++
  if (y >= w.band.y && y <= unterlinieY(w.band)) w.abtastungenZwischen++

  // Nur Strecke, die **ganz** im Band liegt, zählt: Anfang und Ende drin. Gezählt wird die
  // Strecke und nicht der Punkt, sonst füllte Tippen auf derselben Stelle das Band.
  if (w.letzter && imBand(w.band, x, y) && imBand(w.band, w.letzter.x, w.letzter.y)) {
    w.tinteImBand += Math.hypot(x - w.letzter.x, y - w.letzter.y)
  }
  w.letzter = { x, y }
}

/** „Fertig" getippt. `fertigMs` ist der Zeitpunkt auf der Rohdaten-Uhr. */
export function gibAb(w: Welt, fertigMs: number): boolean {
  if (w.schritt !== 'pruefen') return false
  w.fertigMs = fertigMs
  wechsle(w, 'abgabe')
  return true
}

/** „Nochmal“ ist da: im Schritt `pruefen` und noch nicht zweimal benutzt. */
export const kannNochmal = (w: Welt) => w.schritt === 'pruefen' && w.neustartsMs.length < MAX_NEUSTARTS

/**
 * „Nochmal“ getippt. Die Tinte des Versuchs wird geleert, der Zeitpunkt (Rohdaten-Uhr)
 * gemerkt und es geht zurück zu `unterschreiben`. Gibt zurück, ob es wirkte; beim dritten
 * Mal tut es nichts. Die Rohdaten des früheren Versuchs bleiben, maßgeblich ist der letzte.
 */
export function nochmal(w: Welt, ms: number): boolean {
  if (!kannNochmal(w)) return false
  w.neustartsMs.push(Math.round(ms))
  w.schrift = []
  w.tinteImBand = 0
  w.abtastungen = 0
  w.abtastungenZwischen = 0
  w.druckWerte = []
  w.synthetisch = false
  w.schreibt = false
  w.letzter = null
  w.ruhe = 0
  w.leerSek = 0
  wechsle(w, 'unterschreiben')
  return true
}

/**
 * Eine Bildschleifen-Runde. Angehalten steht alles, auch die Wartezeit bis „Fertig" — sonst
 * erschiene der Knopf, während Ben im Pausenmenü ist.
 */
export function aktualisiere(w: Welt, dt: number, angehalten = false) {
  if (angehalten) return
  w.zeitGesamt += dt
  w.schrittUhr += dt

  if (w.schritt === 'uebergabe' && w.schrittUhr >= AUFROLLEN_SEK) {
    wechsle(w, 'unterschreiben')
  } else if (w.schritt === 'unterschreiben' && !w.schreibt && w.schrift.length > 0) {
    w.ruhe += dt
    // Die kleine Zugabe gleicht Rundungsfehler aus: 72 × 1/60 ergibt 1,1999…
    if (w.ruhe >= RUHE_SEK - 1e-6) wechsle(w, 'pruefen')
  } else if (w.schritt === 'unterschreiben' && !w.schreibt && w.schrift.length === 0) {
    // Leeres Band: erst der Hinweis, dann „Fertig“ trotzdem. Kein Abbruch, kein Urteil (C2).
    w.leerSek += dt
    if (w.leerSek >= LEER_HINWEIS_SEK - 1e-6) w.hinweisGegeben = true
    if (w.leerSek >= LEER_HINWEIS_SEK + LEER_FERTIG_SEK - 1e-6) wechsle(w, 'pruefen')
  } else if (w.schritt === 'abgabe' && w.schrittUhr >= EINROLLEN_SEK) {
    w.fertig = true
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

const runde = (v: number) => Math.round(v * 10) / 10

/**
 * Vollständig ist eine Unterschrift, sobald die Tinte im Band 1,5 Bandhöhen lang ist. Ein
 * Punkt oder ein Häkchen reicht nicht, ein kurzer Name schon.
 *
 * ACHTUNG — `genauigkeit` ist **unmaßgeblich**. Sie entsteht im Browser und darf nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen der Unterschrift rechnet C# aus den Rohdaten
 * (`Auswertung/Unterschrift.cs`), mit `extra.band` als Bezugsrahmen.
 *
 * `abgebrochen` ist immer false: im Spiel gibt es keinen Abbruchweg (C2).
 */
export function ergebnis(w: Welt, dauerMs: number): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  const b = w.bandRoh
  return {
    spielId: 'abschiedsgeschenk',
    dauerMs,
    vollstaendigkeit: Math.min(1, w.tinteImBand / (1.5 * w.band.hoehe)),
    genauigkeit: w.abtastungen === 0 ? 0 : w.abtastungenZwischen / w.abtastungen,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen: false,
    // Vertrag mit Server und Therapeuten-App (Ticket #3). Ohne Spielnamen: der liegt schon am
    // Klienten, und auf der Urkunde steht ohnehin Bens Handschrift.
    extra: {
      urkunde: w.urkunde,
      band: b && { x: runde(b.x), y: runde(b.y), breite: runde(b.breite), hoehe: runde(b.hoehe) },
      lineatur: w.lineatur,
      vorlage: w.vorlage,
      neustartsMs: [...w.neustartsMs],
      fertigMs: w.fertigMs === null ? null : Math.round(w.fertigMs),
    },
  }
}
