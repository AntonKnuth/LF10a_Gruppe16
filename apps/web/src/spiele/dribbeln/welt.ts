/**
 * Zustand und Bewertung von „Dribbeln mit Pfiff". Kennt kein Canvas, kein React und keine Uhr —
 * die Zeit kommt als Parameter herein. Damit bleibt alles ohne Browser testbar (welt.test.ts).
 *
 * Spielidee: Ben dribbelt den Ball eine flache Welle entlang zu einem Mitspieler. Pfeift der
 * Trainer, friert alles ein, auch die Stiftspitze — sie bleibt aber auf dem Rasen liegen, bis
 * der Doppelpfiff kommt. Der Ball bleibt am Fuß, solange der Stift liegt; hebt Ben beim Pfiff
 * ab, rollt der Ball ein Stück nach vorn und wartet. Verlieren kann man nicht (C2): der Ball
 * rollt nie zurück, Abheben kostet nur Sekunden.
 *
 * Zwei Zeiten, die man nicht verwechseln darf:
 *   dt   Spielzeit. Steht im Pausenmenü — darauf laufen Jubel, Rollen und die Pfiff-Uhr.
 *   tMs  Millisekunden seit Segmentstart, dieselbe Uhr wie `t` in den Rohdaten. Läuft im
 *        Pausenmenü weiter. Alles, was im `extra` steht, steht auf dieser Uhr; sonst ließen
 *        sich Pfiffe und Stiftpunkte nicht übereinanderlegen.
 */

import type { Verein } from '../../content/typen'
import type { Druck, Eingabegeraet } from '../../eingabe'
import { druckKennzahlen } from '../../eingabe'
import type { SpielErgebnis } from '../../engine/segmente'
import { VORGABE_REGLER, musterNochmal, type Regler } from '../regler'

/* ── Bühne ─────────────────────────────────────────────────────────────── */
export const W = 900
export const H = 640

export const BALL_R = 16
/** So nah muss der Stift an den Ball, um ihn mitzunehmen. Sonst ließe sich der weggerollte
 *  Ball überholen, indem man weiter vorn aufsetzt. */
export const FANG_R = 45

const BAHN_X0 = 110
const BAHN_X1 = 760
/** Tiefer als die Mitte: darüber steht der Trainer. */
const BAHN_Y = 380

export const JUBEL_SEK = 1.5
export const PFEIL_SEK = 0.3
export const STERNE_SEK = 0.5
/** Der Hilfesatz bleibt so lange stehen; solange pfeift niemand in die Stimme hinein. */
const HILFE_SEK = 4
const HILFE_ABSTAND_MS = 60_000
export const HILFE_TEXT = 'Lass den Stift kleben wie Kaugummi.'

/** Stillstand ist erst nach einer Weile Stillstand — so lange muss die Spitze ruhen. */
const STILL_MS = 150
const ROLL_SEK = 0.6
export const WEGROLLEN_PX = 80
export const KULLERN_PX = 24
/** Dahinter kommt kein Pfiff mehr, sonst rollte der Ball dem Mitspieler von selbst zu. */
export const PFIFF_BIS = 0.9
/** Weiter rollt der Ball nie von allein — den Pass spielt immer Ben. */
const ROLLEN_BIS = 0.97

export type Punkt = { x: number; y: number }

/* ── Bahnen ────────────────────────────────────────────────────────────────
   Wechselnde Wellen (B3), aber flacher als beim Aufwärmen: ist das Lenken schwer, misst die
   Reaktion auf den Pfiff die Doppelaufgabe mit. Lenken ist hier die Nebenaufgabe. Feste Folge
   wie dort, damit zwei Sitzungen vergleichbar sind. */
const MUSTER: { boegen: number; amplitude: number }[] = [
  { boegen: 2, amplitude: 50 },
  { boegen: 3, amplitude: 40 },
  { boegen: 2, amplitude: 70 },
  { boegen: 3, amplitude: 55 },
  { boegen: 2, amplitude: 35 },
]

