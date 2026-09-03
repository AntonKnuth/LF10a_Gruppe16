/**
 * Zustand und Bewertung von „Platzwart" (Rasenmähen). Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Der Platz ist ein Raster aus hohem Gras. Der Mäher folgt dem Stift, und
 * **der Andruck im Moment der Berührung** entscheidet über jede Zelle:
 *
 *   zu leicht → die Messer greifen nicht, das Gras bleibt stehen. Einfach nochmal drüber.
 *   im Band   → sauber geschnitten.
 *   zu fest   → die Grasnarbe geht kaputt und bleibt braun.
 *
 * Bewusst **nur Druck, keine Pfadtreue** — auf einer Bahn zu bleiben ist die Aufgabe von
 * „Linie malen". Deshalb trägt dieses Spiel nur den Tag 'druckdosierung'.
 *
 * C2: kein Verliererzustand. Braune Stellen blockieren nichts und werden nie zurück-
 * genommen; das Spiel endet immer regulär — entweder ist der Platz fertig oder die Uhr
 * des SpielScreens läuft ab.
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export const SPALTEN = 24
export const ZEILEN = 14
export const ZELLE = 32
export const RASEN_B = SPALTEN * ZELLE
export const RASEN_H = ZEILEN * ZELLE
export const RASEN_X = (W - RASEN_B) / 2
/** Oben nur ein schmaler Rand — Anweisung und Timer stehen im SpielScreen, nicht hier.
 *  Unten bleibt Platz für die Druckanzeige. */
export const RASEN_Y = 90

/**
 * Schnittbreite des Mähers. Etwas breiter als eine Zelle — bei genau einer Zellenbreite
 * fühlt sich das Mähen an, als male man mit einem Bleistift einen Fußballplatz aus.
 */
export const MAEHER_R = 26

/** So lange bleibt der fertige Platz stehen, bevor das Ergebnis weitergeht. */
export const FERTIG_SEK = 1.6

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Die Toleranz stellt Thomas ein und sie bleibt während des Spiels fest. Eine
   selbstjustierende Toleranz wäre im Verlauf nicht mehr lesbar: der Messwert müsste
   dann für jede Zelle eine andere Anforderung mitführen.

   ACHTUNG: Die Zahlen sind ein Startwert, kein Messwert. Ein 7-Jähriger mit dem Pencil
   drückt anders als eine erwachsene Hand — beim ersten Test mit echtem Stift nachziehen. */
const DRUCK_MITTE = 0.5
export const halbesBand = (stufe: number) => Math.max(0.08, 0.3 - 0.03 * stufe)
export const bandUnten = (stufe: number) => DRUCK_MITTE - halbesBand(stufe)
export const bandOben = (stufe: number) => DRUCK_MITTE + halbesBand(stufe)

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ── Zustand ───────────────────────────────────────────────────────────── */
export type Zelle = 'ungemaeht' | 'gut' | 'kaputt'
export type Urteil = 'zu-leicht' | 'gut' | 'zu-fest'

/** Andruck → Urteil. Einzige Stelle, an der die Toleranz ausgewertet wird. */
export function urteil(druck: number, stufe: number): Urteil {
  if (druck < bandUnten(stufe)) return 'zu-leicht'
  if (druck > bandOben(stufe)) return 'zu-fest'
  return 'gut'
}

export type Welt = {
  stufe: number
  /** SPALTEN × ZEILEN, zeilenweise abgelegt. */
  zellen: Zelle[]
  farben: Verein['farben']
  /** Position des Mähers in Bühnenkoordinaten. */
  maeher: { x: number; y: number; drin: boolean }
  /** Letzter Andruck — färbt den Ring am Mäher, auch wenn gerade keine Zelle kippt (A1). */
  druck: Druck
  /** Stift liegt auf. */
  maeht: boolean
  /** Alle Andruckwerte, die beim Mähen anfielen. Grundlage für Mittel und Streuung. */
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  /** Läuft ab, sobald der Platz fertig ist — der fertige Rasen soll kurz stehen bleiben. */
  fertigUhr: number
  fertig: boolean
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein): Welt {
  return {
    stufe,
    zellen: Array<Zelle>(SPALTEN * ZEILEN).fill('ungemaeht'),
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    maeher: { x: W / 2, y: RASEN_Y + RASEN_H + 40, drin: false },
    druck: { wert: 0.5, synthetisch: true },
    maeht: false,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    fertigUhr: 0,
    fertig: false,
  }
}

