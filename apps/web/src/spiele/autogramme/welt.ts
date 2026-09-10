/**
 * Zustand und Bewertung der „Autogrammstunde". Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Ein Fan hält Ben ein Trikot hin — mit Rückennummer und Namen eines Spielers
 * **dieses Vereins** (Leitidee: es soll sich nach diesem Verein anfühlen, nicht nach
 * derselben Übung mit getauschtem Wappen). Darauf ist ein weißes Autogrammfeld. Ben
 * schreibt hinein; ist genug Tinte im Feld, ist das Trikot signiert und der nächste Fan
 * kommt.
 *
 * **Pinzettengriff** steckt in der Größe des Feldes: es ist klein, und mit steigender
 * Stufe wird es kleiner. Ein kleines Feld erzwingt die feine Führung aus Daumen und
 * Zeigefinger — große Armbewegungen landen daneben.
 *
 * **Schreiben** steckt darin, dass die Strecke im Feld zählt, nicht ein einzelner Punkt:
 * man muss tatsächlich eine Linie ziehen, nicht tippen.
 *
 * C2: Danebengeschriebenes wird nie bestraft und blockiert nichts. Es zählt nur in die
 * Genauigkeit — und die sieht ausschließlich Thomas.
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

/** Oberkante des Trikots auf der Bühne. */
export const TRIKOT_Y = 96
export const TRIKOT_B = 420
export const TRIKOT_H = 430

/** So lange jubelt der Fan, bevor das nächste Trikot kommt. */
export const JUBEL_SEK = 1.4

export type Punkt = { x: number; y: number }
export type Feld = { x: number; y: number; b: number; h: number }

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Die Toleranz stellt Thomas ein und sie bleibt während des Spiels fest. Eine
   selbstjustierende Größe wäre im Verlauf nicht mehr lesbar: der Messwert müsste dann
   für jedes Trikot eine andere Anforderung mitführen.

   Kleineres Feld = feinerer Griff. Startwerte, kein Messwert — mit echtem Pencil auf dem
   Zielgerät nachziehen. */
export const feldBreite = (stufe: number) => Math.max(150, 310 - stufe * 28)

export function autogrammFeld(stufe: number): Feld {
  const b = feldBreite(stufe)
  const h = Math.round(b * 0.42)
  return { x: W / 2 - b / 2, y: TRIKOT_Y + TRIKOT_H - h - 74, b, h }
}

/**
 * Wie viel Strecke im Feld ein Autogramm ausmacht. An die Feldbreite gekoppelt: ein
 * kleineres Feld verlangt sonst dieselbe Strecke auf weniger Platz und wird doppelt
 * schwer — die Stufe soll die Feinheit erhöhen, nicht die Menge.
 */
export const zielTinte = (stufe: number) => feldBreite(stufe) * 2

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const imFeld = (f: Feld, x: number, y: number) =>
  x >= f.x && x <= f.x + f.b && y >= f.y && y <= f.y + f.h

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** Ein Punkt der Schrift. `neu` beginnt einen Strich (Stift abgesetzt und neu aufgesetzt). */
export type Schriftpunkt = { x: number; y: number; drin: boolean; neu: boolean }

export type Spieler = { nummer: number; name: string }

const ERSATZ_KADER: Spieler[] = [
  { nummer: 7, name: 'Spieler' },
  { nummer: 9, name: 'Spielerin' },
]

