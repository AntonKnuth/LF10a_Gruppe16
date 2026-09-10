/**
 * Zustand und Bewertung von „Brezelverkauf". Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Ben ist der Verkäufer mit dem Bauchladen und steht unten am Innenrand der
 * Tribüne. Ringsum sitzen Zuschauer. Über einem von ihnen erscheint eine Sprechblase mit
 * einer Brezel oder einem Becher. Ben zeichnet mit dem Stift den Weg dorthin — **entlang der
 * Wege der Tribüne**, also über die umlaufenden Ränge und die Treppen dazwischen. Die Figur
 * läuft los, während er zeichnet.
 *
 * Die Regeln, aus denen alles folgt:
 * 1. Ein neuer Weg beginnt **immer beim Verkäufer**. Der Stift muss dort aufgesetzt werden.
 * 2. Die Figur folgt dem gezeichneten Weg, **höchstens im Schritttempo**. Zeichnet Ben
 *    schneller, läuft sie hinterher und holt auf.
 * 3. Beim Absetzen bleibt der Weg liegen; die Figur läuft ihn zu Ende und bleibt dann stehen.
 * 4. Neben dem Weg — quer durch die Sitzreihen — kommt sie nur **schleichend** voran. Das
 *    macht die Wege wertvoll, ohne dass etwas kaputtgeht (C2).
 * 5. Läuft sie in einen Zuschauer, bricht der Weg ab und sie wird ein Stück zurückgeschoben.
 *
 * Bereiche: `gerade-striche` (Ecken und Richtungswechsel statt einer einzelnen Geraden) und
 * `hand-auge` (den bewegten Zuschauern ausweichen).
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

/** Mitte des Stadions — dort liegt das Spielfeld, ringsum die Tribüne. */
export const MITTE = { x: 450, y: 320 }

export type Punkt = { x: number; y: number }

/** Die drei umlaufenden Ränge als Halbachsen einer Ellipse. */
const RAENGE = [
  { rx: 210, ry: 132 },
  { rx: 300, ry: 196 },
  { rx: 390, ry: 262 },
]

/** So viele Treppen verbinden die Ränge. Sie sind die einzigen Übergänge nach außen. */
const TREPPEN = 8

/** Auflösung eines Rangs als Polylinie. */
const ECKEN = 72

export const aufEllipse = (rx: number, ry: number, winkel: number): Punkt => ({
  x: MITTE.x + Math.cos(winkel) * rx,
  y: MITTE.y + Math.sin(winkel) * ry,
})

/** Ein Weg ist eine Polylinie. Mehr braucht das Netz nicht — es wird nie durchsucht,
 *  sondern nur nach dem Abstand gefragt. */
export type Weg = Punkt[]

function baueWege(): Weg[] {
  const wege: Weg[] = []

  // Die Ränge, jeder als geschlossener Ring.
  for (const r of RAENGE) {
    const ring: Weg = []
    for (let i = 0; i <= ECKEN; i++) ring.push(aufEllipse(r.rx, r.ry, (i / ECKEN) * Math.PI * 2))
    wege.push(ring)
  }

  // Die Treppen, jede vom innersten bis zum äußersten Rang.
  for (let k = 0; k < TREPPEN; k++) {
    const winkel = (k / TREPPEN) * Math.PI * 2
    wege.push(RAENGE.map((r) => aufEllipse(r.rx, r.ry, winkel)))
  }

  return wege
}

/** Das Wegenetz steht fest — es hängt weder an der Stufe noch am Verein. */
export const WEGE = baueWege()

/* ── Sitzplätze ────────────────────────────────────────────────────────────
   Zwischen je zwei Rängen liegt ein Block Sitzplätze. Die Plätze sitzen bewusst versetzt
   zu den Treppen: sonst stünde ein Zuschauer mitten im Weg. */

export type Platz = { x: number; y: number; winkel: number; block: number }

function bauePlaetze(): Platz[] {
  const plaetze: Platz[] = []
  for (let block = 0; block < RAENGE.length - 1; block++) {
    const innen = RAENGE[block]
    const aussen = RAENGE[block + 1]
    const rx = (innen.rx + aussen.rx) / 2
    const ry = (innen.ry + aussen.ry) / 2
    const anzahl = 24
    for (let i = 0; i < anzahl; i++) {
      // Halber Schritt Versatz, damit kein Platz auf einer Treppe liegt.
      const winkel = ((i + 0.5) / anzahl) * Math.PI * 2
      plaetze.push({ ...aufEllipse(rx, ry, winkel), winkel, block })
    }
  }
  return plaetze
}

