/**
 * Zustand und Bewertung der „Startelf". Kennt kein Canvas und kein React — damit die Regeln ohne
 * Browser testbar bleiben (siehe welt.test.ts).
 *
 * Spielidee: Ben schreibt in der Kabine die Aufstellung **dieses Vereins** an die Tafel. Jeder
 * geschriebene Spieler kommt als Magnet auf seinen Platz, und der Stadionsprecher ruft ihn auf.
 *
 * Die eine Regel, aus der alles folgt: **Ein Strich der Vorlage füllt sich nur vom Startpunkt aus
 * und nur, solange der Stift im Korridor vorwärts fährt.** Woanders aufsetzen, rückwärts fahren
 * oder abkürzen färbt nichts — es geht aber auch nichts kaputt, und die graue Kreide bleibt stehen
 * (C2). Absetzen ist erlaubt: weiter geht es an der Spitze des gefüllten Stücks.
 *
 * Frei geschrieben wird nie: Handschrift lässt sich nicht auslesen, bewertet wird nur Geometrie.
 *
 * Feste Vorlagen kennen „falsch", und ein Kind, das die 3 immer unten anfängt, käme nie weiter.
 * Deshalb die **Hilfeleiter** (`hilfeVon`): erst pulsiert der Startpunkt, dann rollt ein Ball den
 * Strich vor, dann fährt er dauerhaft voraus. Von selbst fertig wird ein Strich nie.
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { VORGABE_REGLER, type Regler } from '../regler'
import {
  hatVorlage, laenge, legeZeile, naechster, punktBei, zeilenBreite,
  type Punkt, type Strich, type Zeichenlage,
} from '../schrift'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

/** Hier schreibt Ben. */
export const ZEILE = { x: 310, y: 180, b: 570, h: 270 }
/** Zwischen zwei Schreibzeilen (Stufe 5), in Bändern: 3 Bänder Lineatur und etwas Luft. */
const ZEILENSCHRITT = 3.2

/** So lange jubelt die Kurve nach einem Spieler, so lange steht die volle Tafel, und so lange
 *  ergänzt der Profi am Ende die restlichen Magnete. */
export const JUBEL_SEK = 1.6
export const TAFEL_SEK = 2
export const SCHLUSS_SEK = 1.5
/** So lange pulsiert ein fertiges Zeichen. */
export const PULS_SEK = 0.3

/* ── Nachspuren ────────────────────────────────────────────────────────── */

/** So viel vom Ende darf fehlen: ein Zehntel des Strichs oder dieses Stück in Bändern, je nachdem,
 *  was mehr ist. Beim Querstrich des F wäre ein Zehntel sonst ein halber Millimeter. */
export const REST = 0.15
/** So weit voraus (in Bändern) darf der Stift springen. Verhindert Abkürzen. */
export const VORSPRUNG = 0.6
/** Zwischen zwei Abtastungen wird in so kleinen Schritten gefahren (Bühnen-Pixel). */
const SCHRITT = 6

/* ── Hilfe (C2) ────────────────────────────────────────────────────────── */
export const MITFAHREN_AB = 4
export const MITFAHREN_SEK = 8
export const BALL_SEK = 1.4
export const ERMUTIGUNG_SEK = 20
export const BLASE_SEK = 4

export const HILFE_TEXT = 'Fang am grünen Punkt an.'
export const ERMUTIGUNG_TEXT = 'Wir schreiben zusammen weiter.'

/* ── Funken (A1) ───────────────────────────────────────────────────────────
   Ein kurzer Stoß am Strichende, sonst nichts. Ben hat ADHS (A2): es flackert nichts dauerhaft,
   jeder Funke lebt genau FUNKEN_SEK und die Zahl ist hart begrenzt. Kein Zufall, damit jeder
   Test wiederholbar ist. */
export const FUNKEN_SEK = 0.6
export const FUNKEN_MAX = 24

export type Funke = { x: number; y: number; vx: number; vy: number; leben: number; farbe: string }

