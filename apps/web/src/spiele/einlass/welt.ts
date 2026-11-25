/**
 * Zustand und Bewertung von „Einlasskontrolle". Kennt kein Canvas und kein React —
 * damit die Bewertung ohne Browser testbar bleibt (siehe welt.test.ts).
 *
 * Spielidee: Ben ist Ordner am Stadioneingang. Ein Fan stellt seine Tasche auf den Tisch, der
 * Scanner hat ein paar Alltagsdinge markiert, die nicht mit ins Stadion dürfen. Ben greift jedes
 * markierte Ding mit dem Stift und trägt es in die Abgabekiste.
 *
 * Die eine Regel, aus der alles folgt: **Ein Ding bleibt nur am Stift, solange der Druck im Band
 * liegt.**
 *
 *   Greifen  = auf dem Ding aufsetzen und den Druck `greifzeit` lang im Band halten.
 *   Zu leicht → es rutscht ab. Zu fest → es flutscht weg wie Seife.
 *   Ablegen  = der Druck verlässt das Band oder der Stift hebt ab, während das Ding über der
 *              Kiste ist. Daneben springt es einfach an seinen Platz zurück.
 *
 * Es gibt zwei Gewichtsklassen mit eigenem Band. Die Suche nimmt der Scanner Ben ab: geübt wird
 * Greifen, Halten, Transportieren und Loslassen (Pinzettengriff, Kraftdosierung), kein Suchbild.
 *
 * C2: kein Verliererzustand. Was fällt, liegt wieder da; der Fan wartet beliebig lange.
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

export const KISTE: Punkt = { x: 150, y: 385 }
export const TASCHE = { x: 290, y: 225, b: 440, h: 310 }

/** So nah am Rand eines Dings zählt ein Aufsetzer noch als getroffen. */
export const TREFFSAUM = 6

/** Eine einzelne Druckspitze des Pencils soll das Ding nicht gleich fallen lassen. */
export const GNADE = 0.15

/** So lange hüpft ein Ding zurück in die Tasche oder in die Kiste. */
export const HUEPF_SEK = 0.35
export const WACKEL_SEK = 0.3

/** Der Fan kommt an den Tisch und geht nach der Kontrolle durchs Drehkreuz. */
export const KOMMT_SEK = 0.8
export const GEHT_SEK = 1.6

/** Nach so vielen Reihen ist die Tribüne voll. Sie ist die Fortschrittsanzeige (A2: keine Zahl). */
export const REIHEN = 10
export const LAOLA_SEK = 2.4

/** Jede wievielte Tasche einem Spieler gehört (Leitidee). */
const SPIELER_TASCHE = 4

/** Hilfe statt Abbruch (C2): erst ein Druckbalken, dann hüpft das Ding von selbst in die Kiste.
 *  Die Toleranz wird dabei nie weiter — sonst wäre die Messung eine andere als die eingestellte. */
export const HILFE_AB = 3
export const GEHOLFEN_AB = 5

/** Nach dem Ende der Uhr darf ein Griff noch so lange zu Ende gehen. */
export const NACHSPIEL_SEK = 5

/* ── Funken (A1) ───────────────────────────────────────────────────────────
   Nur beim Ablegen und hart begrenzt (A2). Kein Zufall: die Richtung folgt aus der Nummer des
   Funkens, so ist jeder Test wiederholbar. */
export const FUNKEN_SEK = 0.7
export const FUNKEN_MAX = 24

export type Funke = { x: number; y: number; vx: number; vy: number; leben: number; farbe: string }

/* ── Dinge ─────────────────────────────────────────────────────────────────
   Nur Alltagsdinge. Der Fan hat sie aus Versehen eingepackt und bekommt sie nach dem Spiel
   wieder — niemand wird ertappt. */
export type Gewicht = 'schwer' | 'leicht'

