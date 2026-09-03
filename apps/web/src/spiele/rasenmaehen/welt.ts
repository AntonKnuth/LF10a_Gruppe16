/**
 * Zustand und Bewertung von „Platzwart" (Rasenmähen). Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Der Platz besteht aus Flecken mit **unterschiedlichem Grasstand**, und jeder
 * Grasstand will anders angefasst werden. Der Mäher folgt dem Stift; der Andruck **im
 * Moment der Berührung** entscheidet über jede Zelle:
 *
 *   zu leicht → die Messer greifen nicht, das Gras bleibt stehen. Einfach nochmal drüber.
 *   im Band   → sauber geschnitten.
 *   zu fest   → die Grasnarbe geht kaputt und bleibt braun.
 *
 * Der Witz sind die Zonen: junge Saat verträgt kaum Druck, hohes Gras braucht viel. Es
 * gibt **keinen Andruck, der überall passt** — genau das ist die Kraftdosierung aus B2.
 * Mit einem festen Wert (Tastatur-Ersatzdruck) kommt man nicht durch.
 *
 * Bewusst **nur Druck, keine Pfadtreue** — auf einer Bahn zu bleiben ist die Aufgabe von
 * „Linie malen". Deshalb trägt dieses Spiel nur den Tag 'druckdosierung'.
 *
 * C2: kein Verliererzustand. Braune Stellen blockieren nichts und werden nie zurück-
 * genommen. Ist ein Platz geschafft, kommt der nächste — beendet wird ausschließlich von
 * der Uhr des SpielScreens.
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export const SPALTEN = 24
export const ZEILEN = 12
export const ZELLE = 32
export const RASEN_B = SPALTEN * ZELLE
export const RASEN_H = ZEILEN * ZELLE
export const RASEN_X = (W - RASEN_B) / 2
/** Anweisung und Timer stehen im SpielScreen; unten bleibt Platz für die Druckanzeige. */
export const RASEN_Y = 120

/**
 * Schnittbreite des Mähers. Etwas breiter als eine Zelle — bei genau einer Zellenbreite
 * fühlt sich das Mähen an, als male man mit einem Bleistift einen Fußballplatz aus.
 */
export const MAEHER_R = 26

/** So lange bleibt der fertige Platz stehen, bevor der nächste anfängt. */
export const FERTIG_SEK = 1.8

/* ── Wuchszonen ────────────────────────────────────────────────────────────
   Der Kern der Übung. Jeder Grasstand hat einen eigenen Ziel-Andruck; die Zone bestimmt
   die **Mitte** des erlaubten Bandes, die Stufe seine **Breite**. */
export type Zone = 'jung' | 'normal' | 'hoch'

const ZONEN: Zone[] = ['jung', 'normal', 'hoch']

/**
 * Ziel-Andruck je Zone. Geraten, nicht gemessen — mit der Maus lässt sich das nicht
 * beurteilen. Vor der Abgabe mit echtem Pencil nachziehen.
 */
export const ZONE_MITTE: Record<Zone, number> = { jung: 0.25, normal: 0.5, hoch: 0.75 }

/** Kantenlänge eines Zonenflecks in Zellen. */
export const BLOCK = 4

/**
 * Zone eines Feldes. Bewusst eine feste Formel statt Zufall: der Test braucht ein
 * vorhersagbares Muster, und das Ergebnis ist ein diagonaler Flickenteppich — dadurch
 * kreuzt **jede** Mährichtung Zonengrenzen, egal wie Ben fährt.
 *
 * `platz` verschiebt das Muster, damit der zweite Platz anders aussieht als der erste.
 */