/** Was die Welt dem Aufrufer meldet, damit er sofort einen Klang spielen kann (A1). */
export type Ereignis = 'strich' | 'zeichen' | 'spieler' | 'tafel' | 'hilfe' | 'ermutigung'

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Zwei Achsen: Inhalt (Nummer → Nachname → ganzer Name) und Hilfe (dicke Spur → dünne Spur →
   Geisterschrift). Bandhöhe in Bühnen-Pixeln als Obergrenze, Korridor und Startradius als
   Anteil davon. Startwerte, keine Messwerte — mit echtem Pencil nachziehen.

   Auf Stufe 4 und 5 ist der Korridor wieder breiter, weil die Vorlage kaum noch zu sehen ist. */
export type Hilfsbild = 'dick' | 'duenn' | 'geist'

const STUFEN: { band: number; korridor: number; start: number; bild: Hilfsbild }[] = [
  { band: 90, korridor: 0.45, start: 0.5, bild: 'dick' },
  { band: 72, korridor: 0.38, start: 0.45, bild: 'duenn' },
  { band: 60, korridor: 0.35, start: 0.4, bild: 'duenn' },
  { band: 48, korridor: 0.4, start: 0.4, bild: 'geist' },
  { band: 40, korridor: 0.4, start: 0.4, bild: 'geist' },
]

const stufenWert = (stufe: number) => STUFEN[Math.min(5, Math.max(1, Math.round(stufe))) - 1]

export const hilfsbild = (w: Welt) => stufenWert(w.stufe).bild

/** Halbe Breite der Bahn um die Vorlage. Regler Toleranz: größer ist leichter. */
export const korridor = (stufe: number, band: number, faktor = 1) =>
  Math.max(12, stufenWert(stufe).korridor * band) * faktor

/** So nah am grünen Punkt muss Ben aufsetzen. Untergrenze, weil lange Namen das Band verkleinern
 *  und ein Punkt von der Größe einer Stiftspitze nicht zu treffen ist. */
export const startradius = (stufe: number, band: number, faktor = 1) =>
  Math.max(18, stufenWert(stufe).start * band) * faktor

/* ── Aufstellung ───────────────────────────────────────────────────────── */

export type Spieler = { nummer: number; name: string }

const ERSATZ_KADER: Spieler[] = [
  { nummer: 1, name: 'Spieler' },
  { nummer: 9, name: 'Spielerin' },
]

/** 4-3-3 von hinten nach vorn, Mittelpunkte der elf Magnetplätze. */
export const PLAETZE: Punkt[] = [
  { x: 154, y: 548 },
  { x: 64, y: 428 }, { x: 124, y: 440 }, { x: 184, y: 440 }, { x: 244, y: 428 },
  { x: 84, y: 290 }, { x: 154, y: 306 }, { x: 224, y: 290 },
  { x: 74, y: 160 }, { x: 154, y: 136 }, { x: 234, y: 160 },
]

/**
 * Auf welchem Platz der i-te von n Spielern steht. Hat ein Verein weniger als elf Einträge,
 * verteilen sie sich gleichmäßig von hinten nach vorn; die übrigen Plätze hat der Profi schon
 * gefüllt. Mit elf Einträgen bekommt jeder seinen Platz — das ist dann nur eine Content-Änderung.
 */
export const platzVon = (i: number, n: number) => (n <= 1 ? 0 : Math.round((i * 10) / (n - 1)))

export const nachname = (s: Spieler) => s.name.split(' ').at(-1) ?? s.name

/** Was Ben für diesen Spieler schreibt, eine oder zwei Zeilen. */
export function schreibtext(stufe: number, s: Spieler): string[] {
  const nummer = String(s.nummer)
  if (stufe <= 2) return [nummer]
  if (stufe === 3) return [`${nummer} ${nachname(s).toUpperCase()}`]
  if (stufe === 4) return [`${nummer} ${nachname(s)}`]

  // Stufe 5: so umbrechen, dass die längere Zeile möglichst kurz ist — dann bleibt die Schrift groß.
  const worte = [nummer, ...s.name.split(' ')]
  let beste = [worte.join(' ')]
  for (let i = 1; i < worte.length; i++) {
    const zeilen = [worte.slice(0, i).join(' '), worte.slice(i).join(' ')]
    if (breiteste(zeilen) < breiteste(beste)) beste = zeilen
  }
  return beste
}

const breiteste = (zeilen: string[]) => Math.max(...zeilen.map(zeilenBreite))

/** Passt der Text nicht in die Zeile, wird das Band kleiner. */
export const bandFuer = (stufe: number, zeilen: string[]) =>
  Math.min(stufenWert(stufe).band, ZEILE.b / breiteste(zeilen))