const SCHWER = ['flasche', 'schirm', 'kanne'] as const
const LEICHT = ['pfeife', 'dose', 'troete'] as const
const ERLAUBT = ['schal', 'muetze', 'brezel', 'handschuh', 'kissen', 'teddy'] as const

export type Art = (typeof SCHWER)[number] | (typeof LEICHT)[number] | (typeof ERLAUBT)[number]

export type Ding = {
  art: Art
  /** `null`: darf mit ins Stadion und lässt sich nicht greifen. */
  gewicht: Gewicht | null
  /** Fester Platz in der Tasche. */
  x: number
  y: number
  abgegeben: boolean
  fehlversuche: number
  /** Hüpfer: läuft noch `uhr` Sekunden von `von` nach `nach`. Nur fürs Bild. */
  huepfer: { von: Punkt; nach: Punkt; uhr: number; seite: number } | null
  wackelUhr: number
}

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Die Stufe stellt Thomas ein und sie bleibt während des Spiels fest. Ab Stufe 3 überlappen sich
   die Bänder nicht mehr: ein fester Druck reicht dann nicht für beide Gewichtsklassen — das ist
   die Kraftdosierung.

   Bandmitten geraten, nicht gemessen — mit echtem Pencil nachziehen. */
export const BAND_MITTE: Record<Gewicht, number> = { leicht: 0.3, schwer: 0.6 }

export const objektRadius = (stufe: number) => 34 - 3 * stufe
export const kisteRadius = (stufe: number) => 95 - 8 * stufe
export const greifzeit = (stufe: number) => 0.25 + 0.05 * stufe
export const halbesBand = (stufe: number, faktor = 1) => (0.2 - 0.025 * stufe) * faktor
export const bandUnten = (stufe: number, g: Gewicht, faktor = 1) =>
  BAND_MITTE[g] - halbesBand(stufe, faktor)
export const bandOben = (stufe: number, g: Gewicht, faktor = 1) =>
  BAND_MITTE[g] + halbesBand(stufe, faktor)
export const anzahlVerboten = (stufe: number) => 2 + Math.floor(stufe / 2)
export const anzahlErlaubt = (stufe: number) => 1 + stufe
export const mindestabstand = (stufe: number) => (2.9 - 0.15 * stufe) * objektRadius(stufe)

export type Urteil = 'zu-leicht' | 'gut' | 'zu-fest'

/** Andruck → Urteil. Einzige Stelle, an der die Toleranz ausgewertet wird. */
export function urteil(druck: number, stufe: number, g: Gewicht, faktor = 1): Urteil {
  if (druck < bandUnten(stufe, g, faktor)) return 'zu-leicht'
  if (druck > bandOben(stufe, g, faktor)) return 'zu-fest'
  return 'gut'
}

export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y)

/* ── Inhalt der Taschen ────────────────────────────────────────────────────
   Feste Formeln statt Zufall: sonst wären zwei Sitzungen nicht vergleichbar und der Test nicht
   vorhersagbar. */

/** 15 Plätze: ein Raster von 5 × 3, leicht versetzt, damit es nicht wie ein Formular aussieht. */
const PLAETZE: Punkt[] = Array.from({ length: 15 }, (_, i) => ({
  x: TASCHE.x + 72 + (i % 5) * 74 + ((i * 7) % 5) * 4 - 8,
  y: TASCHE.y + 68 + Math.floor(i / 5) * 86 + ((i * 11) % 5) * 4 - 8,
}))