/* ── Mähen ─────────────────────────────────────────────────────────────── */

/** Eine einzelne Zelle bearbeiten. */
function beruehre(w: Welt, sp: number, ze: number, druck: number) {
  if (sp < 0 || sp >= SPALTEN || ze < 0 || ze >= ZEILEN) return
  const i = ze * SPALTEN + sp
  // Einmal geschnitten oder kaputt ist endgültig: ein Rückweg über schon gemähtes Gras
  // soll gute Arbeit nicht nachträglich zerstören.
  if (w.zellen[i] !== 'ungemaeht') return
  const u = urteil(druck, w.stufe)
  // 'zu-leicht' lässt die Zelle bewusst unberührt — das ist die unbegrenzte
  // Wiederholung aus C2 und kein Fehlerzustand.
  if (u === 'zu-leicht') return
  w.zellen[i] = u === 'gut' ? 'gut' : 'kaputt'
}

/** Alles bearbeiten, was der Mäher an dieser Stelle überdeckt. */
function maeheBei(w: Welt, x: number, y: number, druck: number) {
  const sp0 = Math.floor((x - MAEHER_R - RASEN_X) / ZELLE)
  const sp1 = Math.floor((x + MAEHER_R - RASEN_X) / ZELLE)
  const ze0 = Math.floor((y - MAEHER_R - RASEN_Y) / ZELLE)
  const ze1 = Math.floor((y + MAEHER_R - RASEN_Y) / ZELLE)
  for (let ze = ze0; ze <= ze1; ze++) {
    for (let sp = sp0; sp <= sp1; sp++) {
      const mx = RASEN_X + (sp + 0.5) * ZELLE
      const my = RASEN_Y + (ze + 0.5) * ZELLE
      if ((mx - x) ** 2 + (my - y) ** 2 <= MAEHER_R ** 2) beruehre(w, sp, ze, druck)
    }
  }
}

/**
 * Mäht die Strecke zwischen zwei Zeigerpunkten.
 *
 * Die Zwischenschritte sind nicht Kosmetik: eine schnelle Handbewegung liefert nur alle
 * paar Zentimeter ein Ereignis. Ohne Interpolation blieben Streifen stehen, die Ben nie
 * ausgelassen hat — und die Vollständigkeit würde ihn dafür bestrafen.
 */
export function maehe(w: Welt, x0: number, y0: number, x1: number, y1: number, d: Druck) {
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  const schritte = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (ZELLE / 2)))
  for (let i = 1; i <= schritte; i++) {
    const t = i / schritte
    maeheBei(w, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, d.wert)
  }
}

export function zaehle(w: Welt) {
  let gut = 0
  let kaputt = 0
  for (const z of w.zellen) {
    if (z === 'gut') gut++
    else if (z === 'kaputt') kaputt++
  }
  return { gut, kaputt, offen: w.zellen.length - gut - kaputt, gesamt: w.zellen.length }
}

export function aktualisiere(w: Welt, dt: number) {
  w.zeitGesamt += dt
  if (w.fertig) return
  if (w.fertigUhr > 0) {
    w.fertigUhr -= dt
    if (w.fertigUhr <= 0) w.fertig = true
    return
  }
  if (zaehle(w).offen === 0) w.fertigUhr = FERTIG_SEK
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 (Sterne nach dem Lob) und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { gut, kaputt, offen, gesamt } = zaehle(w)
  const bearbeitet = gut + kaputt
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'rasenmaehen',
    dauerMs,
    vollstaendigkeit: gesamt === 0 ? 0 : bearbeitet / gesamt,
    genauigkeit: bearbeitet === 0 ? 0 : gut / bearbeitet,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: { zellenGesamt: gesamt, gut, kaputt, ungemaeht: offen },
  }
}