/** Legt die Zeichen eines Spielers mittig in die Schreibzeile. */
export function legeAus(stufe: number, s: Spieler): Zeichenlage[] {
  const zeilen = schreibtext(stufe, s)
  const band = bandFuer(stufe, zeilen)
  const hoehe = (3 + (zeilen.length - 1) * ZEILENSCHRITT) * band
  return zeilen.flatMap((text, i) =>
    legeZeile(
      text,
      band,
      ZEILE.x + (ZEILE.b - zeilenBreite(text) * band) / 2,
      ZEILE.y + (ZEILE.h - hoehe) / 2 + i * ZEILENSCHRITT * band,
    ),
  )
}

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** schreiben → jubel (ein Spieler) → … → tafelVoll → neue Tafel. `schluss`: der Profi ergänzt. */
export type Phase = 'schreiben' | 'jubel' | 'tafelVoll' | 'schluss' | 'fertig'

/** Ein Punkt von Bens Kreide. `neu` beginnt einen Strich. `zeichen` ist die Nummer des Zeichens. */
export type Kreidepunkt = { x: number; y: number; drin: boolean; neu: boolean; zeichen: number }

/**
 * Ein geschriebenes Zeichen für `extra`. `strichVon`/`strichBis` sind die Nummern der Aufsetzer
 * (0 = erstes Aufsetzen im Spiel). Darüber lassen sich die Rohdaten zuordnen, ohne dass das Spiel
 * deren Uhr kennen muss. `oben`/`grund` sind Ober- und Unterkante der Vorlage.
 */
export type ZeichenProtokoll = {
  z: string
  nummer: number
  band: number
  oben: number
  grund: number
  strichVon: number
  strichBis: number
  fertig: boolean
  /** Die Vorlage in ganzen Bühnen-Pixeln, je Strich x, y, x, y, … */
  soll: number[][]
}

/** Rechnet Rohdaten auf die Bühne um: xBühne = (xRoh − dx) / s. */
export type Massstab = { s: number; dx: number; dy: number }