export const PLAETZE = bauePlaetze()

/** Nah genug, um über die Reihe hinweg zu reichen. */
export const ABGABE_ABSTAND = 52

/** So nah am Verkäufer muss der Stift aufgesetzt werden, damit ein Weg beginnt. */
export const GREIF_ABSTAND = 95

/** Ab hier ist es ein Zusammenstoß. */
export const STOSS_ABSTAND = 30

/** So weit schiebt ein Zuschauer die Figur zurück. */
export const RUECKSTOSS = 80

/** So lange ist die Figur nach einem Stoß unempfindlich — sonst stößt derselbe
 *  Zuschauer sie in jedem Einzelbild erneut. */
const PRELL_SEK = 1.0

/** So lange steht das „Vielen Dank", bevor die nächste Bestellung kommt. */
export const DANK_SEK = 1.6

/** So lange wackelt das Bild nach einem Zusammenstoß. */
export const WACKEL_SEK = 0.45

export const DANK_SPRUECHE = [
  'Vielen Dank!',
  'Das ging aber schnell!',
  'Genau richtig, danke dir!',
  'Super Service!',
  'Danke, du bist der Beste!',
]

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Die Stufe stellt Thomas ein und sie bleibt während des Spiels fest. Sie ändert dreierlei:
   wie breit der Weg ist, wie viele Zuschauer herumlaufen und wie schnell die Figur geht.

   Startwerte, kein Messwert — mit echtem Pencil auf dem Zielgerät nachziehen. */

/** Halbe Wegbreite in Bühnen-Pixeln. */
export const toleranz = (stufe: number) => Math.max(14, 46 - stufe * 5)

/** Schritttempo in Bühnen-Pixeln je Sekunde. */
export const tempo = (stufe: number) => 150 + stufe * 20

export const anzahlLaeufer = (stufe: number) => 1 + stufe

/** Quer durch die Sitzreihen geht es nur schleichend voran. */
const NEBENWEG_TEMPO = 0.3

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** Ein Punkt des gezeichneten Wegs. `daneben` färbt ihn und geht in die Genauigkeit. */
export type Wegpunkt = { x: number; y: number; daneben: boolean }

/** Ein Zuschauer, der auf einem Rang entlangläuft. */
export type Laeufer = { rang: number; winkel: number; drehung: number }

/** Was `ziehe` und `aktualisiere` melden, damit der Aufrufer Klang und Vibration auslöst. */
export type Ereignis = 'abgabe' | 'stoss' | null

export type Welt = {
  stufe: number
  farben: Verein['farben']
  /** Der gezeichnete Weg. Erster Punkt ist immer der Standort des Verkäufers. */
  linie: Wegpunkt[]
  /** Wie weit die Figur auf diesem Weg schon gelaufen ist, in Pixeln. */
  gelaufen: number
  zieht: boolean
  /** Liegt der Stift gerade auf einem Weg der Tribüne? Färbt die Linie (A1). */
  aufWeg: boolean
  laeufer: Laeufer[]
  /** Der Platz, an dem gerade jemand etwas bestellt hat. */
  besteller: Platz | null
  wunsch: 'brezel' | 'getraenk'
  /** Index in `PLAETZE` — von hier aus wird der nächste Besteller gesucht. */
  bestellerIndex: number
  erledigt: number
  begonnen: number
  kollisionen: number
  dankUhr: number
  dankSpruch: string
  wackelUhr: number
  prellUhr: number
  proben: number
  probenDrin: number
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
}

/** Der Verkäufer startet unten am innersten Rang, dort wo Ben den Stift zuerst vermutet. */
export const START: Punkt = aufEllipse(RAENGE[0].rx, RAENGE[0].ry, Math.PI / 2)

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein): Welt {
  const w: Welt = {
    stufe,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    linie: [{ ...START, daneben: false }],
    gelaufen: 0,
    zieht: false,
    aufWeg: true,
    laeufer: Array.from({ length: anzahlLaeufer(stufe) }, (_, i) => ({
      // Verteilt über die beiden äußeren Ränge und rundherum — nie direkt auf dem Start.
      rang: 1 + (i % 2),
      winkel: ((i + 1) / (anzahlLaeufer(stufe) + 1)) * Math.PI * 2,
      drehung: (i % 2 === 0 ? 1 : -1) * (0.16 + 0.03 * i),
    })),
    besteller: null,
    wunsch: 'brezel',
    bestellerIndex: 0,
    erledigt: 0,
    begonnen: 0,
    kollisionen: 0,
    dankUhr: 0,
    dankSpruch: '',
    wackelUhr: 0,
    prellUhr: 0,
    proben: 0,
    probenDrin: 0,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
  }
  naechsteBestellung(w)
  return w
}

