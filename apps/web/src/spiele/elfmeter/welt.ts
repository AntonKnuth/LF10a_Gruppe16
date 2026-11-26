/**
 * Zustand und Bewertung von „Elfmeter". Kennt kein Canvas und kein React — damit die
 * Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Die eine Regel, aus der alles folgt:
 *
 *   Der Ball fliegt auf der Verlängerung des Strichs — so hoch, wie der Strich schnell war,
 *   und nur sauber, wenn der Druck gleich blieb.
 *
 * Geübt wird der flüssige, dosierte Einzelstrich, nicht „so schnell wie möglich": zu schnell
 * geht drüber, zu langsam fängt der Torwart.
 *
 * C2: der Torwart ist Trainingspartner und kein Gegner. Es gibt keinen Spielstand und keinen
 * Zähler für gehaltene Bälle; nach jedem Schuss liegt sofort der nächste Ball bereit, und der
 * Torwart nennt genau eine Sache, die beim nächsten Schuss anders sein soll.
 *
 * Nichts hier würfelt: Ziele, Torwart und Konfetti folgen festen Formeln. Zwei Sitzungen sind
 * dadurch vergleichbar, und der Test kann alles vorhersagen.
 */

import { klemme } from '../geometrie'
import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { VORGABE_REGLER, musterNochmal, type Regler } from '../regler'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export type Punkt = { x: number; y: number }

/** Der Elfmeterpunkt. */
export const BALL: Punkt = { x: 450, y: 540 }
export const BALL_R = 24

/** So weit neben dem Ball darf der Stift aufsetzen. */
export const REICHWEITE = BALL_R + 34

/** Verlässt der Strich diesen Kreis um den Ball, ist geschossen. */
export const KREIS_R = 160

/** Auf dieser Strecke wird das Tempo gemessen — immer gleich lang, sonst nicht vergleichbar. */
export const ANLAUF = KREIS_R - BALL_R

/**
 * Der Druck zählt erst nach 30 % des Anlaufs. Das Aufsetzen ist immer ein Druckanstieg — mit
 * ihm wäre jeder Strich „ungleichmäßig".
 */
const DRUCK_AB = BALL_R + 0.3 * ANLAUF

export const TOR = { links: 230, rechts: 670, oben: 150, unten: 330 }

/** Der Torball kommt so tief (Höhe 0) beziehungsweise so hoch (Höhe 1) an. */
const FLACH_Y = 310
const HOCH_Y = 170
/** Ein zu schneller Schuss geht über die Latte. */
const DRUEBER_Y = 100

/** Noch flacher ist kein Schuss aufs Tor mehr, sondern ein Strich zur Seite oder zurück. */
const MAX_GRAD = 75

/* ── Zeiten in Sekunden ────────────────────────────────────────────────── */
export const REAKTION_SEK = 1.2
export const NACHLEGEN_SEK = 0.8
/** B3: nach jeder Runde die Hand lockern. */
export const LOCKERN_SEK = 3
export const ABPFIFF_SEK = 4
/** So lange darf Ben nach Ablauf der Uhr einen angefangenen Strich noch zu Ende führen. */
const FRIST_SEK = 3

export const BAELLE_JE_RUNDE = 5

/** Nach so vielen Schüssen ohne Tor zeigt der Geisterstrich, wie es geht (C2). */
const HILFE_NACH = 3

/* ── Ziele ─────────────────────────────────────────────────────────────────
   Feste Folge statt Zufall. Der fünfte Ball jeder Runde ist der Wappenschuss. */

export type ZielName = 'links' | 'mitte' | 'rechts' | 'ol' | 'or' | 'ul' | 'ur'

const ZIELE: Record<ZielName, Punkt> = {
  links: { x: 310, y: 240 },
  mitte: { x: 450, y: 240 },
  rechts: { x: 590, y: 240 },
  ol: { x: 310, y: 205 },
  or: { x: 590, y: 205 },
  ul: { x: 310, y: 285 },
  ur: { x: 590, y: 285 },
}

const FOLGE: Record<'streifen' | 'ecken', ZielName[]> = {
  streifen: ['links', 'rechts', 'mitte', 'rechts', 'links'],
  ecken: ['ul', 'or', 'ur', 'ol', 'mitte', 'or', 'ul', 'ol', 'ur', 'mitte'],
}