export type Welt = {
  stufe: number
  /** B1: von Thomas eingestellt, während des Spiels fest. Hier wirkt nur die Toleranz. */
  regler: Regler
  farben: Verein['farben']
  profi: string
  /** Höchstens elf Spieler, von hinten nach vorn. */
  kader: Spieler[]
  phase: Phase
  /** Restzeit der Phase (außer beim Schreiben). */
  uhr: number
  /** Wievielte Tafel, ab 0. Jede zweite ist das „Rückspiel" in umgekehrter Reihenfolge. */
  tafel: number
  /** Wievielter Spieler dieser Tafel, ab 0. */
  dran: number
  zeichen: Zeichenlage[]
  zeichenNr: number
  strichNr: number
  /** Nachgespurte Bogenlänge auf dem aktiven Strich. Wächst nur, nie zurück. */
  fortschritt: number
  /** Stift liegt auf. */
  schreibt: boolean
  /** Dieses Aufsetzen begann an der Spitze — nur dann füllt sich der Strich. */
  faehrt: boolean
  /** Der Strich, der in diesem Aufsetzen fertig wurde. Sein Auslauf gilt noch als „drin". */
  auslauf: Strich | null
  /** Darf ohne Abheben zum nächsten Strich desselben Zeichens gezogen werden? */
  imFluss: boolean
  letzter: Punkt | null
  kreide: Kreidepunkt[]
  /** Fehlstarts und Wartezeit auf dem aktiven Strich — daraus die Hilfeleiter. */
  fehlstarts: number
  ohneFortschritt: number
  mitfahren: boolean
  /** Läuft, solange der Ball den Strich einmal vormacht. */
  ballUhr: number
  /** Sekunden ohne Stift; nach 20 s einmal im Spiel eine Ermutigung. */
  ohneStift: number
  ermutigt: boolean
  blase: { text: string; uhr: number } | null
  pulsUhr: number
  funken: Funke[]
  /** `prefers-reduced-motion`: dann gibt es keine Funken. Setzt der Aufrufer. */
  wenigerBewegung: boolean
  // --- Zähler für das Ergebnis ---
  spielerGeschrieben: number
  spielerVomProfi: number
  /** Jedes Aufsetzen, auch im Jubel: muss zu den Strichen in den Rohdaten passen. */
  striche: number
  falscheStarts: number
  gegenrichtung: number
  hilfeMitfahren: number
  proben: number
  probenDrin: number
  zeichenFertig: number
  strichVon: number
  protokoll: ZeichenProtokoll[]
  massstab: Massstab | null
  massstabGeaendert: boolean
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  zeitAus: boolean
  /** Ende des Schreibens. Die Schlussanimation zählt nicht in die Dauer. */
  schreibEnde: number | null
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(
  stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER,
): Welt {
  // Nur was sich schreiben lässt. Fehlt eine Vorlage, fällt das im Content-Test auf; hier darf es
  // nicht zu einem leeren Kästchen führen.
  const kader = (verein?.kader ?? []).filter((s) => hatVorlage(s.name)).slice(0, 11)
  const w: Welt = {
    stufe,
    regler,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    profi: verein?.profi.name ?? '',
    kader: kader.length ? kader : ERSATZ_KADER,
    phase: 'schreiben',
    uhr: 0,
    tafel: 0,
    dran: 0,
    zeichen: [],
    zeichenNr: 0,
    strichNr: 0,
    fortschritt: 0,
    schreibt: false,
    faehrt: false,
    auslauf: null,
    imFluss: false,
    letzter: null,
    kreide: [],
    fehlstarts: 0,
    ohneFortschritt: 0,
    mitfahren: false,
    ballUhr: 0,
    ohneStift: 0,
    ermutigt: false,
    blase: null,
    pulsUhr: 0,
    funken: [],
    wenigerBewegung: false,
    spielerGeschrieben: 0,
    spielerVomProfi: 0,
    striche: 0,
    falscheStarts: 0,
    gegenrichtung: 0,
    hilfeMitfahren: 0,
    proben: 0,
    probenDrin: 0,
    zeichenFertig: 0,
    strichVon: 0,
    protokoll: [],
    massstab: null,
    massstabGeaendert: false,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    zeitAus: false,
    schreibEnde: null,
  }
  beginneSpieler(w)
  return w
}

/** Kaderplatz des n-ten Spielers dieser Tafel. Das Rückspiel läuft rückwärts (B3). */
export const kaderplatz = (w: Welt, dran = w.dran) =>
  w.tafel % 2 === 0 ? dran : w.kader.length - 1 - dran

export const spielerVon = (w: Welt): Spieler => w.kader[kaderplatz(w)]

/** Auf jeder Tafel trägt ein anderer Spieler die Kapitänsbinde. Fest statt gewürfelt, damit zwei
 *  Sitzungen gleich laufen. */
export const kapitaen = (w: Welt) => (w.tafel * 2 + 1) % w.kader.length

export const aktiverStrich = (w: Welt): Strich => w.zeichen[w.zeichenNr].striche[w.strichNr]
export const band = (w: Welt) => w.zeichen[0].band
export const korridorVon = (w: Welt) => korridor(w.stufe, band(w), w.regler.toleranz)
export const startradiusVon = (w: Welt) => startradius(w.stufe, band(w), w.regler.toleranz)
/** Hier geht es weiter — der grüne Punkt. */
export const spitze = (w: Welt): Punkt => punktBei(aktiverStrich(w), w.fortschritt)

/** 0 nichts · 1 Startpunkt pulsiert · 2 der Ball macht es einmal vor · 3 der Ball fährt mit. */
export const hilfeVon = (w: Welt): 0 | 1 | 2 | 3 =>
  w.mitfahren ? 3 : w.fehlstarts >= 2 ? 2 : w.fehlstarts >= 1 ? 1 : 0

/** Der Aufruf des Stadionsprechers. Ist die Tafel damit voll, kommt das in denselben Satz — ein
 *  zweiter `vorlesen`-Aufruf würde ihm ins Wort fallen. */
export function sprecherText(w: Welt): string {
  const s = spielerVon(w)
  const ruf = kaderplatz(w) === kapitaen(w) ? `${nachname(s)}! ${nachname(s)}!` : `${nachname(s)}!`
  const vorname = s.name.split(' ').slice(0, -1).join(' ')
  const voll = w.dran === w.kader.length - 1 ? ' Die Startelf steht!' : ''
  return `Mit der Nummer ${s.nummer}: ${vorname ? `${vorname}, ` : ''}${ruf}${voll}`
}

function beginneSpieler(w: Welt) {
  w.phase = 'schreiben'
  w.zeichen = legeAus(w.stufe, spielerVon(w))
  w.zeichenNr = 0
  w.kreide = []
  w.pulsUhr = 0
  beginneZeichen(w)
}

function beginneZeichen(w: Welt) {
  w.strichNr = 0
  // Das nächste Zeichen braucht ein eigenes Aufsetzen, damit jeder Strich der Rohdaten zu genau
  // einem Zeichen gehört.
  w.strichVon = w.striche
  beginneStrich(w)
}

function beginneStrich(w: Welt) {
  w.fortschritt = 0
  w.faehrt = false
  w.fehlstarts = 0
  w.ohneFortschritt = 0
  w.mitfahren = false
  w.ballUhr = 0
}

/* ── Funken ────────────────────────────────────────────────────────────── */

function funkenstoss(w: Welt, x: number, y: number, anzahl: number) {
  if (w.wenigerBewegung) return
  const farben = [w.farben.primaer, '#ffc800', '#2fd06a']
  for (let i = 0; i < anzahl && w.funken.length < FUNKEN_MAX; i++) {
    const winkel = (i / anzahl) * Math.PI * 2
    w.funken.push({
      x, y,
      vx: Math.cos(winkel) * 130,
      vy: Math.sin(winkel) * 130 - 40,
      leben: FUNKEN_SEK,
      farbe: farben[i % farben.length],
    })
  }
}

function bewegeFunken(w: Welt, dt: number) {
  for (const f of w.funken) {
    f.leben -= dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.vy += 400 * dt
  }
  w.funken = w.funken.filter((f) => f.leben > 0)
}

/* ── Schreiben ─────────────────────────────────────────────────────────── */

const nah = (a: Punkt, x: number, y: number, r: number) => Math.hypot(a.x - x, a.y - y) <= r

/** Stift aufgesetzt. Gezählt wird immer, auch im Jubel — sonst passt die Strichzählung nicht zu
 *  den Rohdaten. */
export function setzeAn(w: Welt, x: number, y: number): Ereignis | undefined {
  w.striche++
  w.schreibt = true
  w.faehrt = false
  w.auslauf = null
  w.imFluss = false
  w.letzter = null
  w.ohneStift = 0
  if (w.phase !== 'schreiben') return

  const s = aktiverStrich(w)
  if (nah(spitze(w), x, y, startradiusVon(w))) {
    w.faehrt = true
    // Ein Tupfer ist mit dem Aufsetzen getan.
    return s.length === 1 ? strichFertig(w) : undefined
  }

  w.falscheStarts++
  w.fehlstarts++
  // Am Strichende angefangen: Ben schreibt andersherum. Das sieht nur Thomas.
  if (nah(s[s.length - 1], x, y, startradiusVon(w))) w.gegenrichtung++
  if (w.fehlstarts >= MITFAHREN_AB) starteMitfahren(w)
  if (w.fehlstarts === 2) {
    w.ballUhr = BALL_SEK
    return hilfeSagen(w)
  }
}

function hilfeSagen(w: Welt): Ereignis {
  w.blase = { text: HILFE_TEXT, uhr: BLASE_SEK }
  return 'hilfe'
}

function starteMitfahren(w: Welt) {
  if (w.mitfahren) return
  w.mitfahren = true
  w.hilfeMitfahren++
}

export function hebeAb(w: Welt) {
  w.schreibt = false
  w.faehrt = false
  w.auslauf = null
  w.imFluss = false
  w.letzter = null
}

/** Ein Zeigerpunkt bei aufliegendem Stift. */
export function schreibe(w: Welt, x: number, y: number, d: Druck): Ereignis | undefined {
  if (!w.schreibt || w.phase !== 'schreiben') return
  const s = aktiverStrich(w)
  const drin = imKorridor(w, s, x, y) || (w.auslauf !== null && imKorridor(w, w.auslauf, x, y))

  w.proben++
  if (drin) w.probenDrin++
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.kreide.push({ x, y, drin, neu: w.letzter === null, zeichen: w.zeichenNr })

  // Wer einen Strich sauber beendet hat, darf ohne Abheben zum nächsten Startpunkt ziehen.
  if (!w.faehrt && w.imFluss && nah(s[0], x, y, startradiusVon(w))) w.faehrt = true

  const a = w.letzter ?? { x, y }
  w.letzter = { x, y }
  if (w.faehrt) return fahre(w, a, { x, y })
}

const imKorridor = (w: Welt, s: Strich, x: number, y: number) =>
  naechster(s, x, y, 0, laenge(s)).abstand <= korridorVon(w)

/**
 * Fährt von `a` nach `b`, in kleinen Schritten: bei einer schnellen Maus liegen zwei Abtastungen
 * weiter auseinander als der erlaubte Vorsprung, und der Strich bliebe ohne Grund stehen.
 *
 * Gesucht wird nur knapp vor der Spitze — so springt ein geschlossenes O nicht beim ersten Punkt
 * auf fertig, und quer durch die Schleife abzukürzen bringt nichts.
 */
function fahre(w: Welt, a: Punkt, b: Punkt): Ereignis | undefined {
  const s = aktiverStrich(w)
  const ganz = laenge(s)
  const schritte = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / SCHRITT))
  for (let i = 1; i <= schritte; i++) {
    const x = a.x + ((b.x - a.x) * i) / schritte
    const y = a.y + ((b.y - a.y) * i) / schritte
    const n = naechster(s, x, y, w.fortschritt, w.fortschritt + VORSPRUNG * band(w))
    if (n.abstand <= korridorVon(w) && n.bogen > w.fortschritt) {
      w.fortschritt = n.bogen
      w.ohneFortschritt = 0
    }
    if (ganz - w.fortschritt <= Math.max(0.1 * ganz, REST * band(w))) return strichFertig(w)
  }
}