/** Packt die n-te Tasche. Ein Platz, der zu nah an einem belegten liegt, bleibt leer. */
export function packeTasche(stufe: number, nummer: number): Ding[] {
  const verboten = anzahlVerboten(stufe)
  const gesamt = verboten + anzahlErlaubt(stufe)
  const dinge: Ding[] = []
  for (let i = 0; i < PLAETZE.length && dinge.length < gesamt; i++) {
    // 13 und 15 sind teilerfremd: jeder Platz kommt genau einmal dran.
    const platz = PLAETZE[(nummer * 7 + i * 13) % PLAETZE.length]
    if (dinge.some((d) => abstand(d, platz) < mindestabstand(stufe))) continue
    const n = dinge.length
    const dreh = nummer + n
    // Schwer und leicht wechseln sich ab — wechselnde Kraft statt Dauerdruck (B3).
    const gewicht = n >= verboten ? null : dreh % 2 === 0 ? 'schwer' : 'leicht'
    const art =
      gewicht === null ? ERLAUBT[dreh % ERLAUBT.length]
      : gewicht === 'schwer' ? SCHWER[Math.floor(dreh / 2) % SCHWER.length]
      : LEICHT[Math.floor(dreh / 2) % LEICHT.length]
    dinge.push({
      art, gewicht, x: platz.x, y: platz.y,
      abgegeben: false, fehlversuche: 0, huepfer: null, wackelUhr: 0,
    })
  }
  return dinge
}

/* ── Zustand ───────────────────────────────────────────────────────────── */
export type Phase = 'kommt' | 'kontrolle' | 'geht'

/** Ein laufender Griff: vom Aufsetzen bis das Ding wieder frei ist. */
export type Griff = {
  ding: Ding
  gegriffen: boolean
  stift: Punkt
  /** Das Ding folgt dem Stift mit diesem Versatz, sonst spränge es beim Greifen. */
  versatz: Punkt
  aufsetzen: Punkt
  druck: number
  /** Finger und Stifte ohne Drucksensor: dann entscheidet nur die Greifzeit, sonst wäre das Spiel
   *  für sie unlösbar (C2). */
  druckZaehlt: boolean
  /** So lange lag der Druck schon im Band — füllt den Ring. */
  gutZeit: number
  druckSumme: number
  leichtZeit: number
  festZeit: number
  /** Nur nach dem Greifen: so lange liegt der Druck ununterbrochen neben dem Band. */
  rausZeit: number
}

export type GriffArt = 'abgelegt' | 'abgerutscht' | 'geflutscht' | 'zurueck'

/** Messwerte eines Griffs für `extra`, keine Noten. Koordinaten in Bühnenpixeln. */
export type GriffLog = {
  art: GriffArt | 'geholfen'
  schwer: boolean
  objekt: { x: number; y: number; r: number }
  aufsetzen?: Punkt
  ablage?: Punkt
  kiste: { x: number; y: number; r: number }
  greifDruck?: number
}

/** Was die Funktionen dem Aufrufer melden, damit er einen Klang spielen kann (A1). */
export type Ereignis = 'aufgesetzt' | 'gegriffen' | 'gefallen' | 'abgelegt' | 'tascheLeer' | null

export type Welt = {
  stufe: number
  /** B1: von Thomas eingestellt, während des Spiels fest. */
  regler: Regler
  farben: Verein['farben']
  kader: Verein['kader']
  sprueche: Spruch[]
  phase: Phase
  phaseUhr: number
  /** Wievielte Tasche, ab 0. */
  nummer: number
  dinge: Ding[]
  /** Hat Ben in dieser Tasche schon aufgesetzt? Erst dann zählt sie als begonnen. */
  tascheBegonnen: boolean
  griff: Griff | null
  stiftUnten: boolean
  /** Letzter Andruck, für den Druckbalken der Hilfe. */
  druck: number
  laolaUhr: number
  funken: Funke[]
  /** Uhr abgelaufen: kein neuer Griff mehr, ein laufender darf zu Ende gehen. */
  schluss: boolean
  nachspielUhr: number
  /** Summen fürs Ergebnis. */
  taschen: number
  verlangt: number
  aufsetzer: number
  daneben: number
  erlaubtBeruehrt: number
  geholfen: number
  griffe: GriffLog[]
  druckGeprueft: boolean
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  zeitGesamt: number
  /** `prefers-reduced-motion`: keine Funken, kein Atmen. Setzt der Aufrufer. */
  wenigerBewegung: boolean
}