const STUETZEN = 96

/** Hütchen alle rund 90 Pixel entlang der Gasse, als Strecke 0–1. */
export const HUETCHEN = Array.from({ length: 7 }, (_, i) => (i + 0.5) / 7)

/*
 * `bahnPunkte`, `aufBahn` und `punktAuf` stehen so ähnlich auch in `aufwaermen/welt.ts`. Bewusst
 * kopiert statt importiert: die Minispiele sollen einzeln baubar bleiben (CLAUDE.md,
 * Arbeitsteilung), ein Import aus einem fremden Spielordner koppelt zwei Personen aneinander.
 */
export function bahnPunkte(gasse: number): Punkt[] {
  const { boegen, amplitude } = MUSTER[gasse % MUSTER.length]
  return Array.from({ length: STUETZEN + 1 }, (_, i) => {
    const u = i / STUETZEN
    return {
      x: BAHN_X0 + (BAHN_X1 - BAHN_X0) * u,
      y: BAHN_Y + Math.sin(u * boegen * Math.PI) * amplitude,
    }
  })
}

/** Nächster Punkt auf der Bahn: Strecke 0–1 und Abstand quer dazu. */
export function aufBahn(bahn: Punkt[], x: number, y: number): { t: number; quer: number } {
  let beste = { t: 0, quer: Infinity }
  for (let i = 1; i < bahn.length; i++) {
    const a = bahn[i - 1]
    const b = bahn[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const u = klemme(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1)
    const quer = Math.hypot(x - (a.x + u * dx), y - (a.y + u * dy))
    if (quer < beste.quer) beste = { t: (i - 1 + u) / (bahn.length - 1), quer }
  }
  return beste
}

/** Punkt auf der Bahn bei Strecke t. */
export function punktAuf(bahn: Punkt[], t: number): Punkt {
  const genau = klemme(t, 0, 1) * (bahn.length - 1)
  const i = Math.min(bahn.length - 2, Math.floor(genau))
  const u = genau - i
  return {
    x: bahn[i].x + (bahn[i + 1].x - bahn[i].x) * u,
    y: bahn[i].y + (bahn[i + 1].y - bahn[i].y) * u,
  }
}

export const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y)
export const klemme = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ── Stufe (B1) ─────────────────────────────────────────────────────────────
   Je Stufe eine Zeile, während des Spiels fest. Startwerte, kein Messwert — mit echtem Pencil
   und mit Ben nachziehen. */
const STUFEN = [
  { still: 10, fristMs: 1500, fehlstart: 20, halten: [1, 2], vorperiode: [2.5, 6.5], korridor: 52, vMin: 60 },
  { still: 8, fristMs: 1200, fehlstart: 17, halten: [1.2, 2.5], vorperiode: [2, 6], korridor: 48, vMin: 70 },
  { still: 6, fristMs: 1000, fehlstart: 14, halten: [1.5, 3], vorperiode: [1.5, 6], korridor: 44, vMin: 80 },
  { still: 5, fristMs: 850, fehlstart: 12, halten: [1.5, 3.5], vorperiode: [1.2, 5.5], korridor: 40, vMin: 90 },
  { still: 4, fristMs: 700, fehlstart: 10, halten: [2, 4], vorperiode: [1, 5], korridor: 36, vMin: 100 },
]

const stufenwerte = (stufe: number) => STUFEN[klemme(Math.round(stufe), 1, STUFEN.length) - 1]

/**
 * Die Werte dieses Spiels: Stufe mal Regler. Die Toleranz wirkt auch auf den Fehlstartradius —
 * sonst läge der Stillradius ab Faktor 2,4 darüber, und Stillhalten gälte als Fehlstart.
 * Die Untergrenzen halten das Spiel bei Faktor 0,1 spielbar: ruhiger als auf drei Pixel hält
 * niemand einen Stift, und die Gasse bleibt so breit wie der Ball.
 */