function strichFertig(w: Welt): Ereignis {
  const s = aktiverStrich(w)
  const ende = s[s.length - 1]
  funkenstoss(w, ende.x, ende.y, 6)
  w.auslauf = s
  w.strichNr++
  if (w.strichNr < w.zeichen[w.zeichenNr].striche.length) {
    beginneStrich(w)
    w.imFluss = true
    return 'strich'
  }

  // Zeichen fertig: die graue Kreide daneben verschwindet, Bens Strich auf der Vorlage bleibt.
  // Ins nächste Zeichen geht es nur mit neuem Aufsetzen (siehe `beginneZeichen`).
  w.imFluss = false
  protokolliere(w, true)
  w.zeichenFertig++
  w.pulsUhr = PULS_SEK
  w.kreide = w.kreide.filter((k) => k.drin || k.zeichen !== w.zeichenNr)
  w.zeichenNr++
  if (w.zeichenNr < w.zeichen.length) {
    beginneZeichen(w)
    return 'zeichen'
  }

  w.zeichenNr = w.zeichen.length - 1
  w.spielerGeschrieben++
  w.phase = 'jubel'
  w.uhr = JUBEL_SEK
  // Der Profi gehört selbst zur Mannschaft. Nur als Blase: sprechen tut der Stadionsprecher.
  const istProfi = spielerVon(w).name.split(' ')[0] === w.profi
  w.blase = istProfi ? { text: 'Das bin ich!', uhr: JUBEL_SEK } : null
  return 'spieler'
}

