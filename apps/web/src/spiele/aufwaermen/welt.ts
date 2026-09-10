/**
 * Zustand und Bewertung des Aufwärm-Parcours. Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Zwischen Anstoßpunkt und Tor steht eine Slalombahn aus Hütchen. Ben dribbelt
 * den Ball mit dem Stift im Bogen um jedes Hütchen herum. Fünf Durchgänge, dann ist
 * aufgewärmt — das ist die Endbedingung, nicht die Uhr.
 *
 * Die Regel ist dieselbe wie bei „Linie malen": **der Ball rollt nur weiter, solange der
 * Stift im Korridor liegt**, und er rollt nie zurück. Danebenfahren kostet Zeit, sonst
 * nichts (C2). Der Unterschied ist die Bahn — hier eine Welle statt einer Geraden, also
 * eine fortlaufende Handbewegung mit Richtungswechseln statt eines einzelnen Strichs.
 *
 * Bereiche: `wellen` und `hand-auge`. Der Andruck wird aufgezeichnet, ist hier aber nicht
 * das Kriterium — Kraftdosierung ist die Aufgabe von „Platzwart".
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export const BALL_R = 16
const BAHN_X0 = 120
const BAHN_X1 = 780

/** Aufgewärmt ist nach fünf Durchgängen — so steht es in der Anweisung im Katalog. */
export const RUNDEN = 5

/** So lange steht der Jubel nach einem Durchgang, bevor der nächste ausgelegt wird. */
export const JUBEL_SEK = 1.2

export type Punkt = { x: number; y: number }

/* ── Bahnen ────────────────────────────────────────────────────────────────
   B3 verlangt wechselnde Muster. Jeder Durchgang bekommt eine andere Welle: mal zwei weite
   Bögen, mal vier enge. Ben lernt dadurch keine einzelne Handbewegung auswendig.

   Feste Folge statt Zufall — aus demselben Grund wie bei „Linie malen": der Test braucht ein
   vorhersagbares Muster, und Thomas muss zwei Sitzungen vergleichen können. Bei zufälligen
   Wellen wäre der Messwert von Tag zu Tag ein anderer. */
const MUSTER: { boegen: number; amplitude: number }[] = [
  { boegen: 2, amplitude: 115 },
  { boegen: 3, amplitude: 90 },
  { boegen: 2, amplitude: 155 },
  { boegen: 4, amplitude: 80 },
  { boegen: 3, amplitude: 135 },
]

/** Auflösung der Polylinie. Feiner bringt nichts: die Toleranz ist zehnmal so breit. */
const STUETZEN = 96

const muster = (runde: number) => MUSTER[runde % MUSTER.length]

/** Die Bahn eines Durchgangs als Polylinie, von links nach rechts. */
export function bahnPunkte(runde: number): Punkt[] {
  const { boegen, amplitude } = muster(runde)
  const punkte: Punkt[] = []
  for (let i = 0; i <= STUETZEN; i++) {
    const u = i / STUETZEN
    punkte.push({
      x: BAHN_X0 + (BAHN_X1 - BAHN_X0) * u,
      y: H / 2 + Math.sin(u * boegen * Math.PI) * amplitude,
    })
  }
  return punkte
}

/** Wo die Hütchen stehen: auf den Scheiteln der Welle, als Strecke 0–1 auf der Bahn. */
export const huetchenAuf = (runde: number): number[] =>
  Array.from({ length: muster(runde).boegen }, (_, k) => (k + 0.5) / muster(runde).boegen)

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Halbe Korridorbreite in Bühnen-Pixeln, vom Therapeuten eingestellt und während des Spiels
   fest. Etwas großzügiger als bei „Linie malen": Aufwärmen soll gelingen, nicht prüfen.

   Startwerte, kein Messwert — mit echtem Pencil auf dem Zielgerät nachziehen. */
export const toleranz = (stufe: number) => Math.max(16, 56 - stufe * 6)

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** Ein Punkt der gezeichneten Spur. `daneben` färbt ihn und geht in die Genauigkeit. */
export type Spurpunkt = { x: number; y: number; daneben: boolean }

/** Was `ziehe` dem Aufrufer meldet, damit er einen Klang spielen kann (A1). */
export type Ereignis = 'huetchen' | 'geschafft' | null

export type Welt = {
  stufe: number
  farben: Verein['farben']
  /** Wievielter Durchgang, ab 0. Bestimmt zugleich die Wellenform. */
  runde: number
  bahn: Punkt[]
  /** Strecke 0–1 der Hütchen dieses Durchgangs, und ob sie schon umkurvt sind. */
  huetchen: number[]
  umkurvt: boolean[]
  /** 0–1 auf der Bahn. Wächst nur, nie zurück. */
  fortschritt: number
  zeiger: { x: number; y: number; drin: boolean }
  /** Stift liegt auf. */
  zieht: boolean
  /** Liegt der Stift gerade im Korridor? Färbt Ball und Korridor (A1). */
  imKorridor: boolean
  spur: Spurpunkt[]
  /** Abgeschlossene Durchgänge. */
  geschafft: number
  /** Alle Durchgänge fertig — die Endbedingung dieses Spiels. */
  fertig: boolean
  /** Messpunkte gesamt und davon im Korridor — daraus die Genauigkeit. */
  proben: number
  probenDrin: number
  huetchenGesamt: number
  huetchenUmkurvt: number
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  /** Läuft nach einem Durchgang; solange steht die Bahn still. */
  jubelUhr: number
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein): Welt {
  const huetchen = huetchenAuf(0)
  return {
    stufe,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    runde: 0,
    bahn: bahnPunkte(0),
    huetchen,
    umkurvt: huetchen.map(() => false),
    fortschritt: 0,
    zeiger: { x: W / 2, y: H + 50, drin: false },
    zieht: false,
    imKorridor: false,
    spur: [],
    geschafft: 0,
    fertig: false,
    proben: 0,
    probenDrin: 0,
    huetchenGesamt: huetchen.length,
    huetchenUmkurvt: 0,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    jubelUhr: 0,
  }
}