export function parameter(stufe: number, regler: Regler) {
  const s = stufenwerte(stufe)
  return {
    stillRadius: Math.max(3, s.still * regler.toleranz),
    stillFensterMs: STILL_MS,
    fristMs: s.fristMs,
    fehlstartRadius: Math.max(6, s.fehlstart * regler.toleranz),
    korridor: Math.max(BALL_R, s.korridor * regler.toleranz),
    vMin: s.vMin * regler.zielgeschwindigkeit,
  }
}

/* ── Plan der Pfiffe ───────────────────────────────────────────────────────
   Ein vorhersagbarer Pfiff misst keine Hemmung, freier Zufall macht Sitzungen unvergleichbar.
   Deshalb **gemischte Blöcke**: je acht Pfiffe nutzen dieselben acht Wartezeiten genau einmal,
   nur in anderer Reihenfolge. Kurze sind häufiger als lange — bei gleichmäßiger Verteilung
   wüsste ein Kind nach fünf Sekunden, dass der Pfiff jetzt kommen muss. Für die Haltedauer gilt
   dasselbe, sonst zählte Ben einfach mit. */
const ANTEILE = [0, 1 / 9, 1 / 9, 2 / 9, 3 / 9, 4 / 9, 6 / 9, 1]
export const BLOCK = ANTEILE.length

/** Mulberry32, wie in `engine/tagesplan.ts` — wiederholbar, deshalb testbar. */
function zufallsfolge(saat: number): () => number {
  let a = saat
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates: von hinten jeden Platz mit einem zufälligen davor tauschen. */
function gemischt(saat: number): number[] {
  const wuerfel = zufallsfolge(saat)
  const liste = [...ANTEILE]
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(wuerfel() * (i + 1))
    ;[liste[i], liste[j]] = [liste[j], liste[i]]
  }
  return liste
}

/** Sekunden für den Pfiff mit diesem Index (ab 0). Gleiche Saat, gleicher Plan. */
function ausBlock([von, bis]: number[], saat: number, index: number) {
  const anteile = gemischt(saat + Math.floor(index / BLOCK))
  return von + anteile[index % BLOCK] * (bis - von)
}

/** So lange dribbelt Ben, bevor gepfiffen wird. */
export const vorperiode = (stufe: number, saat: number, index: number) =>
  ausBlock(stufenwerte(stufe).vorperiode, saat, index)

/** So lange hält er, bis der Doppelpfiff kommt. Andere Saat, sonst liefen beide Folgen gleich. */
export const haltedauer = (stufe: number, saat: number, index: number) =>
  ausBlock(stufenwerte(stufe).halten, saat + 1_000_003, index)

/* ── Zustand ───────────────────────────────────────────────────────────── */

export type Phase =
  | 'dribbeln'
  /** Gepfiffen, Ben soll anhalten. */
  | 'stopp'
  /** Angehalten oder Frist vorbei, gleich kommt der Doppelpfiff. */
  | 'halten'
  /** Beim Pfiff abgehoben: der Ball rollt ein Stück und wartet. */
  | 'weggerollt'

/** Ein Pfiff-Durchgang, wie er ins `extra` geht. Alle Zeiten auf der Rohdaten-Uhr. */
export type Pfiff = {
  nr: number
  /** Der erste Pfiff führt die Regel vor und wird nicht gewertet. */
  probe: boolean
  stoppMs: number
  /** Beginn des Stillstands; `null`, wenn Ben nicht angehalten hat. */
  gestopptMs: number | null
  rechtzeitig: boolean
  fehlstart: boolean
  doppelMs: number | null
  endeMs: number | null
  ende: 'doppelpfiff' | 'abgehoben' | 'pause' | 'zeit' | null
  /** Auf einen Ton reagiert man schneller als auf ein Bild — deshalb steht es je Pfiff dabei. */
  tonAn: boolean
}