export function zoneVon(sp: number, ze: number, platz: number): Zone {
  const bx = Math.floor(sp / BLOCK)
  const by = Math.floor(ze / BLOCK)
  return ZONEN[(bx * 7 + by * 13 + platz * 5) % ZONEN.length]
}

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Die Toleranz stellt Thomas ein und sie bleibt während des Spiels fest. Eine
   selbstjustierende Toleranz wäre im Verlauf nicht mehr lesbar: der Messwert müsste
   dann für jede Zelle eine andere Anforderung mitführen.

   Bei Stufe 3 ist das halbe Band 0,21 — die Bänder der Zonen überlappen sich also
   teilweise. Das ist Absicht: ein 7-Jähriger trifft mit dem Pencil keine exakten Werte,
   und C2 verlangt Nachsicht. Unter 0,125 wären drei getrennte Andrücke erzwungen. */
export const halbesBand = (stufe: number) => Math.max(0.08, 0.3 - 0.03 * stufe)
export const bandUnten = (stufe: number, zone: Zone) => ZONE_MITTE[zone] - halbesBand(stufe)
export const bandOben = (stufe: number, zone: Zone) => ZONE_MITTE[zone] + halbesBand(stufe)

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ── Zustand ───────────────────────────────────────────────────────────── */
export type Zelle = 'ungemaeht' | 'gut' | 'kaputt'
export type Urteil = 'zu-leicht' | 'gut' | 'zu-fest'

/** Andruck → Urteil. Einzige Stelle, an der die Toleranz ausgewertet wird. */
export function urteil(druck: number, stufe: number, zone: Zone): Urteil {
  if (druck < bandUnten(stufe, zone)) return 'zu-leicht'
  if (druck > bandOben(stufe, zone)) return 'zu-fest'
  return 'gut'
}

export type Welt = {
  stufe: number
  /** SPALTEN × ZEILEN, zeilenweise abgelegt. Immer der **laufende** Platz. */
  zellen: Zelle[]
  farben: Verein['farben']
  /** Wievielter Platz, ab 0. Verschiebt zugleich das Zonenmuster. */
  platz: number
  /** Summen der bereits **abgeschlossenen** Plätze, für das Ergebnis. */
  erledigt: { gut: number; kaputt: number; zellen: number }
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
  /** Der Platz ist geschafft und bleibt kurz stehen, bevor der nächste anfängt. */
  platzFertig: boolean
  fertigUhr: number
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein): Welt {
  return {
    stufe,
    zellen: Array<Zelle>(SPALTEN * ZEILEN).fill('ungemaeht'),
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    platz: 0,
    erledigt: { gut: 0, kaputt: 0, zellen: 0 },
    maeher: { x: W / 2, y: RASEN_Y + RASEN_H + 40, drin: false },
    druck: { wert: 0.5, synthetisch: true },
    maeht: false,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    platzFertig: false,
    fertigUhr: 0,
  }
}

/** Zone unter einem Punkt der Bühne. Außerhalb des Platzes gilt der mittlere Grasstand. */
export function zoneBei(w: Welt, x: number, y: number): Zone {
  const sp = Math.floor((x - RASEN_X) / ZELLE)
  const ze = Math.floor((y - RASEN_Y) / ZELLE)
  if (sp < 0 || sp >= SPALTEN || ze < 0 || ze >= ZEILEN) return 'normal'
  return zoneVon(sp, ze, w.platz)
}

/* ── Mähen ─────────────────────────────────────────────────────────────── */

/** Eine einzelne Zelle bearbeiten. */
function beruehre(w: Welt, sp: number, ze: number, druck: number, zone: Zone) {
  const i = ze * SPALTEN + sp
  // Einmal geschnitten oder kaputt ist endgültig: ein Rückweg über schon gemähtes Gras
  // soll gute Arbeit nicht nachträglich zerstören.
  if (w.zellen[i] !== 'ungemaeht') return
  const u = urteil(druck, w.stufe, zone)
  // 'zu-leicht' lässt die Zelle bewusst unberührt — das ist die unbegrenzte
  // Wiederholung aus C2 und kein Fehlerzustand.
  if (u === 'zu-leicht') return
  w.zellen[i] = u === 'gut' ? 'gut' : 'kaputt'
}