/* ── Geometrie ─────────────────────────────────────────────────────────── */

/**
 * Nächster Punkt auf der Bahn: Strecke 0–1 und Abstand quer dazu.
 *
 * ponytail: lineare Suche über alle 96 Segmente, rund elftausend Abstandsrechnungen je
 * Sekunde bei voller Pencil-Rate. Das ist nichts. Erst bei tausenden Stützpunkten lohnte
 * ein Gitter — dann von der letzten bekannten Strecke aus nach vorn suchen.
 */
export function aufBahn(bahn: Punkt[], x: number, y: number): { t: number; abstand: number } {
  let beste = { t: 0, abstand: Infinity }
  for (let i = 1; i < bahn.length; i++) {
    const a = bahn[i - 1]
    const b = bahn[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const u = klemme(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1)
    const abstand = Math.hypot(x - (a.x + u * dx), y - (a.y + u * dy))
    if (abstand < beste.abstand) beste = { t: (i - 1 + u) / (bahn.length - 1), abstand }
  }
  return beste
}

/** Punkt auf der Bahn bei Strecke t — die Ballposition. */
export function punktAuf(bahn: Punkt[], t: number): Punkt {
  const genau = klemme(t, 0, 1) * (bahn.length - 1)
  const i = Math.min(bahn.length - 2, Math.floor(genau))
  const u = genau - i
  return {
    x: bahn[i].x + (bahn[i + 1].x - bahn[i].x) * u,
    y: bahn[i].y + (bahn[i + 1].y - bahn[i].y) * u,
  }
}

export const ballPunkt = (w: Welt): Punkt => punktAuf(w.bahn, w.fortschritt)

/* ── Ziehen ────────────────────────────────────────────────────────────── */

/**
 * Ein Zeigerpunkt bei aufliegendem Stift.
 *
 * Der Ball rollt nur weiter, wenn der Punkt im Korridor liegt. Außerhalb wird die Probe
 * trotzdem gezählt — sonst könnte man neben der Bahn beliebig herumfahren, ohne dass es
 * die Genauigkeit berührt.
 *
 * Rückgabe ist das, was dazu klingen soll. Der Klang steht bewusst nicht hier: die Welt
 * bleibt dadurch ohne WebAudio testbar.
 */
export function ziehe(w: Welt, x: number, y: number, d: Druck): Ereignis {
  if (w.jubelUhr > 0 || w.fertig) return null

  const { t, abstand } = aufBahn(w.bahn, x, y)
  const drin = abstand <= toleranz(w.stufe)

  w.proben++
  if (drin) w.probenDrin++
  w.imKorridor = drin
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.spur.push({ x, y, daneben: !drin })

  // Monoton: nur vorwärts, und nur im Korridor.
  if (!drin || t <= w.fortschritt) return null
  w.fortschritt = t

  let ereignis: Ereignis = null

  // Ein Hütchen gilt als umkurvt, sobald der Ball daran vorbei ist. Es kann nur einmal
  // zählen — der Fortschritt geht nie zurück, also auch die Zählung nicht.
  for (let i = 0; i < w.huetchen.length; i++) {
    if (w.umkurvt[i] || w.fortschritt < w.huetchen[i]) continue
    w.umkurvt[i] = true
    w.huetchenUmkurvt++
    ereignis = 'huetchen'
  }

  if (w.fortschritt >= 1) {
    w.geschafft++
    w.jubelUhr = JUBEL_SEK
    return 'geschafft'
  }

  return ereignis
}

/** Nach dem Jubel: nächster Durchgang mit anderer Welle, frische Spur. */
function naechsterDurchgang(w: Welt) {
  w.jubelUhr = 0
  w.imKorridor = false

  // C2: kein Verliererzustand — das Spiel endet, weil es geschafft ist, nicht weil es
  // verloren wäre. Der SpielScreen beendet daraufhin das Segment.
  if (w.geschafft >= RUNDEN) {
    w.fertig = true
    return
  }

  w.runde++
  w.bahn = bahnPunkte(w.runde)
  w.huetchen = huetchenAuf(w.runde)
  w.umkurvt = w.huetchen.map(() => false)
  w.huetchenGesamt += w.huetchen.length
  w.fortschritt = 0
  w.spur = []
}

export function aktualisiere(w: Welt, dt: number) {
  if (w.fertig) return
  w.zeitGesamt += dt
  if (w.jubelUhr > 0) {
    w.jubelUhr -= dt
    if (w.jubelUhr <= 0) naechsterDurchgang(w)
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 (Sterne nach dem Lob) und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * `vollstaendigkeit` misst hier gegen die fünf Durchgänge, denn genau die sind die Aufgabe.
 * Läuft vorher die Uhr des SpielScreens ab, steht darin, wie weit Ben gekommen ist.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  const geschafft = w.geschafft + (w.jubelUhr > 0 || w.fertig ? 0 : w.fortschritt)
  return {
    spielId: 'aufwaermen',
    dauerMs,
    vollstaendigkeit: klemme(geschafft / RUNDEN, 0, 1),
    genauigkeit: w.proben === 0 ? 0 : w.probenDrin / w.proben,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      durchgaenge: w.geschafft,
      durchgaengeSoll: RUNDEN,
      huetchenUmkurvt: w.huetchenUmkurvt,
      huetchenGesamt: w.huetchenGesamt,
      proben: w.proben,
      probenDrin: w.probenDrin,
      toleranz: toleranz(w.stufe),
    },
  }
}