/** Was die Welt dem Aufrufer meldet, damit er einen Klang spielen kann (A1). */
export type Ereignis =
  | 'huetchen' | 'pass' | 'pfiff' | 'gestoppt' | 'doppelpfiff' | 'kullern' | 'hilfe'

export type Welt = {
  stufe: number
  regler: Regler
  p: ReturnType<typeof parameter>
  farben: Verein['farben']
  nummern: number[]
  sprueche: Verein['sprueche']
  saat: number
  /** Wievielte Gasse, ab 0. Bleibt bei einer Wiederholung stehen. */
  gasse: number
  bahn: Punkt[]
  /** 0–1 auf der Bahn. Wächst nur, nie zurück. */
  fortschritt: number
  phase: Phase
  zeiger: Punkt
  /** Stift liegt auf. */
  zieht: boolean
  /** Führt der Stift gerade den Ball? Sonst wartet der Ball und leuchtet. */
  amBall: boolean
  spur: (Punkt & { zeit: number })[]
  /** Geglättetes Tempo des Stifts am Ball in Pixeln je Sekunde. */
  tempo: number
  wegSeitBild: number
  /** Dribbelzeit seit dem letzten Pfiff — die Pfiff-Uhr. */
  dribbelzeit: number
  /** Wo die Spitze ruht und seit wann. Daran hängen Stillstand und Fehlstart. */
  ruhe: Punkt & { seitMs: number }
  /** Beginn des Haltens auf der Rohdaten-Uhr. */
  haltAbMs: number
  rollZiel: number
  rollUhr: number
  pfiffe: Pfiff[]
  /** Ab diesem Pfiff gehört die Liste zur laufenden Gasse. */
  gasseAbPfiff: number
  wiederholung: boolean
  wiederholungen: number
  pausen: { vonMs: number; bisMs: number | null }[]
  hinweise: number[]
  paesse: number
  jubelUhr: number
  hilfeUhr: number
  pfeilUhr: number
  sterneUhr: number
  tonAn: boolean
  /** Rohdaten sind CSS-Pixel; damit lassen sie sich auf die Bühne umrechnen. */
  cssPxProBuehnenPx: number
  druckWerte: number[]
  synthetisch: boolean
  geraet: Eingabegeraet
  /** Spielzeit in Sekunden, ohne Pausen. */
  zeitGesamt: number
  /** Letzter Stand der Rohdaten-Uhr. */
  tMs: number
}

/** `verein` und `saat` haben Vorgaben, damit der Test die Welt ohne Content bauen kann. */
export function neueWelt(
  stufe: number, verein?: Verein, regler: Regler = VORGABE_REGLER, saat = 1,
): Welt {
  return {
    stufe,
    regler,
    p: parameter(stufe, regler),
    farben: verein?.farben ?? { primaer: '#0a3a82', sekundaer: '#ffffff' },
    // Rückwärts, damit nicht der Torwart den ersten Pass bekommt.
    nummern: verein?.kader.map((k) => k.nummer).reverse() ?? [9],
    sprueche: verein?.sprueche ?? [],
    saat,
    gasse: 0,
    bahn: bahnPunkte(0),
    fortschritt: 0,
    phase: 'dribbeln',
    zeiger: { x: 0, y: 0 },
    zieht: false,
    amBall: false,
    spur: [],
    tempo: 0,
    wegSeitBild: 0,
    dribbelzeit: 0,
    ruhe: { x: 0, y: 0, seitMs: 0 },
    haltAbMs: 0,
    rollZiel: 0,
    rollUhr: 0,
    pfiffe: [],
    gasseAbPfiff: 0,
    wiederholung: false,
    wiederholungen: 0,
    pausen: [],
    hinweise: [],
    paesse: 0,
    jubelUhr: 0,
    hilfeUhr: 0,
    pfeilUhr: 0,
    sterneUhr: 0,
    tonAn: true,
    cssPxProBuehnenPx: 1,
    druckWerte: [],
    synthetisch: false,
    geraet: 'mouse',
    zeitGesamt: 0,
    tMs: 0,
  }
}