/* ── Stufe und Regler (B1) ─────────────────────────────────────────────────
   Stellt Thomas ein, bleibt während des Spiels fest. Startwerte, kein Messwert — mit echtem
   Pencil auf dem Zielgerät nachziehen. */

/** Bis Stufe 2 zählt nur die Seite, die Höhe ist egal. */
export const zielArt = (stufe: number) => (stufe <= 2 ? 'streifen' : 'ecken')

export const zielRadius = (stufe: number, r = VORGABE_REGLER) => (110 - 15 * stufe) * r.toleranz

/** So stark darf der Druck schwanken (Streuung geteilt durch Mittel). */
export const cvGrenze = (stufe: number, r = VORGABE_REGLER) => (0.4 - 0.06 * stufe) * r.toleranz

/**
 * Erlaubte Dauer des Anlaufs in Millisekunden. Die Toleranz streckt das Fenster um seine Mitte,
 * damit es nie umklappt; das Zieltempo verschiebt beide Grenzen.
 */
export function fenster(stufe: number, r: Regler = VORGABE_REGLER) {
  const min = 40 + 20 * stufe
  const max = 1000 - 120 * stufe
  const mitte = (min + max) / 2
  const halb = ((max - min) / 2) * r.toleranz
  return {
    // Auch mit viel Toleranz bleibt ein reines Wegwischen zu schnell.
    min: Math.max(40, mitte - halb) / r.zielgeschwindigkeit,
    max: (mitte + halb) / r.zielgeschwindigkeit,
  }
}

export const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y)