export type Welt = {
  stufe: number
  farben: Verein['farben']
  /** Kaderliste des Vereins — der Fan hält das Trikot eines echten Spielers hin. */
  kader: Spieler[]
  /** Wievieltes Trikot insgesamt, ab 0. Bestimmt zugleich, wessen Trikot es ist. */
  trikot: number
  feld: Feld
  /** Geschriebene Strecke im Feld — **nur für das laufende Trikot**, treibt den Ring. */
  tinte: number
  /* Die beiden folgenden laufen über alle Trikots und werden nie zurückgesetzt: sie sind
     Zähler und Nenner der Genauigkeit. `tinte` allein taugt dafür nicht, weil es bei
     jedem neuen Trikot auf null geht. */
  tinteDrinGesamt: number
  tinteGesamt: number
  schrift: Schriftpunkt[]
  /** Signierte Trikots. */
  signiert: number
  /** Stift liegt auf. */
  schreibt: boolean
  /** Letzter Punkt, um die Strecke zu messen. */
  letzter: Punkt | null
  zeiger: { x: number; y: number; drin: boolean }
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  /** Läuft nach einem fertigen Autogramm; solange nimmt das Trikot nichts mehr an. */
  jubelUhr: number
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein): Welt {
  return {
    stufe,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    kader: verein?.kader?.length ? verein.kader : ERSATZ_KADER,
    trikot: 0,
    feld: autogrammFeld(stufe),
    tinte: 0,
    tinteDrinGesamt: 0,
    tinteGesamt: 0,
    schrift: [],
    signiert: 0,
    schreibt: false,
    letzter: null,
    zeiger: { x: W / 2, y: H + 50, drin: false },
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    jubelUhr: 0,
  }
}

/** Wessen Trikot gerade drankommt. Der Kader wiederholt sich — es kommen immer neue Fans. */
export const spielerVon = (w: Welt): Spieler => w.kader[w.trikot % w.kader.length]

/** 0–1, wie voll das laufende Autogramm ist. Treibt den Fortschrittsring (A1). */
export const anteil = (w: Welt) => klemme(w.tinte / zielTinte(w.stufe), 0, 1)

/* ── Schreiben ─────────────────────────────────────────────────────────── */

/** Stift aufgesetzt: der nächste Punkt beginnt einen neuen Strich. */
export function setzeAn(w: Welt) {
  w.schreibt = true
  w.letzter = null
}

export function hebeAb(w: Welt) {
  w.schreibt = false
  w.letzter = null
}

/**
 * Ein Zeigerpunkt bei aufliegendem Stift.
 *
 * Gezählt wird die **Strecke** seit dem letzten Punkt, nicht der Punkt selbst: sonst
 * füllte schnelles Tippen auf derselben Stelle das Autogramm.
 */
export function schreibe(w: Welt, x: number, y: number, d: Druck) {
  if (w.jubelUhr > 0) return
  const drin = imFeld(w.feld, x, y)
  const neu = w.letzter === null

  w.schrift.push({ x, y, drin, neu })
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true

  if (w.letzter) {
    const strecke = Math.hypot(x - w.letzter.x, y - w.letzter.y)
    w.tinteGesamt += strecke
    // Nur Strecke, die **ganz** im Feld liegt, zählt: Anfang und Ende drin.
    if (drin && imFeld(w.feld, w.letzter.x, w.letzter.y)) {
      w.tinte += strecke
      w.tinteDrinGesamt += strecke
    }
  }
  w.letzter = { x, y }

  if (w.tinte >= zielTinte(w.stufe)) {
    w.signiert++
    w.jubelUhr = JUBEL_SEK
  }
}

/** Nach dem Jubel: nächster Fan, nächstes Trikot, leeres Feld. */
function naechstesTrikot(w: Welt) {
  w.trikot++
  w.tinte = 0
  w.schrift = []
  w.letzter = null
  w.jubelUhr = 0
}

export function aktualisiere(w: Welt, dt: number) {
  w.zeitGesamt += dt
  if (w.jubelUhr > 0) {
    w.jubelUhr -= dt
    if (w.jubelUhr <= 0) naechstesTrikot(w)
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 (Sterne nach dem Lob) und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * Begonnen wird über `trikot` gezählt: während des Jubels ist das nächste Trikot noch
 * nicht da, und das laufende steckt bereits in `signiert`.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const begonnen = w.trikot + 1
  const geschafft = w.signiert + (w.jubelUhr > 0 ? 0 : anteil(w))
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'autogramme',
    dauerMs,
    vollstaendigkeit: klemme(geschafft / begonnen, 0, 1),
    genauigkeit: w.tinteGesamt === 0 ? 0 : klemme(w.tinteDrinGesamt / w.tinteGesamt, 0, 1),
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      signiert: w.signiert,
      trikotsBegonnen: begonnen,
      tinteImFeld: Math.round(w.tinteDrinGesamt),
      tinteGesamt: Math.round(w.tinteGesamt),
      feldBreite: feldBreite(w.stufe),
    },
  }
}
