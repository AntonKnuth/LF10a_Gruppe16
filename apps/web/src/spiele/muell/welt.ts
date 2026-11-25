/**
 * Zustand und Bewertung von „Platz aufräumen". Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Nach dem Abpfiff liegt Müll auf dem Rasen. Über dem Platz hängt die Seilkamera an
 * vier Seilen. Ben malt einen Kreis um ein Stück Müll; ist der Kreis zu, fährt die Kamera hin und
 * holt alles heraus, was darin liegt. Ist ein Abschnitt sauber, schwenkt sie zum nächsten.
 *
 * Die eine Regel: **Was in einem geschlossenen Kreis liegt, holt die Seilkamera.**
 *
 *   Geschlossen = das Strichende kommt dem Anfang auf `schliessToleranz` nahe, nachdem der
 *                 Strich mindestens `MIN_LAENGE` lang war. Dann wird von selbst zugemacht.
 *   Darin       = der Mittelpunkt des Müllstücks liegt im Polygon des Strichs.
 *   Zu groß     = der mittlere Radius ist größer als der Greifer. Sonst umkreiste Ben den ganzen
 *                 Abschnitt mit einem Strich, und die Feinmotorik wäre weg.
 *
 * Bereiche: `wellen` (geschlossene Bögen) und `hand-auge` (ab Stufe 3 wandert das Konfetti).
 * Der Andruck wird aufgezeichnet, ist aber kein Kriterium.
 *
 * C2: kein Verliererzustand. Offene oder zu große Kreise tun nichts, Müll geht nie verloren, und
 * solange Ben arbeitet, kommt kein neuer dazu — sonst wäre es ein Wettlauf gegen einen Haufen.
 */

import type { Spruch, Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { VORGABE_REGLER, type Regler } from '../regler'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export type Punkt = { x: number; y: number }

/** Hier wartet die Kamera, wenn sie nichts zu tun hat — über der Bande, nicht über dem Müll. */
export const RUHEPLATZ: Punkt = { x: W / 2, y: 70 }

/** In diesem Feld liegt Müll. Oben bleibt Platz für die ruhende Kamera. */
export const FELD = { x0: 70, y0: 150, x1: 830, y1: 590 }

/** Kürzere Striche sind Tupfer, keine Kreisversuche. */
export const MIN_LAENGE = 75

export const FAHRT_SEK = 0.6
export const GREIF_SEK = 0.5
export const SCHWENK_SEK = 1.5
/** So lange verblasst ein Kreis, der nichts geholt hat. */
export const VERBLASS_SEK = 0.8
export const HINWEIS_SEK = 1.2

/** Hilfe statt Abbruch (C2). Die Toleranz bleibt dabei, wie Thomas sie eingestellt hat. */
export const OFFEN_HILFE_AB = 3
export const GROSS_HILFE_AB = 2

/** Nach dem Ende der Uhr darf ein angefangener Kreis noch so lange zu Ende gemalt werden. */
export const NACHSPIEL_SEK = 5

/* Funken (A1): nur beim Schließen und Einsammeln, hart begrenzt (A2). Richtung aus der Nummer
   des Funkens statt Zufall — so bleibt jeder Test wiederholbar. */
export const FUNKEN_SEK = 0.6
export const FUNKEN_MAX = 24
export type Funke = { x: number; y: number; vx: number; vy: number; leben: number; farbe: string }

/* ── Abschnitte ────────────────────────────────────────────────────────────
   Feste Folge, danach geht es von vorn los — mit anderer Verteilung, weil die Saat die
   laufende Nummer ist. */
export const ABSCHNITTE = ['strafraum', 'mittelkreis', 'eckfahne', 'seitenlinie', 'torraum'] as const
export type Abschnitt = (typeof ABSCHNITTE)[number]
export const abschnittVon = (nummer: number): Abschnitt => ABSCHNITTE[nummer % ABSCHNITTE.length]

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Startwerte aus dem Konzept, kein Messwert — mit echtem Pencil auf dem Zielgerät nachziehen. */
export const groessenFaktor = (stufe: number) => 1.25 - 0.08 * stufe
export const muellJeAbschnitt = (stufe: number) => 6 + stufe
export const greiferRadius = (stufe: number) => 150 - 15 * stufe

/**
 * Schließtoleranz in Bühnenpixeln. Der Regler `toleranz` wirkt hier als Faktor.
 * Begrenzt, damit extreme Faktoren nichts kaputt machen: unter 12 px schließt kaum ein Kind
 * einen Kreis, und ab `MIN_LAENGE` würde schon ein gerader Strich als Kreis zugemacht.
 */
export const schliessToleranz = (stufe: number, faktor = 1) =>
  klemme((60 - 8 * stufe) * faktor, 12, MIN_LAENGE - 5)

/**
 * Wie schnell Konfetti wandert (px/s). Erst ab Stufe 3 — das ist der Hand-Auge-Teil. Der Regler
 * `zielgeschwindigkeit` wirkt als Faktor; die Obergrenze hält das Ziel einkreisbar.
 */
export const drift = (stufe: number, faktor = 1) => Math.min(40, Math.max(0, 5 * (stufe - 2)) * faktor)

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y)