export const ballPunkt = (w: Welt): Punkt => punktAuf(w.bahn, w.fortschritt)
export const nummer = (w: Welt) => w.nummern[w.gasse % w.nummern.length]
export const aktuellerPfiff = (w: Welt): Pfiff | undefined => w.pfiffe.at(-1)

/** Vor dem allerersten Pfiff hebt der Trainer eine Sekunde lang die Pfeife zum Mund. */
export const kuendigtAn = (w: Welt) =>
  w.pfiffe.length === 0 && w.dribbelzeit >= vorperiode(w.stufe, w.saat, 0) - 1

/* ── Wertung der Pfiffe ────────────────────────────────────────────────── */

const gewertet = (p: Pfiff) => !p.probe && (p.ende === 'doppelpfiff' || p.ende === 'abgehoben')
const sauber = (p: Pfiff) => p.ende === 'doppelpfiff' && p.rechtzeitig && !p.fehlstart

/** Wie viele Pfiffe zuletzt hintereinander nicht sauber waren. Pausen und Probe zählen nicht. */
function unsauberInFolge(w: Welt) {
  const alle = w.pfiffe.filter(gewertet)
  return alle.length - 1 - alle.findLastIndex(sauber)
}

/** C2: Hilfe statt Abbruch. Ändert an Pfiffen und Schwellen nichts. */
function zeigeHilfe(w: Welt, tMs: number): Ereignis[] {
  const letzte = w.hinweise.at(-1)
  if (letzte !== undefined && tMs - letzte < HILFE_ABSTAND_MS) return []
  w.hinweise.push(tMs)
  w.hilfeUhr = HILFE_SEK
  return ['hilfe']
}

function beendePfiff(w: Welt, ende: 'doppelpfiff' | 'abgehoben', tMs: number): Ereignis[] {
  const p = w.pfiffe[w.pfiffe.length - 1]
  p.ende = ende
  p.endeMs = tMs
  // Die nächste Wartezeit beginnt von vorn.
  w.dribbelzeit = 0
  w.tempo = 0
  return unsauberInFolge(w) >= 3 ? zeigeHilfe(w, tMs) : []
}

/* ── Rollen ────────────────────────────────────────────────────────────── */

/** Der Ball rollt höchstens `px` Pixel die Gasse entlang, nur nach vorn. */
function rolleVor(w: Welt, px: number) {
  let t = w.fortschritt
  let weg = 0
  while (t < ROLLEN_BIS) {
    const naechstes = t + 0.002
    weg += abstand(punktAuf(w.bahn, t), punktAuf(w.bahn, naechstes))
    if (weg > px) break
    t = naechstes
  }
  w.rollZiel = t
  w.rollUhr = ROLL_SEK
}

/* ── Stift ─────────────────────────────────────────────────────────────── */

/** Stift auf den Rasen. */
export function setzeAuf(w: Welt, x: number, y: number, d: Druck, tMs: number): Ereignis[] {
  w.zieht = true
  // Sonst zählte der Sprung vom letzten Absetzpunkt hierher als Bewegung.
  w.zeiger = { x, y }
  return ziehe(w, x, y, d, tMs)
}

/** Ein Zeigerpunkt bei aufliegendem Stift. */
export function ziehe(w: Welt, x: number, y: number, d: Druck, tMs: number): Ereignis[] {
  const weg = abstand(w.zeiger, { x, y })
  w.zeiger = { x, y }
  w.druckWerte.push(d.wert)
  if (d.synthetisch) w.synthetisch = true
  w.spur.push({ x, y, zeit: w.zeitGesamt })

  if (w.jubelUhr > 0) return []
  if (w.phase === 'dribbeln') return dribble(w, weg)
  if (w.phase === 'stopp' || w.phase === 'halten') return pruefeHalten(w, tMs)
  return []
}

