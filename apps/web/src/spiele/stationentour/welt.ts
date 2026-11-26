/**
 * Zustand und Bewertung der „Stadionführung". Kennt kein Canvas und kein React — damit die Regeln
 * ohne Browser testbar bleiben (siehe welt.test.ts).
 *
 * Spielidee: Ben führt Besucher durch das Stadion **dieses Vereins**. An jeder Station spurt er das
 * Schlüsselwort eines echten Fakts auf der Anzeigetafel nach; ist es fertig, kommt der ganze Fakt.
 *
 * Die eine Regel, aus der alles folgt: **Die Vorlage füllt sich nur dort, wo der Stift auf ihr
 * liegt. Das Tempo entscheidet nie darüber, ob es weitergeht, sondern nur, wie die Besucher
 * mitgehen.** Zu schnell: sie rufen „Warte!" und holen wieder auf. Zu langsam: sie schauen sich um.
 * Es geht nie jemand weg, und belohnt wird nur dazu: wer ruhig führt, bekommt einen Besucher mehr
 * (C2). Dass am Ende Besucher gehen, wäre ein Verliererzustand — deshalb ist es bewusst nicht so.
 *
 * Frei geschrieben wird nie: Handschrift lässt sich nicht auslesen. Das Nachspuren selbst steht in
 * `../schrift.ts` und ist dasselbe wie in der Startelf.
 */