/* ── Müll ──────────────────────────────────────────────────────────────── */
export type Art = 'becher' | 'papier' | 'wimpel' | 'konfetti' | 'fundstueck'
const EINZELN: Art[] = ['becher', 'papier', 'wimpel']

/** Grundgröße je Art, wird mit dem Größenfaktor der Stufe multipliziert. */
export const GRUNDRADIUS: Record<Art, number> = { becher: 20, papier: 17, wimpel: 22, konfetti: 8, fundstueck: 22 }

/** `vx`/`vy`: Wanderrichtung, nur Konfetti bewegt sich. `vorgemerkt`: ein Kreis hat es erfasst,
 *  die Kamera ist unterwegs. */
export type Muell = {
  art: Art; x: number; y: number; r: number; vx: number; vy: number
  vorgemerkt: boolean; eingesammelt: boolean
}

/**
 * Gesäter Zufall (Park-Miller). Dieselbe Saat gibt dieselbe Folge — die Lage des Mülls ist dadurch
 * testbar, und zwei Sitzungen auf derselben Stufe sind vergleichbar.
 */
export function zufall(saat: number) {
  let s = (Math.abs(Math.floor(saat)) % 2147483646) + 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Müll eines Abschnitts. Konfetti liegt immer als Häufchen aus drei Schnipseln da — ein Kreis kann
 * alle drei holen, das soll Ben selbst entdecken. Der Rest liegt einzeln mit Mindestabstand, damit
 * jedes Stück für sich einkreisbar bleibt.
 */
export function legeMuell(stufe: number, nummer: number): Muell[] {
  const rnd = zufall(nummer * 7919 + stufe * 104729 + 1)
  const faktor = groessenFaktor(stufe)
  const anzahl = muellJeAbschnitt(stufe)
  const mitten: Punkt[] = []
  const ort = (): Punkt => {
    let p: Punkt = { x: 0, y: 0 }
    // Nach 60 Versuchen wird der letzte genommen — enger als gewollt, aber nie eine Endlosschleife.
    for (let versuch = 0; versuch < 60; versuch++) {
      p = { x: FELD.x0 + rnd() * (FELD.x1 - FELD.x0), y: FELD.y0 + rnd() * (FELD.y1 - FELD.y0) }
      if (mitten.every((m) => abstand(m, p) > 95)) break
    }
    mitten.push(p)
    return p
  }
  const stueck = (art: Art, p: Punkt): Muell => {
    const winkel = rnd() * Math.PI * 2
    const r = GRUNDRADIUS[art] * faktor
    return { art, ...p, r, vx: Math.cos(winkel), vy: Math.sin(winkel), vorgemerkt: false, eingesammelt: false }
  }

  const liste: Muell[] = []
  const haeufchen = ort()
  for (const [dx, dy] of [[-14, -6], [12, -10], [0, 13]]) {
    liste.push(stueck('konfetti', { x: haeufchen.x + dx * faktor, y: haeufchen.y + dy * faktor }))
  }
  for (let i = liste.length; i < anzahl; i++) {
    // Jeder zweite Abschnitt versteckt ein Fundstück eines Spielers (Leitidee).
    const art = i === anzahl - 1 && nummer % 2 === 1 ? 'fundstueck' : EINZELN[i % EINZELN.length]
    liste.push(stueck(art, ort()))
  }
  return liste
}

/* ── Geometrie ─────────────────────────────────────────────────────────── */

/**
 * Liegt p im Polygon? Strahlverfahren: ein Strahl nach rechts kreuzt den Rand bei einem Punkt
 * drinnen ungerade oft. Funktioniert auch für eine Acht — dort zählt jede Schleife als drinnen.
 */
export function imPolygon(p: Punkt, poly: Punkt[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      drin = !drin
    }
  }
  return drin
}