/**
 * Alles bearbeiten, was der Mäher an dieser Stelle überdeckt — aber **nur den Grasstand,
 * auf dem er steht**.
 *
 * Der Mäher ist breiter als eine Zelle und überdeckt an jeder Zonengrenze zwangsläufig
 * zwei Grasstände. Würde er beide mit demselben Andruck bearbeiten, ginge an jeder Grenze
 * unvermeidlich etwas kaputt — eine Strafe für Geometrie statt für falsches Dosieren.
 * Nachbarflecken bleiben deshalb unangetastet und werden mit dem passenden Andruck
 * nachgeholt (C2: Wiederholung statt Bestrafung).
 */
function maeheBei(w: Welt, x: number, y: number, druck: number) {
  const mSp = Math.floor((x - RASEN_X) / ZELLE)
  const mZe = Math.floor((y - RASEN_Y) / ZELLE)
  if (mSp < 0 || mSp >= SPALTEN || mZe < 0 || mZe >= ZEILEN) return
  const zone = zoneVon(mSp, mZe, w.platz)

  const sp0 = Math.max(0, Math.floor((x - MAEHER_R - RASEN_X) / ZELLE))
  const sp1 = Math.min(SPALTEN - 1, Math.floor((x + MAEHER_R - RASEN_X) / ZELLE))
  const ze0 = Math.max(0, Math.floor((y - MAEHER_R - RASEN_Y) / ZELLE))
  const ze1 = Math.min(ZEILEN - 1, Math.floor((y + MAEHER_R - RASEN_Y) / ZELLE))
  for (let ze = ze0; ze <= ze1; ze++) {
    for (let sp = sp0; sp <= sp1; sp++) {
      if (zoneVon(sp, ze, w.platz) !== zone) continue
      const mx = RASEN_X + (sp + 0.5) * ZELLE
      const my = RASEN_Y + (ze + 0.5) * ZELLE
      if ((mx - x) ** 2 + (my - y) ** 2 <= MAEHER_R ** 2) beruehre(w, sp, ze, druck, zone)
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
  // Während der fertige Platz stehen bleibt, wird nicht gemäht.
  if (w.platzFertig) return
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

/** Der Platz ist geschafft — Bilanz sichern und einen frischen Platz auslegen. */
function naechsterPlatz(w: Welt) {
  const { gut, kaputt, gesamt } = zaehle(w)
  w.erledigt.gut += gut
  w.erledigt.kaputt += kaputt
  w.erledigt.zellen += gesamt
  w.platz++
  w.zellen.fill('ungemaeht')
  w.platzFertig = false
  w.fertigUhr = 0
}

export function aktualisiere(w: Welt, dt: number) {
  w.zeitGesamt += dt
  if (w.platzFertig) {
    w.fertigUhr -= dt
    if (w.fertigUhr <= 0) naechsterPlatz(w)
    return
  }
  if (zaehle(w).offen === 0) {
    w.platzFertig = true
    w.fertigUhr = FERTIG_SEK
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 (Sterne nach dem Lob) und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * Weil pro Einheit mehrere Plätze anfallen können, misst `vollstaendigkeit` den Anteil
 * des **ausgegebenen** Rasens, nicht den eines festen Platzes. Bleibt 0–1 und über
 * Sitzungen vergleichbar, ist aber beim Auswerten in C# zu beachten.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const jetzt = zaehle(w)
  const gut = w.erledigt.gut + jetzt.gut
  const kaputt = w.erledigt.kaputt + jetzt.kaputt
  const ausgegeben = w.erledigt.zellen + jetzt.gesamt
  const bearbeitet = gut + kaputt
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'rasenmaehen',
    dauerMs,
    vollstaendigkeit: ausgegeben === 0 ? 0 : bearbeitet / ausgegeben,
    genauigkeit: bearbeitet === 0 ? 0 : gut / bearbeitet,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      plaetzeFertig: w.platz,
      zellenGesamt: ausgegeben,
      gut,
      kaputt,
      ungemaeht: jetzt.offen,
    },
  }
}