/** Schreibt das laufende Zeichen ins `extra`. */
function protokolliere(w: Welt, fertig: boolean) {
  const z = w.zeichen[w.zeichenNr]
  const ys = z.striche.flat().map((q) => q.y)
  w.protokoll.push({
    z: z.z,
    nummer: spielerVon(w).nummer,
    band: Math.round(z.band),
    oben: Math.round(Math.min(...ys)),
    grund: Math.round(Math.max(...ys)),
    strichVon: w.strichVon,
    strichBis: w.striche - 1,
    fertig,
    soll: z.striche.map((s) => s.flatMap((q) => [Math.round(q.x), Math.round(q.y)])),
  })
}

/** Merkt sich, wie Rohdaten und Bühne zusammenhängen. Dreht Ben das Tablet mitten im Spiel, gibt
 *  es dafür keinen gemeinsamen Maßstab mehr — das steht dann ehrlich im Ergebnis. */
export function merkeMassstab(w: Welt, m: Massstab) {
  w.massstab ??= m
  const alt = w.massstab
  if (Math.abs(alt.s - m.s) > 0.001 || Math.abs(alt.dx - m.dx) > 0.5 || Math.abs(alt.dy - m.dy) > 0.5) {
    w.massstabGeaendert = true
  }
}

/* ── Ablauf ────────────────────────────────────────────────────────────── */

