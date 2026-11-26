/**
 * Zustand und Bewertung von „Linie malen". Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Der Ball liegt am Anfang einer Bahn, am Ende steht das Tor. Ben zieht den
 * Ball mit dem Stift zum Tor und soll dabei **auf der Linie bleiben**.
 *
 * Die eine Regel, aus der alles folgt: **der Ball rollt nur weiter, solange der Stift im
 * Korridor ist.** Verlässt Ben die Bahn, bleibt der Ball stehen und wartet — er rollt nie
 * zurück und es geht nie etwas kaputt (C2). Abweichen kostet Zeit, sonst nichts.
 *
 * Der Fortschritt ist **monoton**: einmal erreichte Strecke bleibt erreicht. Sonst könnte
 * man den Stift auf der Bahn hin- und herschrubben und käme ohne gerade Linie ans Ziel.
 *
 * Nur `gerade-striche` — Andruck wird zwar aufgezeichnet, ist hier aber nicht das
 * Kriterium. Kraftdosierung ist die Aufgabe von „Platzwart".
 */

import * as Funken from '../funken'
import { klemme } from '../geometrie'
import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { VORGABE_REGLER, musterNochmal, type Regler } from '../regler'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export const BALL_R = 17
/** Waagerechte Ausdehnung jeder Bahn — Start links, Tor rechts. */
const BAHN_X0 = 130
const BAHN_X1 = 742

/** So lange steht der Jubel nach einem Tor, bevor die nächste Bahn kommt. */
export const JUBEL_SEK = 1.5

export type Punkt = { x: number; y: number }

/* ── Funken (A1) ───────────────────────────────────────────────────────────
   Ein kurzer Funkenstoß am Tor, sonst nichts. Ben hat ADHS (A2): es flackert nichts
   dauerhaft, jeder Funke lebt genau FUNKEN_SEK und die Zahl ist hart begrenzt.
   Kein Zufall: die Richtung folgt aus der Nummer des Funkens — so ist jeder Test
   wiederholbar. */
export const FUNKEN_SEK = 0.8
export const FUNKEN_MAX = 24

/** So sehen die Funken dieses Spiels aus; die Mechanik steht in funken.ts. */
const STOSS: Funken.Stossart = { leben: FUNKEN_SEK, max: FUNKEN_MAX, tempo: 160, tempoStufe: 60, auftrieb: 80 }

/** Was `ziehe` dem Aufrufer meldet, damit er einen Klang spielen kann (A1). */
export type Ereignis = 'etappe' | 'tor'

/** Ab diesem Anteil der Bahn gibt es einen kleinen Ton — danach nicht mehr, kein Dauerton (A4). */
const ETAPPEN = [0.25, 0.5, 0.75]

/* ── Bahnen ────────────────────────────────────────────────────────────────
   B3 verlangt **wechselnde Muster**. Die Bahn ist immer gerade — das ist der Sinn der
   Übung — aber ihre Neigung wechselt von Runde zu Runde, damit Ben nicht eine einzige
   Handbewegung auswendig lernt.

   Feste Folge statt Zufall: der Test braucht ein vorhersagbares Muster, und Thomas soll
   im Verlauf zwei Sitzungen vergleichen können. Zufällige Neigungen machten den Messwert
   von Tag zu Tag unvergleichbar. */
const VERSATZ = [0, -150, 150, -240, 240, -80, 80]

export function bahn(runde: number): { a: Punkt; b: Punkt } {
  const v = VERSATZ[runde % VERSATZ.length]
  const mitte = H / 2 + 24
  return {
    a: { x: BAHN_X0, y: mitte + v / 2 },
    b: { x: BAHN_X1, y: mitte - v / 2 },
  }
}

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Die Toleranz stellt Thomas ein und sie bleibt während des Spiels fest. Eine
   selbstjustierende Toleranz wäre im Verlauf nicht mehr lesbar: der Messwert müsste
   dann für jeden Strich eine andere Anforderung mitführen.

   Halbe Korridorbreite in Bühnen-Pixeln. Startwerte, kein Messwert — mit echtem Pencil
   auf dem Zielgerät nachziehen. */