/** `verein` ist optional, damit der Test die Welt ohne Content-Paket bauen kann. */
export function neueWelt(
  stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER,
): Welt {
  return {
    stufe,
    regler,
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    kader: verein?.kader ?? [],
    sprueche: verein?.sprueche ?? [],
    phase: 'kommt',
    phaseUhr: KOMMT_SEK,
    nummer: 0,
    dinge: packeTasche(stufe, 0),
    tascheBegonnen: false,
    griff: null,
    stiftUnten: false,
    druck: 0.5,
    laolaUhr: 0,
    funken: [],
    schluss: false,
    nachspielUhr: NACHSPIEL_SEK,
    taschen: 0,
    verlangt: 0,
    aufsetzer: 0,
    daneben: 0,
    erlaubtBeruehrt: 0,
    geholfen: 0,
    griffe: [],
    druckGeprueft: true,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    wenigerBewegung: false,
  }
}

/** Der Kaderspieler, dem die laufende Tasche gehört — sonst ist es ein Fan. */
export function spielerDerTasche(w: Welt): Verein['kader'][number] | null {
  if (w.kader.length === 0 || w.nummer % SPIELER_TASCHE !== SPIELER_TASCHE - 1) return null
  return w.kader[Math.floor(w.nummer / SPIELER_TASCHE) % w.kader.length]
}

/** Was der Fan zum Dank ruft. */
export const spruch = (w: Welt): Spruch | null =>
  w.sprueche.length === 0 ? null : w.sprueche[w.nummer % w.sprueche.length]

/** Wo das gegriffene Ding gerade ist. */
export const griffOrt = (gr: Griff): Punkt =>
  gr.gegriffen
    ? { x: gr.stift.x + gr.versatz.x, y: gr.stift.y + gr.versatz.y }
    : { x: gr.ding.x, y: gr.ding.y }

export const griffUrteil = (w: Welt, gr: Griff): Urteil =>
  !gr.druckZaehlt || !gr.ding.gewicht
    ? 'gut'
    : urteil(gr.druck, w.stufe, gr.ding.gewicht, w.regler.toleranz)

/** Wie voll der Greifring ist, 0–1. */
export const greifAnteil = (w: Welt, gr: Griff) => klemme(gr.gutZeit / greifzeit(w.stufe), 0, 1)

export const ueberKiste = (w: Welt, p: Punkt) => abstand(p, KISTE) <= kisteRadius(w.stufe)

/** Das Ding, für das der Druckbalken erscheint: es ist schon dreimal entwischt. */
export function hilfeFuer(w: Welt): Ding | null {
  if (w.phase !== 'kontrolle') return null
  if (w.griff) return w.griff.ding.fehlversuche >= HILFE_AB ? w.griff.ding : null
  return w.dinge.find((d) => !d.abgegeben && d.fehlversuche >= HILFE_AB) ?? null
}

/* ── Eingabe ───────────────────────────────────────────────────────────── */

function merkeDruck(w: Welt, d: Druck) {
  w.druck = d.wert
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
}