/** Die Uhr des SpielScreens ist abgelaufen. Beendet wird erst, wenn der Stift oben ist. */
export function beende(w: Welt) {
  w.zeitAus = true
}

/** Der Profi hängt die restlichen Magnete selbst auf: Ben sieht nie eine halbe Aufstellung (C2). */
function starteSchluss(w: Welt) {
  if (w.striche > w.strichVon) protokolliere(w, false)
  w.spielerVomProfi = w.kader.length - w.dran
  w.phase = 'schluss'
  w.uhr = SCHLUSS_SEK
  w.blase = null
}

export function aktualisiere(w: Welt, dt: number): Ereignis | undefined {
  w.zeitGesamt += dt
  bewegeFunken(w, dt)
  w.pulsUhr = Math.max(0, w.pulsUhr - dt)
  w.ballUhr = Math.max(0, w.ballUhr - dt)
  if (w.blase && (w.blase.uhr -= dt) <= 0) w.blase = null
  if (w.zeitAus && !w.schreibt) w.schreibEnde ??= w.zeitGesamt

  if (w.phase === 'schreiben') {
    if (w.zeitAus && !w.schreibt) {
      starteSchluss(w)
      return
    }
    w.ohneFortschritt += dt
    if (w.ohneFortschritt >= MITFAHREN_SEK) starteMitfahren(w)
    if (w.schreibt) return
    w.ohneStift += dt
    if (w.ohneStift >= ERMUTIGUNG_SEK && !w.ermutigt) {
      w.ermutigt = true
      w.blase = { text: ERMUTIGUNG_TEXT, uhr: BLASE_SEK }
      return 'ermutigung'
    }
    return
  }

  w.uhr -= dt
  if (w.uhr > 0) return

  if (w.phase === 'jubel') {
    w.dran++
    if (w.dran === w.kader.length) {
      w.phase = 'tafelVoll'
      w.uhr = TAFEL_SEK
      return 'tafel'
    }
    beginneSpieler(w)
  } else if (w.phase === 'tafelVoll') {
    // Läuft die Uhr bei voller Tafel ab, ist das schon der saubere Moment: keine neue Tafel mehr.
    if (w.zeitAus) {
      w.phase = 'fertig'
      return
    }
    w.tafel++
    w.dran = 0
    beginneSpieler(w)
  } else {
    w.phase = 'fertig'
  }
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

export const dauerMs = (w: Welt) => Math.round((w.schreibEnde ?? w.zeitGesamt) * 1000)

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im Browser
 * für das Sofortfeedback aus A1 und dürfen nie in einem Bericht landen. Die maßgeblichen
 * Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * Vollständigkeit: fertige Zeichen je begonnenem Zeichen, das letzte anteilig. Was der Profi am
 * Ende ergänzt, zählt nicht. Gedacht für das Ende des Spiels (nach `schluss` oder voller Tafel).
 * `abgebrochen` ist immer false: im Spiel gibt es keinen Abbruchweg (C2).
 */
export function ergebnis(w: Welt): SpielErgebnis {
  const letztes = w.zeichen[w.zeichenNr]
  const offen = w.zeichenFertig < w.protokoll.length
  const anteil = offen
    ? (w.strichNr + w.fortschritt / Math.max(1, laenge(letztes.striche[w.strichNr]))) /
      letztes.striche.length
    : 0
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  return {
    spielId: 'startelf',
    dauerMs: dauerMs(w),
    vollstaendigkeit: w.protokoll.length === 0 ? 0 : (w.zeichenFertig + anteil) / w.protokoll.length,
    genauigkeit: w.proben === 0 ? 0 : w.probenDrin / w.proben,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen: false,
    extra: {
      version: 1,
      massstab: w.massstab,
      massstabGeaendert: w.massstabGeaendert,
      spielerGeschrieben: w.spielerGeschrieben,
      spielerVomProfi: w.spielerVomProfi,
      tafeln: w.tafel + 1,
      striche: w.striche,
      falscheStarts: w.falscheStarts,
      gegenrichtung: w.gegenrichtung,
      hilfeMitfahren: w.hilfeMitfahren,
      zeichen: w.protokoll,
    },
  }
}