/* ── Geometrie ─────────────────────────────────────────────────────────── */

export const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Abstand zum nächstgelegenen Weg der Tribüne.
 *
 * ponytail: lineare Suche über alle rund 230 Teilstücke des Netzes, also grob 28.000
 * Abstandsrechnungen je Sekunde bei voller Pencil-Rate. Das ist nichts. Erst bei einem
 * vielfach größeren Netz lohnte ein Gitter über die Bühne.
 */
export function abstandZumWeg(x: number, y: number): number {
  let beste = Infinity
  for (const weg of WEGE) {
    for (let i = 1; i < weg.length; i++) {
      const a = weg[i - 1]
      const b = weg[i]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const u = klemme(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1)
      const d = Math.hypot(x - (a.x + u * dx), y - (a.y + u * dy))
      if (d < beste) beste = d
    }
  }
  return beste
}

export const aufWeg = (w: Welt, x: number, y: number) => abstandZumWeg(x, y) <= toleranz(w.stufe)

/** Gesamtlänge des gezeichneten Wegs in Pixeln. */
export function wegLaenge(linie: Wegpunkt[]): number {
  let l = 0
  for (let i = 1; i < linie.length; i++) l += abstand(linie[i - 1], linie[i])
  return l
}

/** Wo die Figur steht: der Punkt bei `gelaufen` Pixeln auf dem gezeichneten Weg. */
export function verkaeufer(w: Welt): Punkt {
  let rest = w.gelaufen
  for (let i = 1; i < w.linie.length; i++) {
    const l = abstand(w.linie[i - 1], w.linie[i])
    if (rest <= l) {
      const u = l === 0 ? 0 : rest / l
      return {
        x: w.linie[i - 1].x + (w.linie[i].x - w.linie[i - 1].x) * u,
        y: w.linie[i - 1].y + (w.linie[i].y - w.linie[i - 1].y) * u,
      }
    }
    rest -= l
  }
  return { ...w.linie[w.linie.length - 1] }
}

/** Position eines herumlaufenden Zuschauers. */
export const laeuferPunkt = (l: Laeufer): Punkt =>
  aufEllipse(RAENGE[l.rang].rx, RAENGE[l.rang].ry, l.winkel)

/** Schneidet den Weg bei `laenge` ab. Was dahinter lag, ist weg. */
function kuerze(linie: Wegpunkt[], laenge: number): Wegpunkt[] {
  const neu: Wegpunkt[] = [linie[0]]
  let rest = laenge
  for (let i = 1; i < linie.length; i++) {
    const l = abstand(linie[i - 1], linie[i])
    if (rest <= l) {
      const u = l === 0 ? 0 : rest / l
      neu.push({
        x: linie[i - 1].x + (linie[i].x - linie[i - 1].x) * u,
        y: linie[i - 1].y + (linie[i].y - linie[i - 1].y) * u,
        daneben: linie[i].daneben,
      })
      return neu
    }
    neu.push(linie[i])
    rest -= l
  }
  return neu
}

/* ── Zeichnen des Wegs ─────────────────────────────────────────────────── */

/**
 * Stift aufgesetzt. Ein Weg beginnt immer beim Verkäufer — sonst stünde die Figur an einer
 * Stelle und der Weg an einer ganz anderen.
 *
 * Rückgabe sagt, ob es geklappt hat. Beim Danebentippen passiert nichts; das Bild zeigt
 * einen Ring um den Verkäufer, damit klar ist, wo es losgeht (C2: Hilfe statt Fehler).
 */
export function beginne(w: Welt, x: number, y: number): boolean {
  const figur = verkaeufer(w)
  if (abstand(figur, { x, y }) > GREIF_ABSTAND) return false
  w.linie = [{ ...figur, daneben: !aufWeg(w, figur.x, figur.y) }]
  w.gelaufen = 0
  w.zieht = true
  return true
}