/** Mittelpunkt und mittlerer Radius eines Strichs. */
export function kreisMass(punkte: Punkt[]): { mitte: Punkt; radius: number } {
  const n = Math.max(1, punkte.length)
  const mitte = { x: punkte.reduce((s, p) => s + p.x, 0) / n, y: punkte.reduce((s, p) => s + p.y, 0) / n }
  return { mitte, radius: punkte.reduce((s, p) => s + abstand(p, mitte), 0) / n }
}

/* ── Zustand ───────────────────────────────────────────────────────────── */

/** Was die Funktionen melden, damit der Aufrufer einen Klang spielt (A1). */
export type Ereignis = 'zu' | 'zuGross' | 'surr' | 'plopp' | 'sauber' | null

export type Auftrag = { punkte: Punkt[]; mitte: Punkt; muell: Muell[] }
export type Verblassend = { punkte: Punkt[]; art: 'offen' | 'leer' | 'zuGross' | 'erledigt'; uhr: number }
export type Kamera = {
  x: number; y: number; phase: 'ruht' | 'faehrt' | 'greift' | 'heim'; von: Punkt; uhr: number
  /** Der Müll des laufenden Auftrags ist schon im Greifer. */
  gepackt: boolean
}

/** Summen fürs Ergebnis; gehen unverändert in `extra`. */
export type Zaehler = {
  abschnitte: number; eingesammelt: number; muellGesamt: number; kreisversuche: number
  geschlossen: number; zuGross: number; leer: number; hilfen: number
}

export type Welt = {
  stufe: number
  /** B1: von Thomas eingestellt, während des Spiels fest. */
  regler: Regler
  farben: Verein['farben']
  kader: Verein['kader']
  sprueche: Spruch[]
  /** Wievielter Abschnitt, ab 0. */
  nummer: number
  muell: Muell[]
  /** Hat Ben hier schon gemalt? Erst dann zählt der Müll dieses Abschnitts in die Vollständigkeit. */
  begonnen: boolean
  /** Der Strich, der gerade gemalt wird. */
  strich: Punkt[] | null
  laenge: number
  /** Stift dem Anfang nahe — der Startpunkt leuchtet, Ben weiß vor dem Abheben, dass es zugeht. */
  nahStart: boolean
  auftraege: Auftrag[]
  verblassen: Verblassend[]
  kamera: Kamera
  /** Gestrichelter Greiferkreis: nach einem zu großen Kreis oder als Hilfe beim Aufsetzen. */
  hinweis: { x: number; y: number; uhr: number } | null
  /** Läuft nach einem sauberen Abschnitt; zur Hälfte liegt der neue Müll da. */
  schwenkUhr: number
  /** Der zuletzt gefundene Spieler, für den Satz im Bild. */
  fund: Verein['kader'][number] | null
  funken: Funke[]
  /** Offene bzw. zu große Kreise hintereinander — daran hängen die Hilfen. */
  offenInFolge: number; grossInFolge: number
  /** Uhr abgelaufen: kein neuer Strich mehr, Laufendes darf zu Ende gehen. */
  schluss: boolean; nachspielUhr: number
  zaehler: Zaehler
  druckWerte: number[]; synthetisch: boolean; geraet: Eingabegeraet; zeitGesamt: number
  /** `prefers-reduced-motion`: keine Funken, kein Schwenk. Setzt der Aufrufer. */
  wenigerBewegung: boolean
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER): Welt {
  return {
    stufe, regler,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    kader: verein?.kader ?? [], sprueche: verein?.sprueche ?? [],
    nummer: 0, muell: legeMuell(stufe, 0), begonnen: false,
    strich: null, laenge: 0, nahStart: false,
    auftraege: [], verblassen: [], hinweis: null, schwenkUhr: 0, fund: null, funken: [],
    kamera: { ...RUHEPLATZ, phase: 'ruht', von: RUHEPLATZ, uhr: 0, gepackt: false },
    offenInFolge: 0, grossInFolge: 0,
    schluss: false, nachspielUhr: NACHSPIEL_SEK,
    zaehler: {
      abschnitte: 0, eingesammelt: 0, muellGesamt: 0, kreisversuche: 0,
      geschlossen: 0, zuGross: 0, leer: 0, hilfen: 0,
    },
    druckWerte: [], synthetisch: false, geraet: 'mouse', zeitGesamt: 0, wenigerBewegung: false,
  }
}