/** Der Ball folgt dem Stift: nur in der Gasse, nur vom Ball aus, nur vorwärts. */
function dribble(w: Welt, weg: number): Ereignis[] {
  const { t, quer } = aufBahn(w.bahn, w.zeiger.x, w.zeiger.y)
  const nah = abstand(w.zeiger, ballPunkt(w)) <= FANG_R
  w.amBall = quer <= w.p.korridor && (nah || (w.amBall && t > w.fortschritt))
  if (!w.amBall) return []
  w.wegSeitBild += weg

  if (t <= w.fortschritt) return []
  const vorbei = HUETCHEN.some((h) => w.fortschritt < h && t >= h)
  w.fortschritt = t
  if (t >= 0.99) {
    w.fortschritt = 1
    w.paesse++
    w.jubelUhr = JUBEL_SEK
    w.amBall = false
    w.tempo = 0
    return ['pass']
  }
  return vorbei ? ['huetchen'] : []
}

/** Nach dem Pfiff: Der Ball liegt fest, geschaut wird nur noch auf die Spitze. */
function pruefeHalten(w: Welt, tMs: number): Ereignis[] {
  const p = w.pfiffe[w.pfiffe.length - 1]
  const weg = abstand(w.zeiger, w.ruhe)
  if (p.gestopptMs === null) {
    // Noch in Bewegung: der Ruhepunkt wandert mit, das Zeitfenster beginnt neu.
    if (weg > w.p.stillRadius) w.ruhe = { ...w.zeiger, seitMs: Math.max(tMs, p.stoppMs) }
    return []
  }
  if (weg <= w.p.fehlstartRadius || p.fehlstart) return []
  // Vor dem Doppelpfiff losgelaufen: der Ball kullert ein bisschen, das Halten läuft weiter.
  p.fehlstart = true
  rolleVor(w, KULLERN_PX)
  return ['kullern']
}

/**
 * Stift hoch. Beim Dribbeln hat das keine Folge, der Ball wartet einfach — sonst würde jedes
 * Absetzen bestraft, und genau das ist Bens Schwierigkeit. Nur beim Pfiff rollt er weg.
 */
export function hebeAb(w: Welt, tMs: number): Ereignis[] {
  if (!w.zieht) return []
  w.zieht = false
  w.amBall = false
  w.spur = []
  if (w.phase !== 'stopp' && w.phase !== 'halten') return []
  w.phase = 'weggerollt'
  rolleVor(w, WEGROLLEN_PX)
  return ['kullern', ...beendePfiff(w, 'abgehoben', tMs)]
}

/* ── Pausenmenü ────────────────────────────────────────────────────────── */

/**
 * Das Pausenmenü macht den laufenden Pfiff ungültig. Um den Knopf zu treffen, hebt Ben vorher
 * ab — deshalb gilt auch ein eben weggerollter Ball als Pause und nicht als Abheben.
 */
export function beginnePause(w: Welt, tMs: number) {
  const p = aktuellerPfiff(w)
  if (w.phase !== 'dribbeln' && p) {
    p.ende = 'pause'
    p.endeMs ??= tMs
    w.dribbelzeit = 0
    w.phase = 'dribbeln'
  }
  w.zieht = false
  w.amBall = false
  w.tempo = 0
  w.spur = []
  w.pausen.push({ vonMs: tMs, bisMs: null })
}

export function beendePause(w: Welt, tMs: number) {
  const offen = w.pausen.at(-1)
  if (offen) offen.bisMs ??= tMs
}

/* ── Zeit ──────────────────────────────────────────────────────────────── */