/** Stift aufgesetzt. Getroffen ist das Ding mit der nächsten Mitte. */
export function setzeAuf(
  w: Welt, x: number, y: number, d: Druck, geraet: Eingabegeraet,
): Ereignis {
  // Während der Fan kommt oder geht, nimmt der Tisch nichts an.
  if (w.phase !== 'kontrolle' || w.schluss || w.griff) return null
  w.geraet = geraet
  w.stiftUnten = true
  merkeDruck(w, d)
  w.aufsetzer++
  if (!w.tascheBegonnen) {
    w.tascheBegonnen = true
    w.verlangt += w.dinge.filter((g) => g.gewicht).length
  }

  const p = { x, y }
  let ding: Ding | null = null
  for (const g of w.dinge) {
    if (g.abgegeben || abstand(g, p) > objektRadius(w.stufe) + TREFFSAUM) continue
    if (!ding || abstand(g, p) < abstand(ding, p)) ding = g
  }
  if (!ding) {
    w.daneben++
    return null
  }
  if (!ding.gewicht) {
    // Darf mit ins Stadion: es wackelt nur kurz.
    w.erlaubtBeruehrt++
    ding.wackelUhr = WACKEL_SEK
    return null
  }
  ding.huepfer = null
  w.griff = {
    ding,
    gegriffen: false,
    stift: p,
    versatz: { x: 0, y: 0 },
    aufsetzen: p,
    druck: d.wert,
    // Die Maus hat zwar auch nur einen Ersatzdruck, aber der lässt sich mit den Ziffern stellen.
    druckZaehlt: !d.synthetisch || geraet === 'mouse',
    gutZeit: 0,
    druckSumme: 0,
    leichtZeit: 0,
    festZeit: 0,
    rausZeit: 0,
  }
  return 'aufgesetzt'
}

/** Ein Zeigerpunkt bei aufliegendem Stift. */
export function bewege(w: Welt, x: number, y: number, d: Druck): Ereignis {
  if (!w.stiftUnten) return null
  const gr = w.griff
  // Ein Stift meldet kurz vor dem Abheben auch Druck 0, und dafür steht dann der Ersatzwert da.
  // Der darf einen echten Druck nicht überschreiben.
  const echt = !d.synthetisch || w.geraet === 'mouse'
  if (echt || !gr?.druckZaehlt) merkeDruck(w, d)
  if (!gr) return null
  gr.stift = { x, y }
  if (echt) {
    gr.druck = d.wert
    gr.druckZaehlt = true
  }
  // Vor dem Greifen muss der Stift auf dem Ding bleiben.
  if (!gr.gegriffen && abstand(gr.stift, gr.ding) > objektRadius(w.stufe) + TREFFSAUM) {
    return beende(w, 'zurueck')
  }
  return null
}

/** Zifferntaste: neuer Ersatzdruck, ohne dass sich die Maus bewegt. */
export function stelleDruck(w: Welt, d: Druck) {
  if (w.geraet !== 'mouse') return
  w.druck = d.wert
  if (w.griff) w.griff.druck = d.wert
}

/** Stift abgehoben. Über der Kiste ist das Ding abgegeben, sonst springt es zurück. */
export function hebeAb(w: Welt): Ereignis {
  w.stiftUnten = false
  const gr = w.griff
  if (!gr) return null
  if (gr.gegriffen) return beende(w, 'zurueck')
  // Nie gegriffen: lag der Druck überwiegend daneben, ist das der Grund.
  if (gr.festZeit > GNADE && gr.festZeit >= gr.leichtZeit) return beende(w, 'geflutscht')
  if (gr.leichtZeit > GNADE) return beende(w, 'abgerutscht')
  return beende(w, 'zurueck')
}

/** Pause oder Systemgeste: das Ding kommt zurück, ohne dass es als Fehlversuch zählt. */
export function legeZurueck(w: Welt) {
  w.stiftUnten = false
  if (!w.griff) return
  const ding = w.griff.ding
  schreibeLog(w, w.griff, 'zurueck', griffOrt(w.griff))
  huepfe(ding, griffOrt(w.griff), ding, 0)
  w.griff = null
}

function huepfe(d: Ding, von: Punkt, nach: Punkt, seite: number) {
  d.huepfer = { von: { x: von.x, y: von.y }, nach: { x: nach.x, y: nach.y }, uhr: HUEPF_SEK, seite }
}

const rund = (p: Punkt): Punkt => ({ x: Math.round(p.x), y: Math.round(p.y) })