export const toleranzVon = (w: Welt) => schliessToleranz(w.stufe, w.regler.toleranz)
/** Hilfe nach drei offenen Kreisen: der Leuchtring wird doppelt so groß. Nur das Bild, nie die Regel. */
export const ringGross = (w: Welt) => w.offenInFolge >= OFFEN_HILFE_AB
/** Während des Schwenks wird nicht gemalt — der Müll ist gerade unterwegs. */
const darfMalen = (w: Welt) => !w.schluss && w.schwenkUhr <= 0

/** Der Vereinsspruch zum sauberen Abschnitt. Wechselt, damit er sich nicht abnutzt. */
export function spruch(w: Welt): Spruch | null {
  return w.sprueche.length === 0 ? null : w.sprueche[w.zaehler.abschnitte % w.sprueche.length]
}

/* ── Malen ─────────────────────────────────────────────────────────────── */

function merkeDruck(w: Welt, d: Druck) {
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
}

export function setzeAuf(w: Welt, x: number, y: number, d: Druck, geraet: Eingabegeraet) {
  if (!darfMalen(w)) return
  w.geraet = geraet
  w.strich = [{ x, y }]
  w.laenge = 0
  w.nahStart = false
  if (!w.begonnen) {
    w.begonnen = true
    w.zaehler.muellGesamt += w.muell.length
  }
  merkeDruck(w, d)
  // Hilfe nach zwei zu großen Kreisen: der Greifer zeigt seine Größe schon beim Aufsetzen.
  if (w.grossInFolge >= GROSS_HILFE_AB) w.hinweis = { x, y, uhr: HINWEIS_SEK }
}

/** Ein Zeigerpunkt bei aufliegendem Stift. Schließt den Kreis, sobald das Ende den Anfang erreicht. */
export function male(w: Welt, x: number, y: number, d: Druck): Ereignis {
  const s = w.strich
  if (!s) return null
  const p = { x, y }
  w.laenge += abstand(s[s.length - 1], p)
  s.push(p)
  merkeDruck(w, d)
  const zumStart = abstand(s[0], p)
  w.nahStart = w.laenge >= MIN_LAENGE * 0.6 && zumStart <= toleranzVon(w) * 2
  if (w.laenge < MIN_LAENGE || zumStart > toleranzVon(w)) return null
  return schliesse(w)
}

/** Stift hoch. Ein Strich, der nicht zugegangen ist, verblasst ohne Ton. */
export function hebeAb(w: Welt) {
  if (!w.strich) return
  verwirfStrich(w)
  // Ein Tupfer unter der Mindestlänge ist kein Kreisversuch und zählt nicht.
  if (w.laenge < MIN_LAENGE) return
  w.zaehler.kreisversuche++
  w.offenInFolge++
  if (w.offenInFolge === OFFEN_HILFE_AB) w.zaehler.hilfen++
}

/** Beim Anhalten verfällt der halbe Kreis: er zählt nicht, er hat ja niemand zu Ende gemalt. */
export function verwirfStrich(w: Welt) {
  if (w.strich) w.verblassen.push({ punkte: w.strich, art: 'offen', uhr: VERBLASS_SEK })
  w.strich = null
  w.nahStart = false
}