/** Richtung von a nach b: 0 ist senkrecht nach oben, positiv nach rechts. */
export const grad = (a: Punkt, b: Punkt) => (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI

/* ── Bewertung eines Schusses ──────────────────────────────────────────── */

export type Urteil = 'tor' | 'drueber' | 'vorbei' | 'gehalten' | 'abgewehrt'

/** 0 = flach über den Rasen, 1 = knapp unter der Latte. Tempo wird dosiert, nicht maximiert. */
export function hoehe(stufe: number, dauerMs: number, r: Regler = VORGABE_REGLER) {
  const f = fenster(stufe, r)
  return klemme((f.max - dauerMs) / (f.max - f.min), 0, 1)
}

/** Wo der Ball ankommt: auf der Verlängerung des Strichs, in der Höhe, die das Tempo vorgibt. */
export function treffpunkt(
  stufe: number, dauerMs: number, richtungGrad: number, r: Regler = VORGABE_REGLER,
): Punkt {
  const y = dauerMs < fenster(stufe, r).min
    ? DRUEBER_Y
    : FLACH_Y - hoehe(stufe, dauerMs, r) * (FLACH_Y - HOCH_Y)
  return { x: BALL.x + Math.tan((richtungGrad * Math.PI) / 180) * (BALL.y - y), y }
}

/**
 * Das Urteil über einen Schuss. Die Reihenfolge steht fest, und es wird immer nur **eine**
 * Ursache genannt (A5) — auch wenn zwei Dinge nicht gepasst haben.
 *
 * Maus und Finger liefern einen konstanten Ersatzdruck, also cv = 0: `abgewehrt` kommt dort nie
 * vor, und das Spiel bleibt ohne Stift spielbar.
 */
export function urteil(
  stufe: number, dauerMs: number, richtungGrad: number, cv: number, r: Regler = VORGABE_REGLER,
): Urteil {
  const f = fenster(stufe, r)
  const x = treffpunkt(stufe, dauerMs, richtungGrad, r).x
  if (dauerMs < f.min) return 'drueber'
  if (x < TOR.links || x > TOR.rechts) return 'vorbei'
  if (dauerMs > f.max) return 'gehalten'
  if (cv > cvGrenze(stufe, r)) return 'abgewehrt'
  return 'tor'
}

const HINWEIS: Record<Exclude<Urteil, 'tor'>, string> = {
  drueber: 'Etwas ruhiger!',
  vorbei: 'Mehr zur Mitte!',
  gehalten: 'Etwas schneller!',
  abgewehrt: 'Gleichmäßig drücken!',
}

/**
 * Wohin der Torwart springt. Bei einem Ball, den er bekommt, zum Ball; sonst in die andere Ecke,
 * bei einem Ball durch die Mitte nach links.
 */
export function sprungZiel(u: Urteil, treff: Punkt): Punkt {
  if (u === 'gehalten' || u === 'abgewehrt') return { x: treff.x, y: klemme(treff.y, 215, 290) }
  return { x: treff.x < BALL.x - 40 ? 600 : 300, y: 275 }
}

/* ── Verein ────────────────────────────────────────────────────────────────
   Nur der Auszug, den das Spiel zeichnen und rufen kann. Ein neuer Verein bringt Torwart,
   Farben und Rufe mit, ohne eine Zeile in diesem Ordner. */

export type Ruf = { text: string; uebersetzung: string }

export type Deko = {
  verein: string
  kuerzel: string
  primaer: string
  sekundaer: string
  torwart: string
  rufe: Ruf[]
}

const ALLGEMEINE_RUFE = ['Tor!', 'Drin!', 'Stark!']

export function dekoAus(v?: Verein): Deko {
  return {
    verein: v?.name ?? 'TravelKickers',
    kuerzel: (v?.id ?? 'tk').toUpperCase().slice(0, 3),
    primaer: v?.farben.primaer ?? '#2f6ea8',
    sekundaer: v?.farben.sekundaer ?? '#ffffff',
    // Im Tor steht der echte Torwart dieses Vereins (Leitidee), gerufen beim Vornamen.
    torwart: v?.kader.find((k) => k.nummer === 1)?.name.split(' ')[0] ?? 'Torwart',
    rufe: (v?.sprueche ?? []).map((s) => ({
      text: s.text,
      // Fremdsprachiges immer mit Übersetzung; ein deutscher Satz braucht keine.
      uebersetzung: s.sprache === 'Deutsch' ? '' : s.uebersetzung,
    })),
  }
}

/* ── Zustand ───────────────────────────────────────────────────────────── */

export type Phase = 'bereit' | 'zieht' | 'flug' | 'reaktion' | 'nachlegen' | 'lockern' | 'abpfiff'

/** Ein Schuss als Messfakten, ohne Bewertung. Grundlage für eine spätere Auswertung in C#. */
export type Schuss = {
  nr: number
  ziel: ZielName
  wappen: boolean
  /** War die Hilfe vorher zu sehen? */
  hilfe: boolean
  dauerMs: number
  /** Strich- und Idealrichtung, 0 = senkrecht nach oben. */
  richtungGrad: number
  zielGrad: number
  treffX: number
  treffY: number
  druckMittel: number
  druckCv: number
  urteil: Urteil
}

export type Spurpunkt = Punkt & { druck: number }
export type Teilchen = Punkt & { vx: number; vy: number; leben: number; farbe: string }

/** Was passiert ist, damit der Aufrufer den Klang dazu spielt. */
export type Ereignis =
  | 'schuss' | 'tor' | 'marke' | 'wappen' | 'gehalten' | 'abgewehrt' | 'vorbei' | 'drueber' | 'abpfiff'

export type Welt = {
  stufe: number
  /** B1: von Thomas eingestellt, während des Spiels fest. */
  regler: Regler
  deko: Deko
  phase: Phase
  /** Restzeit der laufenden Phase in Sekunden; `bereit` und `zieht` haben keine. */
  phaseUhr: number
  /** Wievielte Zielrunde, ab 0. Bleibt bei einer Wiederholung stehen. */
  muster: number
  /** Wievielter Ball der Runde, 0 bis 4. */
  ballNr: number
  rundeTore: number
  wiederholung: boolean
  wiederholungen: number
  fehlInFolge: number
  /** Der Geisterstrich ist zu sehen. */
  hilfe: boolean
  hilfen: number

  /* Der laufende Strich */
  stiftUnten: boolean
  aufsetzpunkt: Punkt
  /** Letzter Punkt, solange der Stift noch am Ball ist — dort beginnt die Richtung. */
  start: Punkt
  /** Erster Punkt, seit der Stift den Ball verlassen hat — dort beginnt die Uhr. */
  anker: { r: number; tMs: number } | null
  letzter: Punkt & { tMs: number }
  strichDruck: number[]
  spur: Spurpunkt[]

  /* Der letzte Schuss */
  treff: Punkt
  flugDauer: number
  urteil: Urteil
  marke: boolean
  sprung: Punkt

  /** Wo der Torwart gerade ist — er folgt seinem Ziel weich. */
  torwart: Punkt
  /** Sprechblase über dem Tor. `vomTorwart` gibt ihr eine Spitze zum Torwart hin. */
  blase: { text: string; klein: string; vomTorwart: boolean } | null
  /** Noch vorzulesender Satz (A5). Der Aufrufer liest ihn vor und leert das Feld. */
  ansage: string
  teilchen: Teilchen[]
  /** Daneben aufgesetzt: kleiner Puff an dieser Stelle. */
  puff: Punkt & { uhr: number }
  wenigerBewegung: boolean

  /* Zählwerte */
  ansaetze: number
  tore: number
  marken: number
  wappentreffer: number
  liste: Schuss[]
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  /** CSS-Pixel je Bühnen-Pixel, damit sich Strecken später umrechnen lassen. */
  massstab: number

  /** Läuft immer, für die Animationen. */
  t: number
  /** Spielzeit ohne den Schlussjubel. */
  zeitGesamt: number
  zeitUm: boolean
  frist: number
  fertig: boolean
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(
  stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER,
): Welt {
  const deko = dekoAus(verein)
  return {
    stufe, regler, deko,
    phase: 'bereit',
    phaseUhr: 0,
    muster: 0,
    ballNr: 0,
    rundeTore: 0,
    wiederholung: false,
    wiederholungen: 0,
    fehlInFolge: 0,
    hilfe: false,
    hilfen: 0,
    stiftUnten: false,
    aufsetzpunkt: BALL,
    start: BALL,
    anker: null,
    letzter: { ...BALL, tMs: 0 },
    strichDruck: [],
    spur: [],
    treff: BALL,
    flugDauer: 0.4,
    urteil: 'tor',
    marke: false,
    sprung: BALL,
    torwart: { x: 450, y: 285 },
    blase: {
      text: verein ? `Ich bin ${deko.torwart}. Schieß auf den Kreis!` : 'Schieß auf den Kreis!',
      klein: '',
      vomTorwart: true,
    },
    ansage: '',
    teilchen: [],
    puff: { x: 0, y: 0, uhr: 0 },
    wenigerBewegung: false,
    ansaetze: 0,
    tore: 0,
    marken: 0,
    wappentreffer: 0,
    liste: [],
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    massstab: 1,
    t: 0,
    zeitGesamt: 0,
    zeitUm: false,
    frist: FRIST_SEK,
    fertig: false,
  }
}

export function zielName(w: Welt): ZielName {
  const folge = FOLGE[zielArt(w.stufe)]
  return folge[(w.muster * BAELLE_JE_RUNDE + w.ballNr) % folge.length]
}

export const ziel = (w: Welt): Punkt => ZIELE[zielName(w)]

export const istWappen = (w: Welt) => w.ballNr === BAELLE_JE_RUNDE - 1

/** Ruhelage. Zeigt die Marke in die Mitte, macht der Torwart sie frei — sonst verdeckt er sie. */
export const torwartRuhe = (w: Welt): Punkt => ({ x: zielName(w) === 'mitte' ? 340 : 450, y: 285 })

function sage(w: Welt, text: string) {
  w.blase = { text, klein: '', vomTorwart: true }
  w.ansage = text
}

/* ── Der Strich ────────────────────────────────────────────────────────── */

/** Stift aufgesetzt. Ein Schuss beginnt am Ball; daneben gibt es einen kleinen Puff. */
export function aufsetzen(
  w: Welt, x: number, y: number, d: Druck, geraet: Eingabegeraet, tMs: number,
): boolean {
  if (w.phase !== 'bereit') return false
  if (abstand({ x, y }, BALL) > REICHWEITE) {
    w.puff = { x, y, uhr: 0.4 }
    return false
  }
  w.phase = 'zieht'
  w.stiftUnten = true
  w.geraet = geraet
  w.aufsetzpunkt = { x, y }
  w.start = { x, y }
  w.anker = null
  w.letzter = { x, y, tMs }
  w.strichDruck = []
  w.spur = [{ x, y, druck: d.wert }]
  w.blase = null
  return true
}

/**
 * Ein Zeigerpunkt bei aufliegendem Stift. Verlässt der Strich den Schusskreis, wird hier
 * geschossen — nicht erst beim Abheben und nicht erst im nächsten Bild (A1).
 *
 * Die Zeit kommt aus dem Zeigerereignis: die Bildschleife tickt mit 16,7 ms, das wäre bei einem
 * kurzen Strich ein Messfehler von über einem Viertel.
 */
export function ziehe(w: Welt, x: number, y: number, d: Druck, tMs: number): Ereignis | null {
  if (!w.stiftUnten) return null
  w.spur.push({ x, y, druck: d.wert })
  // Nach dem Schuss läuft nur noch die Spur aus.
  if (w.phase !== 'zieht') return null

  const r = abstand({ x, y }, BALL)
  const vorher = w.letzter
  w.letzter = { x, y, tMs }

  // Noch am Ball: zielen darf dauern. Wer neben dem Ball aufsetzt, hat einen entsprechend
  // größeren Rand, sonst liefe die Uhr schon beim Aufsetzen.
  const rand = Math.max(BALL_R, abstand(w.aufsetzpunkt, BALL) + 6)
  if (r <= rand) {
    w.start = { x, y }
    w.anker = null
    w.strichDruck = []
    return null
  }

  if (r < KREIS_R) {
    w.anker ??= { r, tMs }
    if (r >= DRUCK_AB) {
      w.strichDruck.push(d.wert)
      if (d.synthetisch) w.synthetisch = true
    }
    return null
  }

  // Über den Kreis. Zwei Abtastungen liegen oft weit auseinander, deshalb wird der Durchgang
  // auf der Strecke dazwischen ausgerechnet.
  if (d.synthetisch) w.synthetisch = true
  const rVorher = abstand(vorher, BALL)
  const u = klemme((KREIS_R - rVorher) / (r - rVorher), 0, 1)
  const punkt = { x: vorher.x + (x - vorher.x) * u, y: vorher.y + (y - vorher.y) * u }

  const richtung = grad(w.start, punkt)
  if (Math.abs(richtung) > MAX_GRAD) {
    ohneSchuss(w, 'Zieh Richtung Tor!')
    return null
  }

  // Auf die feste Anlaufstrecke hochgerechnet: die erste Abtastung liegt nie genau am Ballrand.
  // Ohne Abtastung zwischen Ball und Kreis war der Strich schneller als jede Messung.
  const ende = vorher.tMs + (tMs - vorher.tMs) * u
  const dauer = w.anker ? ((ende - w.anker.tMs) * ANLAUF) / (KREIS_R - w.anker.r) : 0
  schiesse(w, dauer, richtung)
  return 'schuss'
}

/** Stift abgehoben. Vor dem Schusskreis ist das ein Ansatz ohne Schuss. */
export function abheben(w: Welt) {
  if (w.phase === 'zieht') ohneSchuss(w, 'Zieh bis über den Kreis!')
  w.stiftUnten = false
}

/** Strich verwerfen, ohne ihn zu zählen: das Anhalten oder eine Systemgeste war nicht Ben. */
export function verwirf(w: Welt) {
  if (w.phase === 'zieht') {
    w.phase = 'bereit'
    w.spur = []
  }
  w.stiftUnten = false
}

function ohneSchuss(w: Welt, hinweis: string) {
  w.ansaetze++
  w.phase = 'bereit'
  w.stiftUnten = false
  w.spur = []
  sage(w, hinweis)
}

function schiesse(w: Welt, dauerMs: number, richtungGrad: number) {
  const { mittel, streuung } = druckKennzahlen(w.strichDruck)
  const cv = mittel > 0 ? streuung / mittel : 0

  w.treff = treffpunkt(w.stufe, dauerMs, richtungGrad, w.regler)
  w.urteil = urteil(w.stufe, dauerMs, richtungGrad, cv, w.regler)
  w.marke = w.urteil === 'tor' &&
    abstandZumZiel(w.stufe, zielName(w), w.treff) <= zielRadius(w.stufe, w.regler)
  w.sprung = sprungZiel(w.urteil, w.treff)

  w.ansaetze++
  w.druckWerte.push(...w.strichDruck)
  w.liste.push({
    nr: w.liste.length + 1,
    ziel: zielName(w),
    wappen: istWappen(w),
    hilfe: w.hilfe,
    dauerMs: Math.round(dauerMs),
    richtungGrad,
    zielGrad: grad(BALL, ziel(w)),
    treffX: w.treff.x,
    treffY: w.treff.y,
    druckMittel: mittel,
    druckCv: cv,
    urteil: w.urteil,
  })

  w.phase = 'flug'
  // Ein schneller Strich fliegt auch schneller: 0,25 bis 0,55 Sekunden.
  w.flugDauer = 0.55 - 0.3 * hoehe(w.stufe, dauerMs, w.regler)
  w.phaseUhr = w.flugDauer
}

/** Bei den Streifen zählt nur die Seite, bei den Ecken auch die Höhe. */
function abstandZumZiel(stufe: number, name: ZielName, p: Punkt): number {
  const z = ZIELE[name]
  return zielArt(stufe) === 'streifen' ? Math.abs(p.x - z.x) : abstand(p, z)
}

/* ── Lauf der Dinge ────────────────────────────────────────────────────── */

/** Der Ball ist angekommen: Tor oder ein Hinweis vom Torwart. */
function landen(w: Welt): Ereignis {
  w.phase = 'reaktion'
  w.phaseUhr = REAKTION_SEK

  if (w.urteil !== 'tor') {
    w.fehlInFolge++
    sage(w, HINWEIS[w.urteil])
    return w.urteil
  }

  w.tore++
  w.rundeTore++
  w.fehlInFolge = 0
  const rufe = w.deko.rufe
  if (w.marke) w.marken++

  if (w.marke && istWappen(w)) {
    // Das Ereignis der Runde: Konfettiregen und ein Spruch des Vereins.
    w.wappentreffer++
    const ruf = rufe[(w.wappentreffer - 1) % rufe.length] ?? { text: 'Volltreffer!', uebersetzung: '' }
    w.blase = { text: ruf.text, klein: ruf.uebersetzung, vomTorwart: false }
    konfetti(w, 46, [w.deko.primaer, w.deko.sekundaer, '#ffc800'])
    return 'wappen'
  }
  if (w.marke) {
    const oben = zielName(w) === 'ol' || zielName(w) === 'or'
    w.blase = { text: oben ? 'Winkel!' : 'Volltreffer!', klein: '', vomTorwart: false }
    konfetti(w, 26, ['#ffc800', '#ffe27a'])
    return 'marke'
  }
  w.blase = {
    text: ALLGEMEINE_RUFE[w.tore % ALLGEMEINE_RUFE.length], klein: '', vomTorwart: false,
  }
  konfetti(w, 14, [w.deko.primaer, w.deko.sekundaer])
  return 'tor'
}

function konfetti(w: Welt, anzahl: number, farben: string[]) {
  if (w.wenigerBewegung) return
  for (let i = 0; i < anzahl; i++) {
    // Goldener Winkel: verteilt sich gleichmäßig in alle Richtungen, ganz ohne Zufall.
    const winkel = i * 2.4
    const tempo = 90 + ((i * 37) % 100) * 2.2
    w.teilchen.push({
      x: w.treff.x,
      y: w.treff.y,
      vx: Math.cos(winkel) * tempo,
      vy: Math.sin(winkel) * tempo - 120,
      leben: 1,
      farbe: farben[i % farben.length],
    })
  }
}

/** Der Schuss ist vorbei. Nach dem fünften Ball wird gelockert, sonst gleich nachgelegt. */
function naechsterBall(w: Welt) {
  w.ballNr++
  if (w.ballNr < BAELLE_JE_RUNDE) {
    legeBall(w)
    return
  }
  // Unter der Mindesttrefferquote dieselben Ziele noch einmal, aber nie ein drittes Mal.
  w.wiederholung = !w.wiederholung && musterNochmal(w.regler, w.rundeTore, BAELLE_JE_RUNDE)
  if (w.wiederholung) w.wiederholungen++
  else w.muster++
  w.ballNr = 0
  w.rundeTore = 0
  w.spur = []
  w.hilfe = false
  w.phase = 'lockern'
  w.phaseUhr = LOCKERN_SEK
  sage(w, 'Schüttel die Hand locker aus.')
}

function legeBall(w: Welt) {
  w.phase = 'nachlegen'
  w.phaseUhr = NACHLEGEN_SEK
  w.spur = []
  w.blase = null
  // Hilfe statt Abbruch (C2). Die Anforderung bleibt dabei dieselbe — ein heimlich schwächerer
  // Torwart würde den Messwert verfälschen.
  w.hilfe = w.wiederholung || w.fehlInFolge >= HILFE_NACH
  if (w.hilfe) w.hilfen++
  if (w.fehlInFolge === HILFE_NACH) sage(w, 'Schau mal: so schnell!')
}

/** Zeit um: der nächste ruhige Moment beendet das Spiel, ein fliegender Ball fliegt zu Ende. */
export function beginneAbpfiff(w: Welt) {
  w.zeitUm = true
}

/**
 * Der Schlussjubel hängt **nicht** vom Ergebnis ab: sonst wäre er eine Rückmeldung vor der
 * Selbsteinschätzung und machte C3 wertlos.
 */
function pfeifeAb(w: Welt): Ereignis {
  w.phase = 'abpfiff'
  w.phaseUhr = ABPFIFF_SEK
  w.hilfe = false
  w.spur = []
  w.blase = { text: 'Abpfiff!', klein: 'Danke fürs Training!', vomTorwart: false }
  return 'abpfiff'
}

export function aktualisiere(w: Welt, dt: number): Ereignis | null {
  w.t += dt
  if (w.puff.uhr > 0) w.puff.uhr -= dt
  for (const p of w.teilchen) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 420 * dt
    p.leben -= dt
  }
  w.teilchen = w.teilchen.filter((p) => p.leben > 0)

  // Der Torwart folgt seinem Ziel: im Flug und danach dem Sprung, sonst der Ruhelage.
  const wohin = w.phase === 'flug' || w.phase === 'reaktion' ? w.sprung : torwartRuhe(w)
  const anteil = Math.min(1, dt * (w.phase === 'flug' ? 12 : 6))
  w.torwart.x += (wohin.x - w.torwart.x) * anteil
  w.torwart.y += (wohin.y - w.torwart.y) * anteil

  if (w.phase === 'abpfiff') {
    w.phaseUhr -= dt
    if (w.phaseUhr <= 0) w.fertig = true
    return null
  }

  w.zeitGesamt += dt

  if (w.zeitUm) {
    // Wer den Stift liegen lässt, hielte das Spiel sonst beliebig lange offen (A3).
    if (w.phase === 'zieht') {
      w.frist -= dt
      if (w.frist <= 0) verwirf(w)
    }
    if (w.phase === 'bereit' || w.phase === 'nachlegen' || w.phase === 'lockern') return pfeifeAb(w)
  }

  if (w.phase === 'bereit' || w.phase === 'zieht') return null
  w.phaseUhr -= dt
  if (w.phaseUhr > 0) return null

  if (w.phase === 'flug') return landen(w)
  if (w.phase === 'reaktion') naechsterBall(w)
  else if (w.phase === 'lockern') legeBall(w)
  else w.phase = 'bereit'
  return null
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit`, `genauigkeit` und die Urteile sind **unmaßgeblich**. Sie
 * entstehen im Browser für das Sofortfeedback aus A1 und dürfen nie in einem Bericht landen.
 * Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * `vollstaendigkeit` ist Schüsse je Ansatz: ein Ansatz ohne Schuss ist ein begonnener, nicht zu
 * Ende geführter Strich — genau das Zögern, das Thomas sehen will.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  const schuesse = w.liste.length
  const treffsicherheit = w.liste.map((s) =>
    Math.max(0, 1 - abstandZumZiel(w.stufe, s.ziel, { x: s.treffX, y: s.treffY }) / 220),
  )
  const f = fenster(w.stufe, w.regler)
  return {
    spielId: 'elfmeter',
    dauerMs,
    vollstaendigkeit: w.ansaetze === 0 ? 0 : schuesse / w.ansaetze,
    genauigkeit: schuesse === 0 ? 0 : treffsicherheit.reduce((s, v) => s + v, 0) / schuesse,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      ansaetze: w.ansaetze,
      schuesse,
      tore: w.tore,
      winkel: w.marken,
      wappentreffer: w.wappentreffer,
      hilfen: w.hilfen,
      wiederholungen: w.wiederholungen,
      massstab: w.massstab,
      fenster: {
        dauerMinMs: f.min,
        dauerMaxMs: f.max,
        cvGrenze: cvGrenze(w.stufe, w.regler),
        zielRadius: zielRadius(w.stufe, w.regler),
      },
      liste: w.liste,
    },
  }
}