/** Ein Zeigerpunkt bei aufliegendem Stift. Verlängert den Weg. */
export function ziehe(w: Welt, x: number, y: number, d: Druck) {
  if (!w.zieht) return
  const letzter = w.linie[w.linie.length - 1]
  // Zu kleine Schritte bringen nichts und blähen nur die Liste auf.
  if (abstand(letzter, { x, y }) < 4) return

  const drin = aufWeg(w, x, y)
  w.proben++
  if (drin) w.probenDrin++
  w.aufWeg = drin
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.linie.push({ x, y, daneben: !drin })
}

/** Stift abgesetzt. Der Weg bleibt liegen, die Figur läuft ihn zu Ende. */
export function hebeAb(w: Welt) {
  w.zieht = false
}

/* ── Lauf der Dinge ────────────────────────────────────────────────────── */

/** Sucht den nächsten Besteller. Fester Schritt statt Zufall: der Test braucht ein
 *  vorhersagbares Muster, und die Plätze wechseln trotzdem über die ganze Tribüne. */
function naechsteBestellung(w: Welt) {
  w.bestellerIndex = (w.bestellerIndex + 17) % PLAETZE.length
  w.besteller = PLAETZE[w.bestellerIndex]
  w.wunsch = w.bestellerIndex % 2 === 0 ? 'brezel' : 'getraenk'
  w.begonnen++
}

/** Ein Zusammenstoß: der Weg bricht ab, die Figur wird zurückgeschoben, das Bild wackelt. */
function stoss(w: Welt) {
  w.kollisionen++
  w.gelaufen = Math.max(0, w.gelaufen - RUECKSTOSS)
  // Erst zurückschieben, dann kürzen — sonst läge vor der Figur noch ein Stück Weg und
  // sie liefe demselben Zuschauer sofort wieder in die Arme.
  w.linie = kuerze(w.linie, w.gelaufen)
  w.zieht = false
  w.wackelUhr = WACKEL_SEK
  w.prellUhr = PRELL_SEK
}

export function aktualisiere(w: Welt, dt: number): Ereignis {
  w.zeitGesamt += dt
  if (w.wackelUhr > 0) w.wackelUhr -= dt
  if (w.prellUhr > 0) w.prellUhr -= dt

  for (const l of w.laeufer) l.winkel += l.drehung * dt

  if (w.dankUhr > 0) {
    w.dankUhr -= dt
    if (w.dankUhr <= 0) naechsteBestellung(w)
    return null
  }

  // Die Figur läuft dem Stift hinterher, höchstens im Schritttempo. Quer durch die
  // Sitzreihen kommt sie kaum voran — die Wege sind der schnelle Weg, nicht der einzige.
  const figur = verkaeufer(w)
  const schnell = aufWeg(w, figur.x, figur.y)
  const schritt = tempo(w.stufe) * (schnell ? 1 : NEBENWEG_TEMPO) * dt
  w.gelaufen = Math.min(w.gelaufen + schritt, wegLaenge(w.linie))

  const jetzt = verkaeufer(w)

  if (w.prellUhr <= 0) {
    for (const l of w.laeufer) {
      if (abstand(jetzt, laeuferPunkt(l)) > STOSS_ABSTAND) continue
      stoss(w)
      return 'stoss'
    }
  }

  if (w.besteller && abstand(jetzt, w.besteller) <= ABGABE_ABSTAND) {
    w.erledigt++
    w.dankSpruch = DANK_SPRUECHE[(w.erledigt - 1) % DANK_SPRUECHE.length]
    // Der Besteller bleibt stehen — die Blase zeigt jetzt den Dank statt des Wunsches. Ein
    // zweites Auslösen ist ausgeschlossen, weil `dankUhr > 0` oben vorher zurückkehrt.
    w.dankUhr = DANK_SEK
    return 'abgabe'
  }

  return null
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * Das Spiel endet mit der Uhr des SpielScreens, nicht mit einer festen Zahl Bestellungen.
 * `vollstaendigkeit` misst deshalb den Anteil der Bestellungen, die auch beliefert wurden —
 * die gerade offene zählt als nicht erledigt.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'brezelverkauf',
    dauerMs,
    vollstaendigkeit: w.begonnen === 0 ? 0 : klemme(w.erledigt / w.begonnen, 0, 1),
    genauigkeit: w.proben === 0 ? 0 : w.probenDrin / w.proben,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      beliefert: w.erledigt,
      bestellungen: w.begonnen,
      zusammenstoesse: w.kollisionen,
      proben: w.proben,
      probenDrin: w.probenDrin,
      toleranz: toleranz(w.stufe),
    },
  }
}