function schliesse(w: Welt): Ereignis {
  const punkte = w.strich ?? []
  w.strich = null
  w.nahStart = false
  w.zaehler.kreisversuche++
  w.zaehler.geschlossen++
  w.offenInFolge = 0
  const { mitte, radius } = kreisMass(punkte)

  if (radius > greiferRadius(w.stufe)) {
    w.zaehler.zuGross++
    w.grossInFolge++
    if (w.grossInFolge === GROSS_HILFE_AB) w.zaehler.hilfen++
    w.hinweis = { ...mitte, uhr: HINWEIS_SEK }
    w.verblassen.push({ punkte, art: 'zuGross', uhr: VERBLASS_SEK })
    return 'zuGross'
  }
  w.grossInFolge = 0

  const drin = w.muell.filter((m) => !m.vorgemerkt && !m.eingesammelt && imPolygon(m, punkte))
  if (drin.length === 0) {
    w.zaehler.leer++
    w.verblassen.push({ punkte, art: 'leer', uhr: VERBLASS_SEK })
    return 'zu'
  }
  for (const m of drin) m.vorgemerkt = true
  w.auftraege.push({ punkte, mitte, muell: drin })
  funkenstoss(w, mitte, 6)
  return 'zu'
}

function funkenstoss(w: Welt, p: Punkt, anzahl: number) {
  if (w.wenigerBewegung) return
  const farben = [w.farben.primaer, w.farben.sekundaer, '#ffc800']
  for (let i = 0; i < anzahl && w.funken.length < FUNKEN_MAX; i++) {
    const winkel = (i / anzahl) * Math.PI * 2
    const tempo = 120 + (i % 3) * 50
    const vx = Math.cos(winkel) * tempo
    const vy = Math.sin(winkel) * tempo - 60
    w.funken.push({ x: p.x, y: p.y, vx, vy, leben: FUNKEN_SEK, farbe: farben[i % farben.length] })
  }
}

/* ── Lauf der Dinge ────────────────────────────────────────────────────── */

/** Die Uhr ist um: kein neuer Strich mehr. Was angefangen ist, wird nicht abgeschnitten. */
export function beginneSchluss(w: Welt) {
  w.schluss = true
}

/** Sauberer Moment zum Aufhören: kein Strich am Stift, kein Auftrag offen, nichts im Greifer. */
export const istFertig = (w: Welt) =>
  w.schluss && !w.strich && w.auftraege.length === 0 &&
  (w.kamera.phase === 'ruht' || w.kamera.phase === 'heim')

/** Wo die Kamera gerade hinfährt. */
export const kameraZiel = (w: Welt): Punkt =>
  w.kamera.phase === 'heim' ? RUHEPLATZ : (w.auftraege[0]?.mitte ?? RUHEPLATZ)

/** Anteil der laufenden Fahrt oder des Greifens, 0–1. Nur fürs Bild und die Position. */
export const kameraAnteil = (w: Welt) =>
  1 - w.kamera.uhr / (w.kamera.phase === 'greift' ? GREIF_SEK : FAHRT_SEK)

function fahreLos(w: Welt, phase: 'faehrt' | 'heim') {
  w.kamera.von = { x: w.kamera.x, y: w.kamera.y }
  w.kamera.phase = phase
  w.kamera.uhr = FAHRT_SEK
}

export function aktualisiere(w: Welt, dt: number): Ereignis {
  w.zeitGesamt += dt

  for (const f of w.funken) {
    f.leben -= dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.vy += 300 * dt
  }
  w.funken = w.funken.filter((f) => f.leben > 0)
  for (const v of w.verblassen) v.uhr -= dt
  w.verblassen = w.verblassen.filter((v) => v.uhr > 0)
  if (w.hinweis) {
    w.hinweis.uhr -= dt
    if (w.hinweis.uhr <= 0) w.hinweis = null
  }

  wandern(w, dt)

  if (w.schluss && w.strich) {
    w.nachspielUhr -= dt
    if (w.nachspielUhr <= 0) verwirfStrich(w)
  }

  if (w.schwenkUhr > 0) {
    const vorher = w.schwenkUhr
    w.schwenkUhr -= dt
    // Zur Hälfte des Schwenks liegt der neue Abschnitt da; so gleitet er im Bild herein.
    if (vorher > SCHWENK_SEK / 2 && w.schwenkUhr <= SCHWENK_SEK / 2) naechsterAbschnitt(w)
  }

  return kameraSchritt(w, dt)
}

