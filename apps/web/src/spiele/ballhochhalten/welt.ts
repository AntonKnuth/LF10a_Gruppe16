/**
 * Zustand und Physik von „Ball hochhalten". Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Der Ball wartet, bis er angetippt wird. Solange der Stift aufliegt, läuft
 * die Zeit in Zeitlupe — Zeit, den Andruck zu dosieren. **Der Andruck beim Loslassen
 * bestimmt, wie hoch der Ball fliegt**, die Lage des Stifts zur Ballmitte die Richtung:
 * rechts der Mitte fliegt er nach links, je weiter rechts, desto weiter.
 * Der **Scheitelpunkt** muss ins wandernde Band.
 *
 * C2: es gibt keinen Verliererzustand. Fällt der Ball ins Gras, kommt ein neuer —
 * beendet wird das Spiel ausschließlich von der Uhr des SpielScreens.
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { klang } from './klang'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640
export const BODEN_Y = 566
export const DECKE_Y = 62

/* ── Physik ────────────────────────────────────────────────────────────── */
const SCHWERE = 1150
const V_MIN = 470
const V_MAX = 1035
const ZEITLUPE = 0.14

/**
 * Kalibrierung der Stiftkraft: unterhalb von DRUCK_MIN passiert nichts, oberhalb von
 * DRUCK_MAX wird es nicht mehr stärker. Ein Apple Pencil erreicht 1.0 in der Praxis nie
 * und ein 7-Jähriger schon gar nicht — deshalb ist das ein Regler und keine feste Formel.
 */
const DRUCK_MIN = 0.05
const DRUCK_MAX = 0.85

/** Andruck → Schusskraft 0–1. */
export const kraftAus = (druck: number) => klemme((druck - DRUCK_MIN) / (DRUCK_MAX - DRUCK_MIN), 0, 1)
const SEITE = 340
/** Wie weit neben dem Ball ein Andruck noch als Treffer zählt. */
export const REICHWEITE = 34
const MAGNUS = 210

export const BALLON_FARBEN = ['#ce82ff', '#ff9600', '#1cb0f6', '#ff4b4b', '#2fd06a', '#ff70b8']

/* ── Stufe (B1) ────────────────────────────────────────────────────────────
   Die Schwierigkeit stellt Thomas ein und sie bleibt während des Spiels fest.
   Eine selbstjustierende Stufe wäre im Verlauf nicht mehr lesbar: der Messwert
   müsste dann für jeden Wurf eine andere Anforderung mitführen. */
export const bandHoehe = (stufe: number) => Math.max(60, 130 - stufe * 12)
export const bandTempo = (stufe: number) => 0.7 + stufe * 0.15
export const ballonZahl = (stufe: number) => Math.min(4, Math.ceil(stufe / 2))

/* ── Zuschauer und Serie ───────────────────────────────────────────────────
   Der Punktestand ist zugleich die Tribüne: Treffer holen Fans ins Stadion, der
   Ball im Gras vertreibt ein paar. Nach unten ist bei der Startbesetzung Schluss —
   Ben kann nie schlechter dastehen als beim Anpfiff. Das hält den Anreiz aufrecht,
   ohne einen Verliererzustand einzuführen (C2). */
export const FANS_START = 0.18
const FANS_TREFFER = 0.012
const FANS_KERN = 0.028
const FANS_BALLON = 0.008
const FANS_BALLON_WAPPEN = 0.022
const FANS_GRAS = 0.02

/** Punkte für einen Ballon und für den seltenen Ballon mit dem Vereinswappen. */
export const BALLON_PUNKTE = 100
export const BALLON_WAPPEN_PUNKTE = 300
/** Anteil der Ballons, die das Wappen tragen. Selten genug, um ein Ereignis zu sein. */
const WAPPEN_ANTEIL = 0.22

/**
 * Sekunden zwischen Schlusspfiff und Ergebnis. Erst ist es still, dann kommt der Jubel:
 * ein sofortiger Ausbruch erschreckt mehr, als er belohnt. In der Zeit bleibt der
 * Endstand stehen, damit Ben ihn in Ruhe sehen und vom Spiel herunterkommen kann.
 */
export const ABPFIFF_SEK = 4
/** So lange bleibt es nach dem Pfiff ruhig, bevor die Welle losläuft. */
const JUBEL_START = 1.1