export function aktualisiere(w: Welt, dt: number, tMs: number): Ereignis[] {
  w.zeitGesamt += dt
  w.tMs = tMs
  w.hilfeUhr = Math.max(0, w.hilfeUhr - dt)
  w.pfeilUhr = Math.max(0, w.pfeilUhr - dt)
  w.sterneUhr = Math.max(0, w.sterneUhr - dt)
  w.spur = w.spur.filter((s) => w.zeitGesamt - s.zeit < 1.2)
  rolle(w, dt)

  if (w.jubelUhr > 0) {
    w.jubelUhr -= dt
    return w.jubelUhr <= 0 ? naechsteGasse(w, tMs) : []
  }
  if (w.phase === 'dribbeln') return warteAufPfiff(w, dt, tMs)
  if (w.phase === 'weggerollt') {
    // Erst ausrollen lassen: sonst übersprünge ein kurzes Abtippen das Warten auf den Doppelpfiff.
    if (w.rollUhr <= 0 && w.zieht && abstand(w.zeiger, ballPunkt(w)) <= FANG_R) {
      w.phase = 'dribbeln'
      w.amBall = true
    }
    return []
  }
  return warteAufDoppelpfiff(w, tMs)
}

function rolle(w: Welt, dt: number) {
  if (w.rollUhr <= 0) return
  w.rollUhr -= dt
  // Nie zurück: nach dem Doppelpfiff kann Ben den kullernden Ball schon überholt haben.
  if (w.rollZiel <= w.fortschritt) return
  w.fortschritt += (w.rollZiel - w.fortschritt) * Math.min(1, dt * 8)
  if (w.rollUhr <= 0) w.fortschritt = w.rollZiel
}

/**
 * Die Pfiff-Uhr läuft nur, solange Ben wirklich dribbelt. Ein Pfiff, wenn er ohnehin steht oder
 * abgehoben hat, misst nichts.
 */
function warteAufPfiff(w: Welt, dt: number, tMs: number): Ereignis[] {
  // Geglättet über rund eine Zehntelsekunde — ein einzelnes Bild ohne Stiftpunkt ist kein Stopp.
  w.tempo += (w.wegSeitBild / dt - w.tempo) * Math.min(1, dt * 10)
  w.wegSeitBild = 0

  if (!w.zieht || !w.amBall || w.hilfeUhr > 0 || w.tempo < w.p.vMin) return []
  w.dribbelzeit += dt
  if (w.fortschritt >= PFIFF_BIS) return []
  if (w.dribbelzeit < vorperiode(w.stufe, w.saat, w.pfiffe.length)) return []

  w.phase = 'stopp'
  w.ruhe = { ...w.zeiger, seitMs: tMs }
  w.pfiffe.push({
    nr: w.pfiffe.length + 1,
    probe: w.pfiffe.length === 0,
    stoppMs: tMs,
    gestopptMs: null,
    rechtzeitig: false,
    fehlstart: false,
    doppelMs: null,
    endeMs: null,
    ende: null,
    tonAn: w.tonAn,
  })
  return ['pfiff']
}

function warteAufDoppelpfiff(w: Welt, tMs: number): Ereignis[] {
  const p = w.pfiffe[w.pfiffe.length - 1]
  const ereignisse: Ereignis[] = []

  // Ein ruhender Stift sendet kaum Ereignisse, deshalb wird der Stillstand hier erkannt.
  if (p.gestopptMs === null && tMs - w.ruhe.seitMs >= STILL_MS) {
    p.gestopptMs = w.ruhe.seitMs
    p.rechtzeitig = w.phase === 'stopp'
    ereignisse.push('gestoppt')
  }

  if (w.phase === 'stopp') {
    // Auch ohne Stillstand geht es nach der Frist weiter — nur eben nicht sauber.
    if (p.gestopptMs !== null || tMs - p.stoppMs >= w.p.fristMs) {
      w.phase = 'halten'
      w.haltAbMs = tMs
    }
    return ereignisse
  }

  if (tMs - w.haltAbMs < haltedauer(w.stufe, w.saat, p.nr - 1) * 1000) return ereignisse
  p.doppelMs = tMs
  w.phase = 'dribbeln'
  w.amBall = abstand(w.zeiger, ballPunkt(w)) <= FANG_R
  w.pfeilUhr = PFEIL_SEK
  const hilfe = beendePfiff(w, 'doppelpfiff', tMs)
  if (sauber(p)) w.sterneUhr = STERNE_SEK
  return [...ereignisse, 'doppelpfiff', ...hilfe]
}