function schreibeLog(w: Welt, gr: Griff, art: GriffArt, ort: Punkt) {
  if (!gr.druckZaehlt) w.druckGeprueft = false
  w.griffe.push({
    art,
    schwer: gr.ding.gewicht === 'schwer',
    objekt: { ...rund(gr.ding), r: objektRadius(w.stufe) },
    aufsetzen: rund(gr.aufsetzen),
    ...(gr.gegriffen && { ablage: rund(ort) }),
    kiste: { ...KISTE, r: kisteRadius(w.stufe) },
    ...(gr.gutZeit > 0 && { greifDruck: Math.round((gr.druckSumme / gr.gutZeit) * 100) / 100 }),
  })
}

/** Der Griff ist vorbei. Über der Kiste ist er immer gelungen, egal warum das Ding fiel. */
function beende(w: Welt, grund: GriffArt): Ereignis {
  const gr = w.griff
  if (!gr) return null
  w.griff = null
  const ort = griffOrt(gr)
  const art = gr.gegriffen && ueberKiste(w, ort) ? 'abgelegt' : grund
  schreibeLog(w, gr, art, ort)

  if (art === 'abgelegt') {
    gibAb(w, gr.ding, ort)
    return 'abgelegt'
  }

  gr.ding.fehlversuche++
  if (gr.ding.fehlversuche >= GEHOLFEN_AB) {
    // Hilfe statt Abbruch (C2). Zählt als geholfen, nicht als abgelegt.
    w.geholfen++
    w.griffe.push({
      art: 'geholfen',
      schwer: gr.ding.gewicht === 'schwer',
      objekt: { ...rund(gr.ding), r: objektRadius(w.stufe) },
      kiste: { ...KISTE, r: kisteRadius(w.stufe) },
    })
    gibAb(w, gr.ding, ort)
    return 'abgelegt'
  }
  huepfe(gr.ding, ort, gr.ding, art === 'geflutscht' ? 50 : 0)
  return 'gefallen'
}

function gibAb(w: Welt, ding: Ding, ort: Punkt) {
  ding.abgegeben = true
  huepfe(ding, ort, KISTE, 0)
  funkenstoss(w, KISTE.x, KISTE.y)
}

function funkenstoss(w: Welt, x: number, y: number) {
  if (w.wenigerBewegung) return
  const farben = [w.farben.primaer, w.farben.sekundaer, '#ffc800']
  for (let i = 0; i < 12 && w.funken.length < FUNKEN_MAX; i++) {
    const winkel = (i / 12) * Math.PI * 2
    const tempo = 150 + (i % 3) * 60
    w.funken.push({
      x, y,
      vx: Math.cos(winkel) * tempo,
      vy: Math.sin(winkel) * tempo - 90,
      leben: FUNKEN_SEK,
      farbe: farben[i % farben.length],
    })
  }
}

/* ── Lauf der Dinge ────────────────────────────────────────────────────── */

/** Die Uhr ist um: kein neuer Griff mehr. Ein laufender wird nicht mittendrin abgeschnitten. */
export function beginneSchluss(w: Welt) {
  w.schluss = true
}

/** Sauberer Moment zum Aufhören: nichts am Stift, nichts in der Luft, kein Fan im Drehkreuz. */
export const istFertig = (w: Welt) =>
  w.schluss && !w.griff && w.phase !== 'geht' && w.dinge.every((d) => !d.huepfer)