/**
 * Punktemultiplikator aus der Trefferserie. Die Serie reißt beim Fehlschuss — das ist
 * der Verlust, den es geben darf: man verliert eine Serie, nie das Spiel.
 */
export const komboMulti = (kombo: number) => 1 + Math.min(3, Math.floor(kombo / 2))

const KOMBO_NAMEN: Record<number, string> = {
  2: 'Doppelpass!',
  3: 'Hattrick!',
  5: 'Weltklasse!',
  8: 'Unglaublich!',
}

/* ── Verein ────────────────────────────────────────────────────────────────
   Das Spiel nimmt nicht den ganzen Verein, sondern nur das, was es zeichnen und
   rufen kann. Dadurch bleibt die Welt ohne Content-Dateien testbar, und ein neuer
   Verein bringt seine Kulisse automatisch mit — ohne eine Zeile in diesem Ordner. */

export type Jubel = { text: string; uebersetzung: string }

export type Deko = {
  name: string
  /** Kürzel im Wappen — dasselbe wie auf der Kartennadel des Startbildschirms. */
  kuerzel: string
  primaer: string
  sekundaer: string
  /** Abgedunkelte Abstufungen für die Ränge, einmal vorgerechnet statt je Bild. */
  dunkel: string
  tief: string
  /** Abgesetzte Vereinsfarbe für Dinge, die *vor* der Bande fliegen. */
  hell: string
  jubel: Jubel[]
}