/** Nach dem Jubel: neue Welle, neuer Mitspieler. */
function naechsteGasse(w: Welt, tMs: number): Ereignis[] {
  const hier = w.pfiffe.slice(w.gasseAbPfiff).filter(gewertet)
  // Unter der Mindesttrefferquote dieselbe Gasse noch einmal, aber nie ein drittes Mal. Den Weg
  // kennt Ben dann schon, also bleibt mehr Aufmerksamkeit für den Pfiff.
  w.wiederholung =
    !w.wiederholung && musterNochmal(w.regler, hier.filter(sauber).length, hier.length)
  if (w.wiederholung) w.wiederholungen++
  else w.gasse++
  w.gasseAbPfiff = w.pfiffe.length
  w.jubelUhr = 0
  w.bahn = bahnPunkte(w.gasse)
  w.fortschritt = 0
  w.rollUhr = 0
  w.spur = []
  return w.wiederholung ? zeigeHilfe(w, tMs) : []
}

/**
 * Ein sauberer Moment zum Aufhören, wenn die Zeit um ist: kein offener Pfiff, kein Jubel, kein
 * rollender Ball. Alle drei enden von selbst nach wenigen Sekunden.
 */
export const darfEnden = (w: Welt) =>
  w.phase !== 'stopp' && w.phase !== 'halten' && w.jubelUhr <= 0 && w.rollUhr <= 0

/* ── Ergebnis ──────────────────────────────────────────────────────────── */

/**
 * ACHTUNG — `vollstaendigkeit`, `genauigkeit` und die Reaktionen im `extra` sind
 * **unmaßgeblich**. Sie entstehen im Browser für das Sofortfeedback aus A1 und dürfen nie in
 * einem Bericht landen. Maßgeblich rechnet C# aus Pfiffzeiten und Rohdaten-Punktfolge.
 */
export function ergebnis(w: Welt, dauerMs: number, abgebrochen: boolean): SpielErgebnis {
  const { mittel, streuung } = druckKennzahlen(w.druckWerte)
  const zaehlt = w.pfiffe.filter(gewertet)
  const saubere = zaehlt.filter(sauber).length
  const rechtzeitig = zaehlt.filter((p) => p.rechtzeitig).length
  return {
    spielId: 'dribbeln',
    dauerMs,
    vollstaendigkeit: zaehlt.length === 0 ? 0 : rechtzeitig / zaehlt.length,
    genauigkeit: zaehlt.length === 0 ? 0 : saubere / zaehlt.length,
    druckMittel: mittel,
    druckStreuung: streuung,
    eingabegeraet: w.geraet,
    synthetischerDruck: w.synthetisch,
    stufe: w.stufe,
    abgebrochen,
    extra: {
      version: 1,
      saat: w.saat,
      cssPxProBuehnenPx: w.cssPxProBuehnenPx,
      parameter: w.p,
      pfiffe: w.pfiffe.map((p) => ({
        ...p, ende: p.ende ?? 'zeit', endeMs: p.endeMs ?? w.tMs,
      })),
      pausen: w.pausen,
      hinweise: w.hinweise,
      paesse: w.paesse,
      saubereStopps: saubere,
      wiederholungen: w.wiederholungen,
    },
  }
}