export function aktualisiere(w: Welt, dt: number): Ereignis {
  w.zeitGesamt += dt
  if (w.laolaUhr > 0) w.laolaUhr -= dt

  for (const f of w.funken) {
    f.leben -= dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.vy += 400 * dt
  }
  w.funken = w.funken.filter((f) => f.leben > 0)

  for (const d of w.dinge) {
    if (d.wackelUhr > 0) d.wackelUhr -= dt
    if (!d.huepfer) continue
    d.huepfer.uhr -= dt
    if (d.huepfer.uhr <= 0) d.huepfer = null
  }

  if (w.schluss && w.griff) {
    w.nachspielUhr -= dt
    if (w.nachspielUhr <= 0) return hebeAb(w)
  }

  if (w.phase === 'kontrolle') {
    const ereignis = haltePruefen(w, dt)
    if (ereignis) return ereignis
    if (w.dinge.some((d) => d.gewicht && !d.abgegeben)) return null
    // Alles in der Kiste: der Fan geht durchs Drehkreuz und füllt ein Stück Tribüne.
    w.phase = 'geht'
    w.phaseUhr = GEHT_SEK
    w.taschen++
    if (w.taschen === REIHEN) w.laolaUhr = LAOLA_SEK
    return 'tascheLeer'
  }

  w.phaseUhr -= dt
  if (w.phaseUhr > 0) return null
  if (w.phase === 'kommt') {
    w.phase = 'kontrolle'
  } else {
    w.nummer++
    w.dinge = packeTasche(w.stufe, w.nummer)
    w.tascheBegonnen = false
    w.phase = 'kommt'
    w.phaseUhr = KOMMT_SEK
  }
  return null
}

/** Die eine Regel: hält der Druck das Ding? Läuft in jedem Bild, auch wenn der Stift ruht. */
function haltePruefen(w: Welt, dt: number): Ereignis {
  const gr = w.griff
  if (!gr) return null
  const u = griffUrteil(w, gr)

  if (gr.gegriffen) {
    if (u === 'gut') {
      gr.rausZeit = 0
      return null
    }
    gr.rausZeit += dt
    if (gr.rausZeit < GNADE) return null
    return beende(w, u === 'zu-leicht' ? 'abgerutscht' : 'geflutscht')
  }

  if (u === 'zu-leicht') gr.leichtZeit += dt
  if (u === 'zu-fest') gr.festZeit += dt
  if (u !== 'gut') return null
  gr.gutZeit += dt
  gr.druckSumme += gr.druck * dt
  if (gr.gutZeit < greifzeit(w.stufe)) return null
  gr.versatz = { x: gr.ding.x - gr.stift.x, y: gr.ding.y - gr.stift.y }
  gr.gegriffen = true
  return 'gegriffen'
}

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit` und `genauigkeit` sind **unmaßgeblich**. Sie entstehen im
 * Browser für das Sofortfeedback aus A1 und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 *
 * `vollstaendigkeit` bezieht sich auf die Taschen, in denen Ben schon aufgesetzt hat. Was von
 * selbst in die Kiste hüpfte, zählt dabei nicht als abgelegt.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  const anzahl = (art: GriffArt) => w.griffe.filter((g) => g.art === art).length
  const abgelegt = anzahl('abgelegt')
  const band = (g: Gewicht) => [
    bandUnten(w.stufe, g, w.regler.toleranz), bandOben(w.stufe, g, w.regler.toleranz),
  ]
  return {
    spielId: 'einlass',
    dauerMs,
    vollstaendigkeit: w.verlangt === 0 ? 0 : abgelegt / w.verlangt,
    genauigkeit: w.aufsetzer === 0 ? 0 : abgelegt / w.aufsetzer,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      taschen: w.taschen,
      abgelegt,
      aufsetzer: w.aufsetzer,
      daneben: w.daneben,
      erlaubtBeruehrt: w.erlaubtBeruehrt,
      abgerutscht: anzahl('abgerutscht'),
      geflutscht: anzahl('geflutscht'),
      zurueck: anzahl('zurueck'),
      geholfen: w.geholfen,
      objektRadius: objektRadius(w.stufe),
      kisteRadius: kisteRadius(w.stufe),
      greifzeitMs: Math.round(greifzeit(w.stufe) * 1000),
      band: { leicht: band('leicht'), schwer: band('schwer') },
      druckGeprueft: w.druckGeprueft,
      griffe: w.griffe,
    },
  }
}