/** Grobe Helligkeit 0–1 einer Hex-Farbe. */
export function helligkeit(h: string) {
  const n = parseInt(h.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** Mischt zwei Hex-Farben. Reicht für Abstufungen einer Vereinsfarbe. */
export function mischeFarbe(a: string, b: string, t: number) {
  const zahl = (h: string) => parseInt(h.slice(1), 16)
  const x = zahl(a), y = zahl(b)
  const teil = (v: number) => (i: number) => (v >> i) & 255
  const r = Math.round(misch(teil(x)(16), teil(y)(16), t))
  const g = Math.round(misch(teil(x)(8), teil(y)(8), t))
  const bl = Math.round(misch(teil(x)(0), teil(y)(0), t))
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** Jubelrufe, die zu keinem Verein gehören — sorgen für Abwechslung auch bei wenigen Sprüchen. */
const ALLGEMEINER_JUBEL = ['Volltreffer!', 'Perfekt!', 'Stark!', 'Genau so!', 'Sahne!']

export function dekoAus(v?: Verein): Deko {
  const primaer = v?.farben.primaer ?? '#2f6ea8'
  return {
    name: v?.name ?? 'TravelKickers',
    kuerzel: (v?.id ?? 'tk').toUpperCase().slice(0, 3),
    primaer,
    sekundaer: v?.farben.sekundaer ?? '#ffffff',
    // Abgedunkelt, aber nicht ausgewaschen: die Vereinsfarbe soll erkennbar bleiben,
    // während Ball, Zielband und Konfetti davor stehen können (A1 lebt vom Sofortfeedback).
    dunkel: mischeFarbe(primaer, '#101a26', 0.25),
    tief: mischeFarbe(primaer, '#0b121b', 0.55),
    // Der Wappenballon fliegt vor der Bande, und die trägt dieselbe Vereinsfarbe.
    // Ohne eigenen Wert verschwindet er darin — deshalb deutlich abgesetzt.
    hell: helligkeit(primaer) > 0.55
      ? mischeFarbe(primaer, '#0b121b', 0.45)
      : mischeFarbe(primaer, '#ffffff', 0.58),
    jubel: [
      // Fremdsprachige Sprüche immer mit deutscher Übersetzung — die wird mitgezeigt.
      ...(v?.sprueche ?? []).map((s) => ({
        text: s.text,
        uebersetzung: s.sprache === 'Deutsch' ? '' : s.uebersetzung,
      })),
      ...ALLGEMEINER_JUBEL.map((text) => ({ text, uebersetzung: '' })),
    ],
  }
}

/* ── Typen ─────────────────────────────────────────────────────────────── */
export type Gesicht = 'idle' | 'aim' | 'rise' | 'happy' | 'meh' | 'dizzy'

export type Ball = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  drall: number
  dreh: number
  sx: number
  sy: number
  gesicht: Gesicht
  gesichtT: number
  lebt: boolean
  scheitelDa: boolean
  letzteKraft: number
  /** Wartet auf das Antippen. Von allein fällt der Ball nie los. */
  wartet: boolean
  wippe: number
  ruheY: number
}

export type Band = { y: number; h: number; phase: number; tempo: number }

export type Laden = {
  an: boolean
  /** Seitlicher Anspielpunkt, −1 … 1. Rechts der Mitte heißt: der Ball fliegt nach links. */
  ox: number
  px: number
  py: number
  /** Zuletzt gemessener Andruck — beim Loslassen ist das die Schusskraft. */
  druck: number
  /** Ersatzdruck von der Tastatur statt echtem Stiftdruck. */
  synthetisch: boolean
}

export type Ballon = {
  x: number; y: number; r: number; vy: number; schwenk: number; ph: number; farbe: string
  /** Trägt das Vereinswappen: größer, langsamer, dreimal so viele Punkte. */
  wappen: boolean
}
export type Teilchen = { x: number; y: number; vx: number; vy: number; r: number; leben: number; max: number; farbe: string; dreh: number; vdreh: number }
export type Notiz = { x: number; y: number; text: string; farbe: string; groesse: number; leben: number; max: number }
export type Blatt = { x: number; y: number; s: number; ph: number; farbe: string }
export type Wolke = { x: number; y: number; s: number; v: number }

/** Ein Schuss mit seinen Messwerten — die Rohspur dieses Spiels. */
export type Wurf = {
  tMs: number
  /** 0–1, die aus dem Andruck beim Loslassen entstandene Schusskraft. */
  kraft: number
  /** Mittlerer Andruck, solange der Stift auf dem Ball lag. */
  druck: number
  abweichungPx: number
  getroffen: boolean
  kern: boolean
}

export type Welt = {
  stufe: number
  deko: Deko
  t: number
  ball: Ball
  band: Band
  laden: Laden
  ballons: Ballon[]
  puffs: Teilchen[]
  pops: Teilchen[]
  notizen: Notiz[]
  blaetter: Blatt[]
  wolken: Wolke[]
  ballonUhr: number
  anstossUhr: number
  ruettel: number
  blitz: number
  blitzFarbe: string
  ersterSchuss: boolean
  wenigerBewegung: boolean
  zeiger: { x: number; y: number; drin: boolean }
  /* Tribüne */
  /** Besetzung der Ränge, 0–1. Das ist die Belohnungsanzeige des Spiels. */
  fanAnteil: number
  /** Nach dem Schlusspfiff: La Ola, unabhängig vom Ergebnis. */
  abpfiff: boolean
  abpfiffUhr: number
  welle: number
  /* Messung */
  punkte: number
  kombo: number
  besteKombo: number
  versuche: number
  treffer: number
  kerntreffer: number
  ballonsGetroffen: number
  wappenGetroffen: number
  zeitGesamt: number
  /** Zeit, in der der Ball in der Luft war — daraus wird die Vollständigkeit. */
  zeitLebend: number
  druckWerte: number[]
  ladeDruck: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  wuerfe: Wurf[]
}

/* ── Helfer ────────────────────────────────────────────────────────────── */
export const klemme = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const misch = (a: number, b: number, t: number) => a + (b - a) * t
const zuf = (a = 1, b = 0) => b + Math.random() * (a - b)
const waehle = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

/* ── Aufbau ────────────────────────────────────────────────────────────── */
export function neueWelt(stufe: number, verein?: Verein): Welt {
  const w: Welt = {
    stufe,
    deko: dekoAus(verein),
    t: 0,
    ball: {
      x: W / 2, y: 420, vx: 0, vy: 0, r: 26, drall: 0, dreh: 0, sx: 1, sy: 1,
      gesicht: 'idle', gesichtT: 0, lebt: true, scheitelDa: true, letzteKraft: 0.5,
      wartet: true, wippe: 0, ruheY: 420,
    },
    band: { y: 305, h: bandHoehe(stufe), phase: zuf(6.3), tempo: bandTempo(stufe) },
    laden: { an: false, ox: 0, px: 0, py: 0, druck: 0.5, synthetisch: true },
    ballons: [],
    puffs: [],
    pops: [],
    notizen: [],
    blaetter: Array.from({ length: 22 }, () => ({
      x: zuf(W), y: zuf(BODEN_Y - 20, 40), s: zuf(1.4, 0.5), ph: zuf(6.3),
      farbe: waehle(['#ffffff', '#d8f0ff', '#c9ecc0']),
    })),
    // Nur über der Dachkante: darunter ist Tribüne, kein Himmel.
    wolken: Array.from({ length: 4 }, () => ({
      x: zuf(W + 200, -100), y: zuf(104, 30), s: zuf(1.1, 0.6), v: zuf(11, 4),
    })),
    ballonUhr: 4,
    anstossUhr: 0,
    ruettel: 0,
    blitz: 0,
    blitzFarbe: '#fff',
    ersterSchuss: false,
    wenigerBewegung: false,
    zeiger: { x: -999, y: -999, drin: false },
    fanAnteil: FANS_START,
    abpfiff: false,
    abpfiffUhr: 0,
    welle: 0,
    punkte: 0,
    kombo: 0,
    besteKombo: 0,
    versuche: 0,
    treffer: 0,
    kerntreffer: 0,
    ballonsGetroffen: 0,
    wappenGetroffen: 0,
    zeitGesamt: 0,
    zeitLebend: 0,
    druckWerte: [],
    ladeDruck: [],
    synthetisch: true,
    geraet: 'mouse',
    wuerfe: [],
  }
  return w
}

function anstoss(w: Welt) {
  const b = w.ball
  b.x = W / 2 + zuf(70, -70)
  b.ruheY = 420
  b.y = b.ruheY
  b.vx = b.vy = 0
  b.drall = b.dreh = 0
  b.sx = b.sy = 1
  b.lebt = true
  b.scheitelDa = true
  b.gesicht = 'idle'
  b.gesichtT = 0
  // Der Ball wartet, so lange er will. Ben bestimmt, wann es losgeht — nicht eine Uhr.
  b.wartet = true
  b.wippe = 0
}

/* ── Eingabe ───────────────────────────────────────────────────────────── */
export const inReichweite = (w: Welt, x: number, y: number) =>
  Math.hypot(x - w.ball.x, y - w.ball.y) <= w.ball.r + REICHWEITE

/** Andruck auf den Ball. `false`, wenn danebengetippt wurde. */
export function beginneLaden(w: Welt, x: number, y: number, d: Druck, geraet: Eingabegeraet) {
  if (!w.ball.lebt || w.laden.an || w.abpfiff) return false
  if (!inReichweite(w, x, y)) {
    w.puffs.push(teilchen(x, y, 0, 0, 6, 0.35, 'rgba(255,255,255,.85)'))
    return false
  }
  w.geraet = geraet
  if (!d.synthetisch) w.synthetisch = false
  w.ball.wartet = false
  w.laden.an = true
  w.ladeDruck = []
  zieleLaden(w, x, y, d)
  w.ball.gesicht = 'aim'
  klang.laden()
  return true
}

export function zieleLaden(w: Welt, x: number, y: number, d: Druck) {
  if (!w.laden.an) return
  w.laden.px = x
  w.laden.py = y
  w.laden.ox = klemme((x - w.ball.x) / (w.ball.r + REICHWEITE), -1, 1)
  w.laden.synthetisch = d.synthetisch
  merkeDruck(w, d.wert)
}

function merkeDruck(w: Welt, wert: number) {
  w.laden.druck = wert
  w.druckWerte.push(wert)
  w.ladeDruck.push(wert)
}

/**
 * Neuer Ersatzdruck von der Zifferntastatur, ohne dass sich der Zeiger bewegt hat.
 * Ein echt gemessener Stiftdruck wird davon nie überschrieben.
 */
export function stelleDruck(w: Welt, d: Druck) {
  if (w.laden.an && w.laden.synthetisch) merkeDruck(w, d.wert)
}

/** Stift hoch: der zuletzt gemessene Andruck ist die Schusskraft. */
export function loslassen(w: Welt) {
  if (!w.laden.an) return
  w.laden.an = false
  if (w.ball.lebt) schuss(w, kraftAus(w.laden.druck), w.laden.ox)
}

function schuss(w: Welt, c: number, ox: number) {
  c = klemme(c, 0, 1)
  const b = w.ball
  w.ersterSchuss = true
  b.wartet = false
  b.vy = -misch(V_MIN, V_MAX, c)
  b.vx = b.vx * 0.15 - ox * SEITE
  b.drall = -ox
  b.scheitelDa = false
  b.letzteKraft = c
  b.sx = 0.76
  b.sy = 1.3
  b.gesicht = 'rise'
  b.gesichtT = 0.5
  w.ruettel = 3
  klang.schuss(c)
  const cx = b.x + ox * b.r
  for (let i = 0; i < 12; i++) {
    w.puffs.push(teilchen(cx, b.y + b.r * 0.5, zuf(200, -200), zuf(60, -260), zuf(9, 4), zuf(0.5, 0.25), 'rgba(255,255,255,.9)'))
  }
}

/** Flugbahn-Vorschau: zeigt vor dem Loslassen, wo der Ball umkehren wird. */
export function vorhersage(w: Welt, c: number, ox: number) {
  const b = w.ball
  const v = misch(V_MIN, V_MAX, klemme(c, 0, 1))
  let x = b.x, y = b.y, vx = b.vx * 0.15 - ox * SEITE, vy = -v
  const punkte: [number, number][] = []
  const dt = 1 / 90
  for (let i = 0; i < 220; i++) {
    vy += SCHWERE * dt
    vx += -ox * MAGNUS * dt
    x += vx * dt
    y += vy * dt
    if (x < b.r + 6) { x = b.r + 6; vx = Math.abs(vx) * 0.75 }
    if (x > W - b.r - 6) { x = W - b.r - 6; vx = -Math.abs(vx) * 0.75 }
    if (i % 6 === 0) punkte.push([x, y])
    if (vy >= 0) break
  }
  return { punkte, scheitelX: x, scheitelY: y }
}

/* ── Bewertung ─────────────────────────────────────────────────────────── */
export function bewerteScheitel(w: Welt, ax: number, ay: number) {
  const abw = Math.abs(ay - w.band.y)
  const halb = w.band.h / 2
  const getroffen = abw <= halb
  const kern = abw <= w.band.h * 0.17
  const druck = druckKennzahlen(w.ladeDruck).mittel

  w.versuche++
  w.wuerfe.push({ tMs: Math.round(w.zeitGesamt * 1000), kraft: w.ball.letzteKraft, druck, abweichungPx: abw, getroffen, kern })

  if (getroffen) {
    w.kombo++
    w.besteKombo = Math.max(w.besteKombo, w.kombo)
    const genau = 1 - abw / halb
    const multi = komboMulti(w.kombo)
    const punkte = Math.max(
      20,
      Math.round((60 + 140 * genau) * (0.6 + 0.7 * w.ball.letzteKraft) * (kern ? 2 : 1) * multi),
    )
    w.punkte += punkte
    w.treffer++
    if (kern) w.kerntreffer++
    // Die Tribüne füllt sich — das ist die eigentliche Belohnung, nicht die Zahl.
    // Aufstehen tun die Ränge dabei nicht, das bleibt dem Abpfiff vorbehalten.
    w.fanAnteil = klemme(w.fanAnteil + (kern ? FANS_KERN : FANS_TREFFER), 0, 1)
    w.ball.gesicht = 'happy'
    w.ball.gesichtT = 0.9
    notiz(w, ax, ay - 34, '+' + punkte, kern ? '#c07f00' : '#7c34c9', kern ? 36 : 30)
    const serie = KOMBO_NAMEN[w.kombo]
    if (serie) notiz(w, ax, ay - 70, serie, '#2fd06a', 26)
    if (kern) {
      // Der Verein jubelt mit seinen eigenen Sprüchen (C1) — fremdsprachige mit Übersetzung.
      const j = waehle(w.deko.jubel)
      notiz(w, ax, ay - (serie ? 104 : 70), j.text, w.deko.dunkel, 26)
      if (j.uebersetzung) notiz(w, ax, ay - (serie ? 130 : 96), j.uebersetzung, '#7b8a9c', 17)
    }
    for (let i = 0; i < (kern ? 26 : 14); i++) {
      w.pops.push(teilchen(ax, ay, zuf(320, -320), zuf(120, -320), zuf(7, 3), zuf(0.9, 0.5),
        kern ? waehle(['#ffc800', '#ffe680', '#ffffff', '#ff9600']) : waehle(['#a855f7', '#ce82ff', '#ffffff', '#d9b8ff'])))
    }
    w.blitz = kern ? 0.22 : 0
    w.blitzFarbe = '#fff6d8'
    ;(kern ? klang.kern : klang.zone)()
  } else {
    // C2: kein Tadel, nur ein sachlicher Hinweis, wohin es gehen soll. Verloren ist
    // nur die Serie — der nächste Ball liegt sofort wieder bereit.
    w.kombo = 0
    w.ball.gesicht = 'meh'
    w.ball.gesichtT = 0.5
    notiz(w, ax, ay - 30, ay < w.band.y ? 'zu hoch' : 'zu kurz', '#7b8a9c', 22)
  }
}

function notiz(w: Welt, x: number, y: number, text: string, farbe: string, groesse: number, leben = 1.15) {
  // Nach oben begrenzen: gestapelte Notizen sollen nicht aus dem Bild rutschen.
  w.notizen.push({ x, y: Math.max(96, y), text, farbe, groesse, leben, max: leben })
}

function teilchen(x: number, y: number, vx: number, vy: number, r: number, leben: number, farbe: string): Teilchen {
  return { x, y, vx, vy, r, leben, max: leben, farbe, dreh: zuf(6.3), vdreh: zuf(9, -9) }
}

/** Ball im Gras. Kein Leben weg, kein Game Over (C2) — es kommt einfach ein neuer. */
function insGras(w: Welt) {
  const b = w.ball
  b.lebt = false
  b.gesicht = 'dizzy'
  b.gesichtT = 3
  b.sx = 1.4
  b.sy = 0.62
  w.ruettel = 12
  w.laden.an = false
  w.anstossUhr = 1
  w.kombo = 0
  // Ein paar Zuschauer gehen — aber nie unter die Startbesetzung.
  w.fanAnteil = Math.max(FANS_START, w.fanAnteil - FANS_GRAS)
  klang.boden()
  notiz(w, b.x, BODEN_Y - 70, 'Neuer Ball!', '#4caf50', 24)
  for (let i = 0; i < 16; i++) {
    w.puffs.push(teilchen(b.x, BODEN_Y - 4, zuf(280, -280), zuf(-40, -190), zuf(12, 5), zuf(0.6, 0.3), 'rgba(255,255,255,.85)'))
  }
}

/**
 * Schlusspfiff. Das Stadion jubelt **unabhängig vom Ergebnis** — es ist der Abpfiff und
 * keine Bewertung. Eine ergebnisabhängige Reaktion wäre Rückmeldung vor der
 * Selbsteinschätzung und würde C3 wertlos machen.
 */
export function beginneAbpfiff(w: Welt) {
  if (w.abpfiff) return
  w.abpfiff = true
  w.abpfiffUhr = ABPFIFF_SEK
  w.welle = 0
  w.laden.an = false
  klang.abpfiff()
  notiz(w, W / 2, 300, 'Abpfiff!', w.deko.dunkel, 44, ABPFIFF_SEK)
}

/* ── Takt ──────────────────────────────────────────────────────────────── */
export function aktualisiere(w: Welt, dtEcht: number) {
  w.t += dtEcht
  w.zeitGesamt += dtEcht
  if (w.abpfiff) {
    w.abpfiffUhr = Math.max(0, w.abpfiffUhr - dtEcht)
    // Erst Ruhe, dann eine langsame Welle — kein Schreck nach dem Pfiff.
    if (w.abpfiffUhr < ABPFIFF_SEK - JUBEL_START) w.welle += dtEcht * 0.42
  }
  // Wartezeit zählt nicht: sonst sähe „gar nicht angefangen" wie volle Bearbeitung aus.
  if (w.ball.lebt && !w.ball.wartet) w.zeitLebend += dtEcht

  for (const c of w.wolken) {
    c.x += c.v * dtEcht
    if (c.x > W + 180) c.x = -180
  }
  for (const l of w.blaetter) {
    l.x += 18 * dtEcht * l.s
    l.y += Math.sin(w.t * 1.6 + l.ph) * 12 * dtEcht + 6 * dtEcht
    if (l.x > W + 20) l.x = -20
    if (l.y > BODEN_Y - 10) l.y = 40
  }

  w.ruettel = w.wenigerBewegung ? 0 : Math.max(0, w.ruettel - dtEcht * 38)
  if (w.blitz > 0) w.blitz -= dtEcht

  verfall(w.notizen, dtEcht, (n) => { n.y -= 30 * dtEcht })
  verfall(w.puffs, dtEcht, (p) => {
    p.x += p.vx * dtEcht; p.y += p.vy * dtEcht; p.vy += 380 * dtEcht; p.vx *= 0.96
  })
  verfall(w.pops, dtEcht, (p) => {
    p.x += p.vx * dtEcht; p.y += p.vy * dtEcht; p.vy += 520 * dtEcht; p.vx *= 0.985; p.dreh += p.vdreh * dtEcht
  })

  /* Solange der Stift aufliegt, läuft die Welt in Zeitlupe — Zeit, den Druck zu dosieren. */
  const dt = dtEcht * (w.laden.an ? ZEITLUPE : 1)

  bewegeBand(w, dt)
  bewegeBallons(w, dt)

  const b = w.ball

  if (!b.lebt) {
    w.anstossUhr -= dtEcht
    b.y = Math.min(b.y, BODEN_Y - b.r)
    b.sx += (1 - b.sx) * Math.min(1, dtEcht * 7)
    b.sy += (1 - b.sy) * Math.min(1, dtEcht * 7)
    if (w.anstossUhr <= 0) anstoss(w)
    return
  }

  /* Der Ball wartet, bis er angetippt wird — er fällt nie von allein los. */
  if (b.wartet) {
    b.wippe += dtEcht
    b.y = b.ruheY + Math.sin(b.wippe * 3) * 7
    b.sx += (1 - b.sx) * Math.min(1, dtEcht * 9)
    b.sy += (1 - b.sy) * Math.min(1, dtEcht * 9)
    return
  }

  const vyVorher = b.vy
  b.vy += SCHWERE * dt
  b.vx += b.drall * MAGNUS * dt
  b.vx *= Math.pow(0.62, dt)
  b.drall *= Math.pow(0.5, dt)
  b.x += b.vx * dt
  b.y += b.vy * dt
  b.dreh += (b.vx / b.r) * dt * 0.8

  b.sx += (1 - b.sx) * Math.min(1, dtEcht * 9)
  b.sy += (1 - b.sy) * Math.min(1, dtEcht * 9)
  if (b.gesichtT > 0) {
    b.gesichtT -= dtEcht
    if (b.gesichtT <= 0) b.gesicht = w.laden.an ? 'aim' : 'idle'
  }

  /* Wände */
  if (b.x < b.r + 6) { b.x = b.r + 6; b.vx = Math.abs(b.vx) * 0.75; b.sx = 0.8; b.sy = 1.2 }
  if (b.x > W - b.r - 6) { b.x = W - b.r - 6; b.vx = -Math.abs(b.vx) * 0.75; b.sx = 0.8; b.sy = 1.2 }

  /* Decke */
  if (b.y < DECKE_Y + b.r && b.vy < 0) {
    b.y = DECKE_Y + b.r
    b.vy = Math.abs(b.vy) * 0.3
    b.sx = 1.3
    b.sy = 0.74
    klang.decke()
    for (let i = 0; i < 8; i++) {
      w.puffs.push(teilchen(b.x, b.y - b.r, zuf(200, -200), zuf(140, 20), zuf(8, 4), 0.4, 'rgba(255,255,255,.9)'))
    }
    if (!b.scheitelDa) { b.scheitelDa = true; bewerteScheitel(w, b.x, b.y) }
  }

  ballonTreffer(w)

  /* Scheitelpunkt — hier wird gewertet. */
  if (!b.scheitelDa && vyVorher < 0 && b.vy >= 0) {
    b.scheitelDa = true
    bewerteScheitel(w, b.x, b.y)
  }

  if (b.y + b.r >= BODEN_Y && b.vy > 0) {
    b.y = BODEN_Y - b.r
    insGras(w)
  }
}

function verfall<T extends { leben: number }>(liste: T[], dt: number, schritt: (x: T) => void) {
  for (let i = liste.length - 1; i >= 0; i--) {
    liste[i].leben -= dt
    schritt(liste[i])
    if (liste[i].leben <= 0) liste.splice(i, 1)
  }
}

function bewegeBand(w: Welt, dt: number) {
  w.band.phase += dt * w.band.tempo
  w.band.y = 305 + Math.sin(w.band.phase * 0.9) * 92 + Math.sin(w.band.phase * 1.63 + 1.2) * 42
}

function bewegeBallons(w: Welt, dt: number) {
  w.ballonUhr -= dt
  if (w.ballonUhr <= 0 && w.ballons.length < ballonZahl(w.stufe)) {
    w.ballonUhr = zuf(5.5, 2.4)
    // Der Wappenballon steigt größer und langsamer auf — er soll auffallen.
    const wappen = Math.random() < WAPPEN_ANTEIL
    w.ballons.push({
      x: zuf(W - 90, 90), y: BODEN_Y + 60,
      r: wappen ? zuf(47, 39) : zuf(38, 24),
      vy: wappen ? zuf(-38, -22) : zuf(-58, -30),
      schwenk: zuf(30, 12), ph: zuf(6.3),
      farbe: wappen ? w.deko.hell : waehle(BALLON_FARBEN),
      wappen,
    })
  }
  for (let i = w.ballons.length - 1; i >= 0; i--) {
    const b = w.ballons[i]
    b.y += b.vy * dt
    b.x += Math.sin(w.t * 1.1 + b.ph) * b.schwenk * dt
    if (b.y < -90) w.ballons.splice(i, 1)
  }
}

function ballonTreffer(w: Welt) {
  const b = w.ball
  for (let i = w.ballons.length - 1; i >= 0; i--) {
    const o = w.ballons[i]
    const dx = b.x - o.x, dy = b.y - o.y
    const d = Math.hypot(dx, dy)
    if (d >= b.r + o.r) continue
    const nx = dx / (d || 1), ny = dy / (d || 1)
    const skalar = b.vx * nx + b.vy * ny
    b.vx = (b.vx - 2 * skalar * nx) * 0.82
    b.vy = (b.vy - 2 * skalar * ny) * 0.82 - 60
    b.x = o.x + nx * (b.r + o.r + 1)
    b.y = o.y + ny * (b.r + o.r + 1)
    b.sx = 0.85
    b.sy = 1.15
    const punkte = o.wappen ? BALLON_WAPPEN_PUNKTE : BALLON_PUNKTE
    w.punkte += punkte
    w.ballonsGetroffen++
    if (o.wappen) w.wappenGetroffen++
    w.fanAnteil = klemme(w.fanAnteil + (o.wappen ? FANS_BALLON_WAPPEN : FANS_BALLON), 0, 1)
    notiz(w, o.x, o.y - 20, '+' + punkte, o.wappen ? w.deko.dunkel : o.farbe, o.wappen ? 34 : 24)
    if (o.wappen) {
      // Konfettiregen in Vereinsfarben: weiter gestreut, langlebiger und bunter als
      // das übliche Platzen — der Wappenballon ist das Ereignis im Spiel.
      const bunt = [w.deko.primaer, w.deko.sekundaer, w.deko.hell, '#ffc800', '#ffffff']
      for (let k = 0; k < 46; k++) {
        w.pops.push(teilchen(o.x, o.y, zuf(430, -430), zuf(120, -520), zuf(8, 3), zuf(1.5, 0.9), waehle(bunt)))
      }
    } else {
      for (let k = 0; k < 18; k++) {
        w.pops.push(teilchen(o.x, o.y, zuf(340, -340), zuf(200, -340), zuf(7, 3), zuf(0.8, 0.4), o.farbe))
      }
    }
    w.ballons.splice(i, 1)
    w.ruettel = o.wappen ? 8 : 4
    ;(o.wappen ? klang.wappen : klang.platzen)()
    return
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */
/**
 * ACHTUNG: unmaßgeblich. Diese Zahlen entstehen im Browser für das Sofortfeedback
 * aus A1 und gehören in keinen Bericht — die maßgeblichen Kennzahlen rechnet C#
 * aus `extra.wuerfe`.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const d = druckKennzahlen(w.druckWerte)
  const halb = w.band.h / 2
  const genau = w.wuerfe.length
    ? w.wuerfe.reduce((s, x) => s + Math.max(0, 1 - x.abweichungPx / halb), 0) / w.wuerfe.length
    : 0

  return {
    spielId: 'ballhochhalten',
    dauerMs,
    // Anteil der Spielzeit, in der der Ball tatsächlich im Spiel war (ohne Warten).
    vollstaendigkeit: w.zeitGesamt > 0 ? klemme(w.zeitLebend / w.zeitGesamt, 0, 1) : 0,
    genauigkeit: genau,
    druckMittel: d.mittel,
    druckStreuung: d.streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      punkte: w.punkte,
      versuche: w.versuche,
      treffer: w.treffer,
      kerntreffer: w.kerntreffer,
      besteKombo: w.besteKombo,
      ballons: w.ballonsGetroffen,
      wappenballons: w.wappenGetroffen,
      fanAnteil: w.fanAnteil,
      bandHoehePx: w.band.h,
      wuerfe: w.wuerfe,
    },
  }
}