/** Konfetti wandert langsam und prallt am Feldrand ab. Vorgemerktes bleibt liegen. */
function wandern(w: Welt, dt: number) {
  const v = drift(w.stufe, w.regler.zielgeschwindigkeit)
  if (v <= 0) return
  for (const m of w.muell) {
    if (m.art !== 'konfetti' || m.vorgemerkt || m.eingesammelt) continue
    m.x += m.vx * v * dt
    m.y += m.vy * v * dt
    if (m.x < FELD.x0 || m.x > FELD.x1) m.vx = -m.vx
    if (m.y < FELD.y0 || m.y > FELD.y1) m.vy = -m.vy
    m.x = klemme(m.x, FELD.x0, FELD.x1)
    m.y = klemme(m.y, FELD.y0, FELD.y1)
  }
}

/** Die Kamera arbeitet die Aufträge der Reihe nach ab: hinfahren, greifen, weiter oder heim. */
function kameraSchritt(w: Welt, dt: number): Ereignis {
  const k = w.kamera
  if (k.phase === 'ruht' || k.phase === 'heim') {
    if (w.auftraege.length > 0) {
      fahreLos(w, 'faehrt')
      return 'surr'
    }
    if (k.phase === 'ruht') return null
  }

  k.uhr -= dt
  if (k.phase !== 'greift') {
    const ziel = kameraZiel(w)
    const u = klemme(kameraAnteil(w), 0, 1)
    k.x = k.von.x + (ziel.x - k.von.x) * u
    k.y = k.von.y + (ziel.y - k.von.y) * u
    if (k.uhr > 0) return null
    if (k.phase === 'heim') {
      k.phase = 'ruht'
      return null
    }
    k.phase = 'greift'
    k.uhr = GREIF_SEK
    k.gepackt = false
    return null
  }

  // Zur Hälfte des Greifens ist der Müll weg — das „plopp".
  if (!k.gepackt && k.uhr <= GREIF_SEK / 2) {
    k.gepackt = true
    return packe(w)
  }
  if (k.uhr > 0) return null

  const fertig = w.auftraege.shift()
  if (fertig) w.verblassen.push({ punkte: fertig.punkte, art: 'erledigt', uhr: VERBLASS_SEK })
  if (w.auftraege.length > 0) {
    fahreLos(w, 'faehrt')
    return 'surr'
  }
  fahreLos(w, 'heim')
  if (w.muell.every((m) => m.eingesammelt)) {
    w.zaehler.abschnitte++
    // Nach dem Schlusspfiff kommt kein neuer Abschnitt mehr; der saubere Rasen ist das Ende.
    // Mit weniger Bewegung liegt der neue Abschnitt sofort da, ohne Schwenk.
    if (!w.schluss && w.wenigerBewegung) naechsterAbschnitt(w)
    else if (!w.schluss) w.schwenkUhr = SCHWENK_SEK
    return 'sauber'
  }
  return null
}

function packe(w: Welt): Ereignis {
  const a = w.auftraege[0]
  if (!a) return null
  for (const m of a.muell) {
    m.eingesammelt = true
    w.zaehler.eingesammelt++
    // Das Fundstück gehört reihum einem Spieler aus dem Kader dieses Vereins.
    if (m.art === 'fundstueck') w.fund = w.kader[Math.floor(w.nummer / 2) % w.kader.length] ?? null
  }
  funkenstoss(w, a.mitte, 10)
  return 'plopp'
}

function naechsterAbschnitt(w: Welt) {
  w.nummer++
  w.muell = legeMuell(w.stufe, w.nummer)
  w.begonnen = false
  w.fund = null
  w.verblassen = []
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 und dürfen nie in einem Bericht landen. Die maßgeblichen
 * Kreiskennzahlen (Rundheit, Schließlücke, Drehrichtung) gehören nach C#, aus dem Blob.
 *
 * `vollstaendigkeit` = eingesammelt / Müll in begonnenen Abschnitten,
 * `genauigkeit` = geschlossene Kreise / Kreisversuche.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  const z = w.zaehler
  return {
    spielId: 'muell',
    dauerMs,
    vollstaendigkeit: z.muellGesamt === 0 ? 0 : z.eingesammelt / z.muellGesamt,
    genauigkeit: z.kreisversuche === 0 ? 0 : z.geschlossen / z.kreisversuche,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      ...z,
      schliessToleranz: Math.round(toleranzVon(w)),
      greiferRadius: greiferRadius(w.stufe),
      drift: drift(w.stufe, w.regler.zielgeschwindigkeit),
    },
  }
}