export const toleranz = (stufe: number, faktor = 1) => Math.max(12, 46 - stufe * 6) * faktor

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** Ein Punkt der gezeichneten Spur. `daneben` färbt ihn und geht in die Genauigkeit. */
export type Spurpunkt = { x: number; y: number; daneben: boolean }

export type Welt = {
  stufe: number
  /** B1: von Thomas eingestellt, während des Spiels fest. */
  regler: Regler
  farben: Verein['farben']
  /** Wievielte Neigung, ab 0. Bleibt bei einer Wiederholung stehen. */
  runde: number
  a: Punkt
  b: Punkt
  /** 0–1 auf der Bahn. Wächst nur, nie zurück. */
  fortschritt: number
  zeiger: { x: number; y: number; drin: boolean }
  /** Stift liegt auf. */
  zieht: boolean
  /** Liegt der Stift gerade im Korridor? Färbt Ball und Korridor (A1). */
  imKorridor: boolean
  spur: Spurpunkt[]
  /** Abgeschlossene Bahnen. */
  tore: number
  /** Messpunkte gesamt und davon im Korridor — daraus die Genauigkeit. */
  proben: number
  probenDrin: number
  /** Dieselben Zähler nur für die laufende Runde — daran misst sich die Mindesttrefferquote. */
  rundeProben: number
  rundeDrin: number
  /** Läuft gerade ein Muster zum zweiten Mal? Dann macht ein blasser Ball es vor. */
  wiederholung: boolean
  wiederholungen: number
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  /** Läuft nach einem Tor; solange steht die Bahn still. */
  jubelUhr: number
  /** Wie viele Etappentöne auf dieser Bahn schon erklangen. */
  etappen: number
  funken: Funken.Funke[]
  /** `prefers-reduced-motion`: dann gibt es keine Funken. Setzt der Aufrufer. */
  wenigerBewegung: boolean
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(
  stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER,
): Welt {
  const { a, b } = bahn(0)
  return {
    stufe,
    regler,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    runde: 0,
    a,
    b,
    fortschritt: 0,
    zeiger: { x: W / 2, y: H + 50, drin: false },
    zieht: false,
    imKorridor: false,
    spur: [],
    tore: 0,
    proben: 0,
    probenDrin: 0,
    rundeProben: 0,
    rundeDrin: 0,
    wiederholung: false,
    wiederholungen: 0,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    jubelUhr: 0,
    etappen: 0,
    funken: [],
    wenigerBewegung: false,
  }
}

/** Funkenstoß um einen Punkt, in den übergebenen Farben. */
export function funkenstoss(w: Welt, x: number, y: number, farben: string[], anzahl = 12) {
  if (w.wenigerBewegung) return
  Funken.funkenstoss(w.funken, x, y, farben, anzahl, STOSS)
}

/* ── Geometrie ─────────────────────────────────────────────────────────── */

/** Lotfußpunkt eines Zeigerpunkts auf der Bahn: Strecke 0–1 und Abstand quer dazu. */
export function aufBahn(w: Welt, x: number, y: number): { t: number; abstand: number } {
  const dx = w.b.x - w.a.x
  const dy = w.b.y - w.a.y
  const laenge2 = dx * dx + dy * dy
  const t = klemme(((x - w.a.x) * dx + (y - w.a.y) * dy) / laenge2, 0, 1)
  const fx = w.a.x + t * dx
  const fy = w.a.y + t * dy
  return { t, abstand: Math.hypot(x - fx, y - fy) }
}

/** Punkt auf der Bahn bei Strecke t — die Ballposition. */
export const punktAuf = (w: Welt, t: number): Punkt => ({
  x: w.a.x + (w.b.x - w.a.x) * t,
  y: w.a.y + (w.b.y - w.a.y) * t,
})

export const ballPunkt = (w: Welt): Punkt => punktAuf(w, w.fortschritt)

/* ── Ziehen ────────────────────────────────────────────────────────────── */

/**
 * Ein Zeigerpunkt bei aufliegendem Stift.
 *
 * Der Ball rollt nur weiter, wenn der Punkt im Korridor liegt. Außerhalb wird die Probe
 * trotzdem gezählt — sonst könnte man neben der Bahn beliebig herumfahren, ohne dass es
 * die Genauigkeit berührt.
 */
export function ziehe(w: Welt, x: number, y: number, d: Druck): Ereignis | undefined {
  if (w.jubelUhr > 0) return
  const { t, abstand } = aufBahn(w, x, y)
  const drin = abstand <= toleranz(w.stufe, w.regler.toleranz)

  w.proben++
  w.rundeProben++
  if (drin) {
    w.probenDrin++
    w.rundeDrin++
  }
  w.imKorridor = drin
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.spur.push({ x, y, daneben: !drin })

  // Monoton: nur vorwärts, und nur im Korridor.
  if (drin && t > w.fortschritt) w.fortschritt = t

  if (w.fortschritt >= 1 && w.jubelUhr <= 0) {
    w.tore++
    w.jubelUhr = JUBEL_SEK
    funkenstoss(w, w.b.x + 17, w.b.y, [w.farben.primaer, w.farben.sekundaer, '#ffffff'])
    return 'tor'
  }
  // Ein Ton je Viertel der Bahn — nie zurück, denn der Fortschritt ist monoton.
  // Springt der Ball über mehrere Marken, klingt es trotzdem nur einmal.
  const vorher = w.etappen
  while (w.etappen < ETAPPEN.length && w.fortschritt >= ETAPPEN[w.etappen]) w.etappen++
  if (w.etappen > vorher) return 'etappe'
}

/** Nach dem Jubel: nächste Bahn mit anderer Neigung, frische Spur. */
function naechsteBahn(w: Welt) {
  // Unter der Mindesttrefferquote dieselbe Bahn noch einmal, aber nie ein drittes Mal.
  w.wiederholung = !w.wiederholung && musterNochmal(w.regler, w.rundeDrin, w.rundeProben)
  if (w.wiederholung) w.wiederholungen++
  else w.runde++
  w.rundeProben = 0
  w.rundeDrin = 0
  const { a, b } = bahn(w.runde)
  w.a = a
  w.b = b
  w.fortschritt = 0
  w.spur = []
  w.jubelUhr = 0
  w.imKorridor = false
  w.etappen = 0
}

export function aktualisiere(w: Welt, dt: number) {
  w.zeitGesamt += dt
  w.funken = Funken.bewegeFunken(w.funken, dt)
  if (w.jubelUhr > 0) {
    w.jubelUhr -= dt
    if (w.jubelUhr <= 0) naechsteBahn(w)
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * Weil pro Einheit mehrere Bahnen anfallen, misst `vollstaendigkeit` den Anteil der
 * **begonnenen** Bahnen, die geschafft wurden — die laufende zählt anteilig mit.
 *
 * Begonnen wird über `runde` gezählt, nicht über `tore + 1`: während des Jubels ist die
 * nächste Bahn noch nicht ausgelegt, und die laufende steckt bereits in `tore`. Sonst
 * meldet ein einziger sauberer Durchgang zwei begonnene Bahnen.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const begonnen = w.runde + 1 + w.wiederholungen
  const geschafft = w.tore + (w.jubelUhr > 0 ? 0 : w.fortschritt)
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'linie',
    dauerMs,
    vollstaendigkeit: klemme(geschafft / begonnen, 0, 1),
    genauigkeit: w.proben === 0 ? 0 : w.probenDrin / w.proben,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      tore: w.tore,
      bahnenBegonnen: begonnen,
      proben: w.proben,
      probenDrin: w.probenDrin,
      toleranz: toleranz(w.stufe, w.regler.toleranz),
      wiederholungen: w.wiederholungen,
    },
  }
}