import * as Funken from '../funken'
import { klemme } from '../geometrie'
import type { Fakt, Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { VORGABE_REGLER, type Regler } from '../regler'
import {
  fahreNach, hatVorlage, laenge, legeZeile, naechster, punktBei, zeilenBreite,
  type Punkt, type Strich, type Zeichenlage,
} from '../schrift'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

/** Die Anzeigetafel und darin der Platz für das Wort. Unter dem Wort steht später der Fakt. */
export const TAFEL = { x: 50, y: 30, b: 800, h: 340 }
export const WORTFELD = { x: 90, y: 62, b: 720, h: 170 }

/* ── Ablauf ────────────────────────────────────────────────────────────── */

/** So lange steht der ganze Fakt auf der Tafel. Zugleich die Mikropause zwischen zwei Wörtern (B3). */
export const FAKT_SEK = 4.5
/** Am Ende davon geht die Gruppe weiter zur nächsten Station. */
export const ABGANG_SEK = 1.2
export const SCHLUSS_SEK = 2.5
export const PULS_SEK = 0.3
/** So viele Stationen hat eine Tour mindestens. Ein Verein mit zwei Fakten zeigt sie zweimal. */
const TOUR_MIN = 4

/* ── Tempo ─────────────────────────────────────────────────────────────── */

/** Bühnen-Pixel je Sekunde. Geschätzt (etwa 2 cm/s) — mit echtem Pencil nachziehen. */
const ZIELTEMPO = 110
/** Gemessen wird über dieses Fenster: eine einzelne Abtastung ist nur Rauschen. */
export const FENSTER_SEK = 0.25
/** Kürzer als das ergibt noch kein Tempo. */
const FENSTER_MIN_SEK = 0.1
/** Nach dem Aufsetzen gilt noch nichts als zu langsam: jeder Strich beginnt im Stand. */
export const ANLAUF_SEK = 0.25
/**
 * So lange muss ein neues Tempo anhalten, bis die Besucher reagieren. Ein Zustand, der an jeder
 * Ecke umspringt, flackert (A2). Ungleich, weil Abbremsen an Ecken richtig ist, Hetzen dagegen das,
 * worum es geht. Die Rückmeldung unter 100 ms (A1) geben Tinte, Vorlage und Fahne.
 */
export const HALTEN_SEK = { imTakt: 0.25, zuSchnell: 0.15, zuLangsam: 0.6 }

export type Tempo = keyof typeof HALTEN_SEK

/* ── Besucher ──────────────────────────────────────────────────────────── */
export const BESUCHER_START = 4
export const BESUCHER_MAX = 10
export const FAN_SEK = 1.2

/** Wo der Stadionführer bei Wortanfang und Wortende steht. */
export const WEG = { von: 330, bis: 830 }
const DRAUSSEN = -80
const FUEHRER_TEMPO = 700
/** Die Gruppe holt immer auf; nur während Ben hetzt, bleibt sie ein Stück zurück. */
const GRUPPE_TEMPO = 300
const GRUPPE_BREMST = 30
const ABSTAND = 60

/* ── Hilfe (C2) und Verkrampfung (B3) ──────────────────────────────────── */
export const HILFE_SEK = 6
/** Ab so vielen Fehlstarts oder so langer Zeit ohne Fortschritt rollt ein Ball den Strich vor. */
export const BALL_AB_FEHLSTARTS = 3
export const BALL_AB_SEK = 12
export const BLASE_SEK = 4
export const WARTE_SEK = 1.2

/** Ab diesem Druck für so lange kommt der Hinweis, höchstens einmal je Station. */
export const VERKRAMPFT = 0.85
export const VERKRAMPFT_SEK = 1.5

export const HILFE_TEXT = 'Setz den Stift am grünen Punkt an.'
export const LOCKER_TEXT = 'Ganz locker halten.'
export const WARTE_TEXT = 'Warte!'
export const RUNDE_TEXT = 'Noch eine Runde, bitte!'
export const SCHLUSS_TEXT = 'Danke für die Führung!'

/* ── Funken (A1) ───────────────────────────────────────────────────────────
   Ein kurzer Stoß je fertigem Zeichen. Ben hat ADHS (A2): es flackert nichts dauerhaft. Kein
   Zufall, damit jeder Test wiederholbar ist. */
export const FUNKEN_SEK = 0.4
export const FUNKEN_JE_ZEICHEN = 10

/** So sehen die Funken dieses Spiels aus; die Mechanik steht in funken.ts. */
const STOSS: Funken.Stossart = {
  leben: FUNKEN_SEK,
  // Keine Obergrenze: es gibt nur einen Stoß je fertigem Zeichen, und der verlischt schnell.
  max: Infinity,
  tempo: 130, tempoStufe: 0, auftrieb: 40,
}

/** Was die Welt dem Aufrufer meldet, damit er sofort einen Klang spielen kann (A1). */
export type Ereignis = 'strich' | 'zeichen' | 'wort' | 'hilfe' | 'locker' | 'schluss'

/* ── Stufe und Regler (B1) ──────────────────────────────────────────────────
   Startwerte, keine Messwerte. Das Zieltempo steigt bewusst nicht mit der Stufe: höher heißt
   gleichmäßiger, nicht schneller — Hetzen verkrampft (B3). */
const STUFEN = [
  { glyphHoehe: 150, toleranz: 34, tempoBand: 0.6, druckBand: 0.2, mindestTakt: 0.5 },
  { glyphHoehe: 130, toleranz: 28, tempoBand: 0.45, druckBand: 0.15, mindestTakt: 0.6 },
  { glyphHoehe: 110, toleranz: 22, tempoBand: 0.3, druckBand: 0.1, mindestTakt: 0.7 },
  { glyphHoehe: 90, toleranz: 16, tempoBand: 0.25, druckBand: 0.08, mindestTakt: 0.8 },
  { glyphHoehe: 90, toleranz: 12, tempoBand: 0.25, druckBand: 0.08, mindestTakt: 0.8 },
]

export type Vorgaben = {
  glyphHoehe: number
  /** Halbe Breite der Spur in Bühnen-Pixeln. */
  toleranz: number
  zielTempo: number
  /** Anteil um das Zieltempo, der noch als Takt gilt. */
  tempoBand: number
  druckBand: number
  mindestTakt: number
}

/**
 * Stufe mal Regler. Die Grenzen halten das Spiel bei den Faktoren 0,1 und 3 spielbar: schmaler als
 * zehn Pixel trifft niemand die Spur, breiter als 0,8 Bänder lägen zwei Striche desselben
 * Buchstabens in einer. Das Tempo bleibt in einem Bereich, den eine Hand schreiben kann.
 *
 * Die Mindesttrefferquote ist hier der Taktanteil, ab dem ein Besucher dazukommt. Sie wirkt wie
 * überall erst über der Vorgabe. 0,9 ist das Höchste — an jeder Ecke bremst man zu Recht.
 */
export function vorgaben(stufe: number, regler: Regler): Vorgaben {
  const s = STUFEN[klemme(Math.round(stufe), 1, STUFEN.length) - 1]
  return {
    ...s,
    toleranz: klemme(s.toleranz * regler.toleranz, 10, 0.4 * s.glyphHoehe),
    zielTempo: klemme(ZIELTEMPO * regler.zielgeschwindigkeit, 40, 280),
    mindestTakt: Math.max(s.mindestTakt, Math.min(0.9, regler.mindesttrefferquote)),
  }
}

/* ── Wort auslegen ─────────────────────────────────────────────────────── */

const ERSATZ_FAKTEN: Fakt[] = [{ text: 'Im Stadion fällt das nächste Tor.', wort: 'TOR' }]

/** Legt das Wort mittig ins Wortfeld. Passt es nicht, wird es kleiner. */
export function legeAus(wort: string, glyphHoehe: number): Zeichenlage[] {
  // Großbuchstaben und Ziffern sind zwei Bänder hoch.
  const band = Math.min(glyphHoehe / 2, WORTFELD.b / zeilenBreite(wort))
  return legeZeile(
    wort,
    band,
    WORTFELD.x + (WORTFELD.b - zeilenBreite(wort) * band) / 2,
    WORTFELD.y + WORTFELD.h / 2 - band,
  )
}

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** schreiben → fakt → schreiben → … → `schluss`: der Rest des Wortes leuchtet auf → fertig. */
export type Phase = 'schreiben' | 'fakt' | 'schluss' | 'fertig'

/** Ein Punkt von Bens Tinte. `neu` beginnt einen Strich, `zeichen` ist die Nummer des Zeichens. */
export type Tintenpunkt = {
  x: number; y: number; druck: number; drin: boolean; neu: boolean; zeichen: number
}

export type Welt = {
  stufe: number
  vorgaben: Vorgaben
  farben: Verein['farben']
  fakten: Fakt[]
  phase: Phase
  /** Restzeit der Phase (außer beim Schreiben). */
  uhr: number
  /** Wievielte Station, ab 0. Die Fakten kommen immer in derselben Reihenfolge, damit zwei
   *  Sitzungen vergleichbar sind; danach beginnt die Tour von vorn. */
  station: number
  zeichen: Zeichenlage[]
  zeichenNr: number
  strichNr: number
  /** Nachgespurte Bogenlänge auf dem aktiven Strich. Wächst nur, nie zurück. */
  fortschritt: number
  /** Bogenlänge der fertigen Striche und des ganzen Wortes. */
  gespurt: number
  wortLaenge: number
  /** Stift liegt auf. */
  schreibt: boolean
  /** Dieses Aufsetzen begann an der Spitze — nur dann füllt sich der Strich. */
  faehrt: boolean
  /** Der Strich, der in diesem Aufsetzen fertig wurde. Sein Auslauf gilt noch als „drin". */
  auslauf: Strich | null
  /** Darf ohne Abheben zum nächsten Strich desselben Zeichens gezogen werden? */
  imFluss: boolean
  letzter: Punkt | null
  tinte: Tintenpunkt[]
  // --- Tempo ---
  /** Weg je Bild der letzten FENSTER_SEK. */
  fenster: { sek: number; weg: number }[]
  wegImBild: number
  /** Sekunden, seit dieser Strich läuft. */
  strichSek: number
  /** Momentantempo in Bühnen-Pixeln je Sekunde — die Fahne weht danach. */
  v: number
  /** Geglättet: danach verhalten sich die Besucher. */
  tempo: Tempo
  kandidat: Tempo
  kandidatSek: number
  /** Sekunden je Zustand: in dieser Station und im ganzen Spiel. */
  takt: Record<Tempo, number>
  taktGesamt: Record<Tempo, number>
  // --- Druck ---
  druck: number
  /** Gleitendes Mittel. Gemessen wird, ob Ben gleichmäßig drückt, nicht wie fest. */
  druckMittel: number
  druckSek: number
  druckDrinSek: number
  verkrampftSek: number
  /** Der Hinweis kam an dieser Station schon. */
  gewarnt: boolean
  // --- Besucher ---
  besucher: number
  fuehrerX: number
  gruppeX: number
  fanUhr: number
  // --- Hilfe ---
  fehlstarts: number
  ohneFortschritt: number
  /** Sekunden, seit der Stift zuletzt auflag. */
  ohneStift: number
  hilfeGesagt: boolean
  /** Wer spricht: die Besucher unten oder der Stadionsprecher. */
  blase: { text: string; uhr: number; wer: 'gruppe' | 'sprecher' } | null
  pulsUhr: number
  funken: Funken.Funke[]
  /** `prefers-reduced-motion`: dann gibt es keine Funken. Setzt der Aufrufer. */
  wenigerBewegung: boolean
  // --- Zähler für das Ergebnis ---
  woerter: string[]
  stationenFertig: number
  /** An dieser Station hat Ben schon richtig angesetzt. Nur dann gilt sie als begonnen. */
  begonnen: boolean
  gespurteStriche: number
  verkrampfungsHinweise: number
  proben: number
  probenDrin: number
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  zeitAus: boolean
  /** Ende des Schreibens. Die Schlussanimation zählt nicht in die Dauer. */
  schreibEnde: number | null
}

const keineZeit = () => ({ imTakt: 0, zuSchnell: 0, zuLangsam: 0 })

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(
  stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER,
): Welt {
  // Nur was sich schreiben lässt. Fehlt eine Vorlage, fällt das im Content-Test auf; hier darf es
  // nicht zu einer leeren Tafel führen.
  const fakten = (verein?.fakten ?? []).filter((f) => f.wort.trim() && hatVorlage(f.wort))
  const w: Welt = {
    stufe,
    vorgaben: vorgaben(stufe, regler),
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    fakten: fakten.length ? fakten : ERSATZ_FAKTEN,
    phase: 'schreiben',
    uhr: 0,
    station: 0,
    zeichen: [],
    zeichenNr: 0,
    strichNr: 0,
    fortschritt: 0,
    gespurt: 0,
    wortLaenge: 1,
    schreibt: false,
    faehrt: false,
    auslauf: null,
    imFluss: false,
    letzter: null,
    tinte: [],
    fenster: [],
    wegImBild: 0,
    strichSek: 0,
    v: 0,
    tempo: 'imTakt',
    kandidat: 'imTakt',
    kandidatSek: 0,
    takt: keineZeit(),
    taktGesamt: keineZeit(),
    druck: 0,
    druckMittel: 0,
    druckSek: 0,
    druckDrinSek: 0,
    verkrampftSek: 0,
    gewarnt: false,
    besucher: BESUCHER_START,
    fuehrerX: DRAUSSEN,
    gruppeX: DRAUSSEN - ABSTAND,
    fanUhr: 0,
    fehlstarts: 0,
    ohneFortschritt: 0,
    ohneStift: 0,
    hilfeGesagt: false,
    blase: null,
    pulsUhr: 0,
    funken: [],
    wenigerBewegung: false,
    woerter: [],
    stationenFertig: 0,
    begonnen: false,
    gespurteStriche: 0,
    verkrampfungsHinweise: 0,
    proben: 0,
    probenDrin: 0,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    zeitAus: false,
    schreibEnde: null,
  }
  beginneStation(w)
  return w
}

export const faktVon = (w: Welt): Fakt => w.fakten[w.station % w.fakten.length]

/** Stationen je Tour: ganze Durchgänge durch die Fakten, aber mindestens TOUR_MIN. */
export const tourLaenge = (w: Welt) => w.fakten.length * Math.ceil(TOUR_MIN / w.fakten.length)

/** Wievielte Tour, ab 0. Ab der zweiten läuft ein Hund mit, ab der dritten sind Fahnen dabei. */
export const tour = (w: Welt) => Math.floor(w.station / tourLaenge(w))

export const aktiverStrich = (w: Welt): Strich => w.zeichen[w.zeichenNr].striche[w.strichNr]
export const band = (w: Welt) => w.zeichen[0].band
export const startradius = (w: Welt) => Math.max(18, 1.5 * w.vorgaben.toleranz)
/** Hier geht es weiter — der grüne Punkt. */
export const spitze = (w: Welt): Punkt => punktBei(aktiverStrich(w), w.fortschritt)

/** 0 bis 1: wie viel des Wortes nachgespurt ist. */
export const wortAnteil = (w: Welt) =>
  w.phase === 'schreiben' ? (w.gespurt + w.fortschritt) / w.wortLaenge : 1

/** 0 nichts · 1 der Startpunkt pulsiert · 2 ein Ball macht den Strich vor. */
export function hilfeVon(w: Welt): 0 | 1 | 2 {
  if (w.fehlstarts >= BALL_AB_FEHLSTARTS || w.ohneFortschritt >= BALL_AB_SEK) return 2
  return w.fehlstarts > 0 || w.ohneStift >= HILFE_SEK ? 1 : 0
}

function beginneStation(w: Welt) {
  w.phase = 'schreiben'
  w.zeichen = legeAus(faktVon(w).wort, w.vorgaben.glyphHoehe)
  w.wortLaenge = Math.max(1, w.zeichen.flatMap((z) => z.striche).reduce((l, s) => l + laenge(s), 0))
  w.zeichenNr = 0
  w.strichNr = 0
  w.gespurt = 0
  w.tinte = []
  w.pulsUhr = 0
  w.takt = keineZeit()
  w.tempo = 'imTakt'
  w.gewarnt = false
  w.begonnen = false
  w.ohneStift = 0
  // Die Gruppe kommt von links an die neue Station. Ben darf währenddessen schon schreiben:
  // Warten ist für ihn das Schwerste.
  w.fuehrerX = DRAUSSEN
  w.gruppeX = DRAUSSEN - ABSTAND
  beginneStrich(w)
}

function beginneStrich(w: Welt) {
  w.fortschritt = 0
  w.faehrt = false
  w.fehlstarts = 0
  w.ohneFortschritt = 0
}

/** Ab hier füllt sich der Strich, und Tempo und Druck werden neu gemessen. */
function fahreLos(w: Welt) {
  w.faehrt = true
  w.fenster = []
  w.wegImBild = 0
  w.strichSek = 0
  if (w.begonnen) return
  w.begonnen = true
  w.woerter.push(faktVon(w).wort)
}

/* ── Nachspuren ────────────────────────────────────────────────────────── */

const nah = (a: Punkt, x: number, y: number, r: number) => Math.hypot(a.x - x, a.y - y) <= r

/** Stift aufgesetzt. Gültig nur am grünen Punkt; woanders passiert nichts außer der Hilfe (C2). */
export function setzeAn(w: Welt, x: number, y: number): Ereignis | undefined {
  hebeAb(w)
  w.schreibt = true
  w.ohneStift = 0
  if (w.phase !== 'schreiben') return
  if (!nah(spitze(w), x, y, startradius(w))) {
    w.fehlstarts++
    return
  }
  fahreLos(w)
  // Ein Tupfer (Umlautpunkt) ist mit dem Aufsetzen getan.
  if (aktiverStrich(w).length === 1) return strichFertig(w)
}

export function hebeAb(w: Welt) {
  w.schreibt = false
  w.faehrt = false
  w.auslauf = null
  w.imFluss = false
  w.letzter = null
  w.verkrampftSek = 0
  // Abgesetzt ist nie zu schnell: die Besucher holen auf (C2).
  w.v = 0
  w.tempo = 'imTakt'
}

/** Ein Zeigerpunkt bei aufliegendem Stift. */
export function schreibe(w: Welt, x: number, y: number, d: Druck): Ereignis | undefined {
  if (!w.schreibt || w.phase !== 'schreiben') return
  const s = aktiverStrich(w)
  const drin = inSpur(w, s, x, y) || (w.auslauf !== null && inSpur(w, w.auslauf, x, y))

  w.proben++
  if (drin) w.probenDrin++
  w.druck = d.wert
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.tinte.push({ x, y, druck: d.wert, drin, neu: w.letzter === null, zeichen: w.zeichenNr })

  // Wer einen Strich sauber beendet hat, darf ohne Abheben zum nächsten Startpunkt ziehen.
  if (!w.faehrt && w.imFluss && nah(s[0], x, y, startradius(w))) fahreLos(w)

  const a = w.letzter ?? { x, y }
  w.letzter = { x, y }
  if (!w.faehrt) return

  w.wegImBild += Math.hypot(x - a.x, y - a.y)
  const n = fahreNach(s, a, { x, y }, w.fortschritt, w.vorgaben.toleranz, band(w))
  if (n.fortschritt > w.fortschritt) w.ohneFortschritt = 0
  w.fortschritt = n.fortschritt
  if (n.fertig) return strichFertig(w)
}

const inSpur = (w: Welt, s: Strich, x: number, y: number) =>
  naechster(s, x, y, 0, laenge(s)).abstand <= w.vorgaben.toleranz

function strichFertig(w: Welt): Ereignis {
  const s = aktiverStrich(w)
  const z = w.zeichen[w.zeichenNr]
  w.gespurteStriche++
  w.gespurt += laenge(s)
  w.auslauf = s
  if (w.strichNr + 1 < z.striche.length) {
    w.strichNr++
    beginneStrich(w)
    w.imFluss = true
    return 'strich'
  }

  // Zeichen fertig: die graue Tinte daneben verschwindet, Bens Strich auf der Vorlage bleibt.
  // Ins nächste Zeichen geht es nur mit neuem Aufsetzen.
  w.imFluss = false
  w.faehrt = false
  w.pulsUhr = PULS_SEK
  w.tinte = w.tinte.filter((t) => t.drin || t.zeichen !== w.zeichenNr)
  funkenstoss(w, s[s.length - 1])
  if (w.zeichenNr + 1 < w.zeichen.length) {
    w.zeichenNr++
    w.strichNr = 0
    beginneStrich(w)
    return 'zeichen'
  }

  w.stationenFertig++
  w.phase = 'fakt'
  w.uhr = FAKT_SEK
  w.blase = null
  w.tempo = 'imTakt'
  const gemessen = w.takt.imTakt + w.takt.zuSchnell + w.takt.zuLangsam
  const ruhig = gemessen > 0 && w.takt.imTakt / gemessen >= w.vorgaben.mindestTakt
  if (ruhig && w.besucher < BESUCHER_MAX) {
    w.besucher++
    w.fanUhr = FAN_SEK
  }
  return 'wort'
}

function funkenstoss(w: Welt, q: Punkt) {
  if (w.wenigerBewegung) return
  // Abwechselnd Vereinsfarbe und dasselbe Gelb wie `F.leuchtet` in zeichnen.ts.
  const farben = [w.farben.sekundaer, '#ffd54a']
  Funken.funkenstoss(w.funken, q.x, q.y, farben, FUNKEN_JE_ZEICHEN, STOSS)
}

/* ── Tempo und Druck ───────────────────────────────────────────────────── */

/**
 * Misst einmal je Bild und nicht je Zeigerereignis: so zählt auch das Stehenbleiben, bei dem gar
 * keine Ereignisse kommen, und alle gebündelten Pencil-Punkte eines Bildes ergeben zusammen einen
 * Weg. Über das Fenster gemittelt, ist die Bildauflösung dafür genau genug.
 */
function missTempo(w: Welt, dt: number) {
  w.strichSek += dt
  w.fenster.push({ sek: dt, weg: w.wegImBild })
  w.wegImBild = 0
  const sek = () => w.fenster.reduce((s, b) => s + b.sek, 0)
  while (sek() > FENSTER_SEK + 1e-9) w.fenster.shift()
  w.v = w.fenster.reduce((s, b) => s + b.weg, 0) / Math.max(FENSTER_MIN_SEK, sek())

  const { zielTempo, tempoBand } = w.vorgaben
  const jetzt: Tempo =
    w.v > zielTempo * (1 + tempoBand) ? 'zuSchnell'
      : w.v < zielTempo * (1 - tempoBand) ? 'zuLangsam' : 'imTakt'
  // Im Anlauf zählt nur Hetzen: ein kurzer Strich wäre sonst vorbei, bevor gemessen wird.
  if (jetzt !== 'zuSchnell' && w.strichSek <= ANLAUF_SEK) return

  // Die Haltezeit läuft über das Absetzen hinweg, damit auch viele kurze, hastige Striche zählen.
  if (jetzt !== w.kandidat) w.kandidatSek = 0
  w.kandidat = jetzt
  w.kandidatSek += dt
  if (w.kandidatSek >= HALTEN_SEK[jetzt] - 1e-9 && jetzt !== w.tempo) {
    w.tempo = jetzt
    if (jetzt === 'zuSchnell') w.blase = { text: WARTE_TEXT, uhr: WARTE_SEK, wer: 'gruppe' }
  }
  w.takt[w.tempo] += dt
  w.taktGesamt[w.tempo] += dt
}

/** Gleitendes Mittel über etwa eine Sekunde; die Aufsetzrampe zählt nicht mit. */
function missDruck(w: Welt, dt: number) {
  if (w.strichSek <= ANLAUF_SEK) {
    w.druckMittel = w.druck
    return
  }
  w.druckSek += dt
  if (Math.abs(w.druck - w.druckMittel) <= w.vorgaben.druckBand + 1e-9) w.druckDrinSek += dt
  w.druckMittel += (w.druck - w.druckMittel) * Math.min(1, dt)
}

/** B3: hält Ben den Stift lange zu fest, erinnert ihn der Stadionsprecher — höchstens einmal je
 *  Station, sonst wird daraus ein Vorwurf. */
function pruefeVerkrampfung(w: Welt, dt: number): Ereignis | undefined {
  w.verkrampftSek = w.druck > VERKRAMPFT ? w.verkrampftSek + dt : 0
  if (w.verkrampftSek < VERKRAMPFT_SEK || w.gewarnt) return
  w.gewarnt = true
  w.verkrampfungsHinweise++
  w.blase = { text: LOCKER_TEXT, uhr: BLASE_SEK, wer: 'sprecher' }
  return 'locker'
}

/* ── Ablauf ────────────────────────────────────────────────────────────── */

/** Die Uhr des SpielScreens ist abgelaufen. Beendet wird erst, wenn der Stift oben ist. */
export function beende(w: Welt) {
  w.zeitAus = true
}

const geheZu = (x: number, ziel: number, schritt: number) =>
  Math.abs(ziel - x) <= schritt ? ziel : x + Math.sign(ziel - x) * schritt

function bewegeGruppe(w: Welt, dt: number) {
  const geht = w.phase === 'fakt' && w.uhr < ABGANG_SEK && !w.zeitAus
  const ziel = geht ? W + 400 : WEG.von + (WEG.bis - WEG.von) * wortAnteil(w)
  w.fuehrerX = geheZu(w.fuehrerX, ziel, FUEHRER_TEMPO * dt)
  const tempo = geht ? FUEHRER_TEMPO : w.tempo === 'zuSchnell' ? GRUPPE_BREMST : GRUPPE_TEMPO
  w.gruppeX = geheZu(w.gruppeX, w.fuehrerX - ABSTAND, tempo * dt)
}

export function aktualisiere(w: Welt, dt: number): Ereignis | undefined {
  w.zeitGesamt += dt
  w.pulsUhr = Math.max(0, w.pulsUhr - dt)
  w.fanUhr = Math.max(0, w.fanUhr - dt)
  if (w.blase && (w.blase.uhr -= dt) <= 0) w.blase = null
  w.funken = Funken.bewegeFunken(w.funken, dt)
  bewegeGruppe(w, dt)
  if (w.zeitAus && !w.schreibt) w.schreibEnde ??= w.zeitGesamt

  if (w.phase === 'schreiben') return aktualisiereSchreiben(w, dt)

  w.uhr -= dt
  if (w.uhr > 0) return
  if (w.phase !== 'fakt') {
    w.phase = 'fertig'
    return
  }
  // Läuft die Uhr beim Fakt ab, ist das schon der saubere Moment: kein neues Wort mehr.
  if (w.zeitAus) return starteSchluss(w)
  w.station++
  beginneStation(w)
  // Die Gruppe bleibt, und es kommt etwas dazu (siehe `tour`) — eine neue Gruppe hieße, dass die
  // alte gegangen ist.
  if (w.station % tourLaenge(w) === 0) {
    w.blase = { text: RUNDE_TEXT, uhr: BLASE_SEK, wer: 'gruppe' }
  }
}

function aktualisiereSchreiben(w: Welt, dt: number): Ereignis | undefined {
  if (w.zeitAus && !w.schreibt) return starteSchluss(w)
  w.ohneFortschritt += dt
  if (w.schreibt) {
    if (!w.faehrt) return
    missTempo(w, dt)
    missDruck(w, dt)
    return pruefeVerkrampfung(w, dt)
  }
  w.ohneStift += dt
  if (w.ohneStift < HILFE_SEK || w.hilfeGesagt) return
  w.hilfeGesagt = true
  w.blase = { text: HILFE_TEXT, uhr: BLASE_SEK, wer: 'sprecher' }
  return 'hilfe'
}

/** Der Rest des Wortes leuchtet von selbst auf: Ben sieht nie ein halbes Wort (C2). */
function starteSchluss(w: Welt): Ereignis {
  w.phase = 'schluss'
  w.uhr = SCHLUSS_SEK
  w.blase = { text: SCHLUSS_TEXT, uhr: SCHLUSS_SEK, wer: 'gruppe' }
  return 'schluss'
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

export const dauerMs = (w: Welt) => Math.round((w.schreibEnde ?? w.zeitGesamt) * 1000)

/**
 * ACHTUNG — `vollstaendigkeit`, `genauigkeit` und alle Anteile in `extra` sind **unmaßgeblich**. Sie
 * entstehen im Browser für das Sofortfeedback aus A1 und dürfen nie in einem Bericht landen. Die
 * maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * Vollständigkeit: fertige je begonnener Station, die letzte anteilig. `abgebrochen` ist immer
 * false: im Spiel gibt es keinen Abbruchweg (C2).
 *
 * `vorgaben` hält die wirksamen Werte fest: sonst sähe ein engeres Tempoband wie eine
 * Verschlechterung aus.
 */
export function ergebnis(w: Welt): SpielErgebnis {
  const offen = w.woerter.length > w.stationenFertig
  const rest = offen ? (w.gespurt + w.fortschritt) / w.wortLaenge : 0
  const zeit = w.taktGesamt.imTakt + w.taktGesamt.zuSchnell + w.taktGesamt.zuLangsam
  const anteil = (teil: number, ganz: number) => (ganz === 0 ? 0 : teil / ganz)
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'stationentour',
    dauerMs: dauerMs(w),
    vollstaendigkeit: anteil(w.stationenFertig + rest, w.woerter.length),
    genauigkeit: anteil(w.probenDrin, w.proben),
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen: false,
    extra: {
      version: 1,
      woerter: w.woerter,
      stationenFertig: w.stationenFertig,
      stationenBegonnen: w.woerter.length,
      gespurteStriche: w.gespurteStriche,
      anteilImTakt: anteil(w.taktGesamt.imTakt, zeit),
      anteilZuSchnell: anteil(w.taktGesamt.zuSchnell, zeit),
      anteilZuLangsam: anteil(w.taktGesamt.zuLangsam, zeit),
      anteilDruckImBand: anteil(w.druckDrinSek, w.druckSek),
      besucher: w.besucher,
      verkrampfungsHinweise: w.verkrampfungsHinweise,
      vorgaben: w.vorgaben,
    },
  }
}
