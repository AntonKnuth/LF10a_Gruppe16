/**
 * Zeichnen der „Startelf". Liest nur aus der Welt und verändert sie nie — dadurch bleiben die
 * Regeln in welt.ts ohne Canvas testbar.
 *
 * A2: kein Punktestand, keine Prozentzahl. Wie weit Ben ist, zeigt allein die Taktiktafel.
 * C2: kein Rot. Rote Striche an Buchstaben kennt ein Kind aus der Heftkorrektur.
 */

import { anfangVon, laenge, punktBei, type Strich } from '../schrift'
import {
  BALL_SEK, FUNKEN_SEK, H, JUBEL_SEK, PLAETZE, PULS_SEK, SCHLUSS_SEK, W, ZEILE, aktiverStrich, band,
  hilfeVon, hilfsbild, kaderplatz, kapitaen, nachname, platzVon, spielerVon, spitze, type Welt,
} from './welt'

const F = {
  wand: '#e8dfd0',
  bank: '#b98f5f',
  tafel: '#ffffff',
  tafelRand: '#8a99ab',
  rasen: '#2f8f4e',
  linie: 'rgba(255,255,255,0.75)',
  leer: 'rgba(255,255,255,0.28)',
  fremd: '#c9d2dc',
  lineatur: '#c3cede',
  mittelband: '#e6f3fc',
  vorlage: '#a9b6c5',
  kreide: '#1f3550',
  daneben: '#b9c3cf',
  start: '#22b455',
  gold: '#ffc800',
  text: '#1f3550',
  haut: '#f3c9a0',
  haar: '#6b4423',
}

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 700) => `${gewicht} ${px}px ${SCHRIFT}`

const MAGNET_R = 25
/** Mitte des Trikots auf der Spielerkarte — von dort fliegt der Magnet los. */
const TRIKOT = { x: 800, y: 92 }
const FLUG_SEK = 0.6

/** Sichtfenster: Maßstab und Rand, damit die 900×640-Bühne mittig ins Canvas passt. */
export type Sicht = { s: number; dx: number; dy: number }

export function berechneSicht(breite: number, hoehe: number): Sicht {
  const s = Math.min(breite / W, hoehe / H)
  return { s, dx: (breite - W * s) / 2, dy: (hoehe - H * s) / 2 }
}

/* ── Formhelfer ────────────────────────────────────────────────────────── */
function rundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

function kreis(g: CanvasRenderingContext2D, x: number, y: number, r: number, farbe: string) {
  g.fillStyle = farbe
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

function text(g: CanvasRenderingContext2D, t: string, x: number, y: number, px: number, farbe: string) {
  g.font = schrift(px, 800)
  g.fillStyle = farbe
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(t, x, y)
}

function linie(g: CanvasRenderingContext2D, s: Strich) {
  g.beginPath()
  // Ein Tupfer ist ein Strich der Länge 0; mit runden Enden wird daraus ein Punkt.
  g.moveTo(s[0].x, s[0].y)
  if (s.length === 1) g.lineTo(s[0].x + 0.1, s[0].y)
  for (let i = 1; i < s.length; i++) g.lineTo(s[i].x, s[i].y)
  g.stroke()
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number) {
  // Hintergrund in Canvas-Koordinaten: sonst endet die Kabinenwand an der Bühnenkante.
  g.setTransform(1, 0, 0, 1, 0, 0)
  const kante = sicht.dy + (H - 24) * sicht.s
  g.fillStyle = F.wand
  g.fillRect(0, 0, breite, kante)
  g.fillStyle = F.bank
  g.fillRect(0, kante, breite, hoehe - kante)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  taktiktafel(g, w)
  schreibtafel(g)
  if (w.phase === 'schreiben' || w.phase === 'jubel') {
    karte(g, w)
    lineatur(g, w)
    vorlage(g, w)
    kreide(g, w)
    if (w.phase === 'schreiben') startpunkt(g, w)
  }
  magnete(g, w)
  funken(g, w)
  if (w.phase === 'jubel') jubel(g, w)
  if (w.phase === 'tafelVoll' || w.phase === 'schluss' || w.phase === 'fertig') tafelSteht(g)
  if (w.blase) sprechblase(g, w, w.blase.text)
}

/** Der Platz mit elf Stellen. Er ist die Fortschrittsanzeige, ganz ohne Zahl. */
function taktiktafel(g: CanvasRenderingContext2D, w: Welt) {
  rundRect(g, 18, 24, 272, 592, 16)
  g.fillStyle = F.tafelRand
  g.fill()
  rundRect(g, 26, 32, 256, 576, 10)
  g.fillStyle = F.rasen
  g.fill()

  g.strokeStyle = F.linie
  g.lineWidth = 3
  g.strokeRect(38, 44, 232, 552)
  g.beginPath()
  g.moveTo(38, 232)
  g.lineTo(270, 232)
  g.stroke()
  g.beginPath()
  g.arc(154, 232, 42, 0, Math.PI * 2)
  g.stroke()
  g.strokeRect(88, 500, 132, 96)
  g.strokeRect(88, 44, 132, 60)

  for (const q of PLAETZE) kreis(g, q.x, q.y, MAGNET_R, F.leer)
  // Plätze, für die der Verein keinen Spieler mitbringt, hat der Profi schon gefüllt.
  const belegt = w.kader.map((_, i) => platzVon(i, w.kader.length))
  PLAETZE.forEach((q, i) => {
    if (!belegt.includes(i)) kreis(g, q.x, q.y, MAGNET_R - 5, F.fremd)
  })
}

function magnet(g: CanvasRenderingContext2D, w: Welt, platz: number, x: number, y: number) {
  kreis(g, x + 2, y + 4, MAGNET_R, 'rgba(0,0,0,0.25)')
  kreis(g, x, y, MAGNET_R, w.farben.sekundaer)
  kreis(g, x, y, MAGNET_R - 3, w.farben.primaer)
  if (platz === kapitaen(w)) {
    g.strokeStyle = F.gold
    g.lineWidth = 6
    g.beginPath()
    g.arc(x, y, MAGNET_R + 1, 0, Math.PI * 2)
    g.stroke()
  }
  text(g, String(w.kader[platz].nummer), x, y + 1, 24, w.farben.sekundaer)
}

/** Gesetzte Magnete, der gerade fliegende, und am Ende die vom Profi ergänzten. */
function magnete(g: CanvasRenderingContext2D, w: Welt) {
  const n = w.kader.length
  const ziel = (platz: number) => PLAETZE[platzVon(platz, n)]

  for (let dran = 0; dran < n; dran++) {
    const platz = kaderplatz(w, dran)
    const q = ziel(platz)
    let t = dran < w.dran ? 1 : 0
    if (dran === w.dran && w.phase === 'jubel') t = (JUBEL_SEK - w.uhr) / FLUG_SEK
    if (dran >= w.dran && w.phase === 'schluss') {
      // Einer nach dem anderen, damit man sieht, dass der Profi sie aufhängt.
      const reihe = (dran - w.dran) / Math.max(1, n - w.dran)
      t = ((SCHLUSS_SEK - w.uhr) / SCHLUSS_SEK - reihe * 0.6) / 0.4
    }
    if (w.phase === 'fertig') t = 1
    if (t <= 0) continue
    const s = Math.min(1, t)
    const weich = 1 - (1 - s) ** 3
    magnet(g, w, platz, TRIKOT.x + (q.x - TRIKOT.x) * weich, TRIKOT.y + (q.y - TRIKOT.y) * weich)
  }
}

function schreibtafel(g: CanvasRenderingContext2D) {
  rundRect(g, 296, 24, 598, 448, 14)
  g.fillStyle = F.tafelRand
  g.fill()
  rundRect(g, 302, 30, 586, 436, 9)
  g.fillStyle = F.tafel
  g.fill()
}

/** Wer gerade drankommt: Name zum Abgucken und Trikot mit Nummer. */
function karte(g: CanvasRenderingContext2D, w: Welt) {
  const s = spielerVon(w)
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = F.text
  g.font = schrift(34, 800)
  g.fillText(s.name, 326, TRIKOT.y, 390)

  const { x, y } = TRIKOT
  g.fillStyle = w.farben.primaer
  for (const seite of [-1, 1]) {
    g.beginPath()
    g.moveTo(x + seite * 34, y - 46)
    g.lineTo(x + seite * 66, y - 20)
    g.lineTo(x + seite * 52, y + 4)
    g.lineTo(x + seite * 34, y - 10)
    g.closePath()
    g.fill()
  }
  rundRect(g, x - 38, y - 46, 76, 98, 10)
  g.fill()
  rundRect(g, x - 16, y - 50, 32, 12, 6)
  g.fillStyle = w.farben.sekundaer
  g.fill()
  text(g, String(s.nummer), x, y + 6, 44, w.farben.sekundaer)
}

/** Lineatur wie im Schulheft, auf Stufe 1 mit Kästchen je Ziffer. */
function lineatur(g: CanvasRenderingContext2D, w: Welt) {
  const b = band(w)
  const x0 = ZEILE.x - 4
  const x1 = ZEILE.x + ZEILE.b + 4
  for (const y0 of new Set(w.zeichen.map((z) => z.y0))) {
    g.fillStyle = F.mittelband
    g.fillRect(x0, y0 + b, x1 - x0, b)
    g.strokeStyle = F.lineatur
    g.lineWidth = 2
    for (let i = 0; i <= 3; i++) {
      g.beginPath()
      g.moveTo(x0, y0 + i * b)
      g.lineTo(x1, y0 + i * b)
      g.stroke()
    }
  }
  if (hilfsbild(w) !== 'dick') return
  for (const z of w.zeichen) g.strokeRect(z.x - 0.12 * b, z.y0, z.breite + 0.24 * b, 2 * b)
}

/** Offene Striche gestrichelt bzw. als Geisterschrift, nachgespurte in der Vereinsfarbe. */
function vorlage(g: CanvasRenderingContext2D, w: Welt) {
  const bild = hilfsbild(w)
  const dick = Math.max(6, band(w) * (bild === 'dick' ? 0.18 : 0.11))
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  w.zeichen.forEach((z, zi) => {
    // Das gerade fertige Zeichen leuchtet kurz auf.
    const puls = zi === w.zeichenNr - 1 ? w.pulsUhr / PULS_SEK : 0
    z.striche.forEach((s, si) => {
      const fertig = w.phase === 'jubel' || zi < w.zeichenNr || (zi === w.zeichenNr && si < w.strichNr)
      const aktiv = !fertig && zi === w.zeichenNr && si === w.strichNr
      if (!fertig) {
        g.globalAlpha = bild === 'geist' ? 0.35 : aktiv ? 1 : zi === w.zeichenNr ? 0.75 : 0.45
        g.strokeStyle = F.vorlage
        g.lineWidth = bild === 'dick' ? dick : dick * 0.75
        g.setLineDash(bild === 'geist' ? [] : [2, g.lineWidth * 1.7])
        linie(g, s)
        g.setLineDash([])
      }
      if (fertig || (aktiv && w.fortschritt > 0)) {
        g.globalAlpha = 1
        g.strokeStyle = w.farben.primaer
        g.lineWidth = dick * (1 + puls * 0.6)
        linie(g, fertig ? s : anfangVon(s, w.fortschritt))
      }
    })
  })
  g.restore()
}

/** Bens Kreide: auf der Vorlage dunkel, daneben hellgrau. In zwei Zügen gezeichnet — ein Aufruf je
 *  Farbe statt je Teilstück, sonst ruckelt es bei langen Namen (A1). */
function kreide(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = 4
  for (const drin of [false, true]) {
    g.strokeStyle = drin ? F.kreide : F.daneben
    g.beginPath()
    for (let i = 1; i < w.kreide.length; i++) {
      const p = w.kreide[i - 1]
      const q = w.kreide[i]
      // `neu` heißt: der Stift war zwischendurch oben. Keine Linie durch die Luft.
      if (q.neu || (p.drin && q.drin) !== drin) continue
      g.moveTo(p.x, p.y)
      g.lineTo(q.x, q.y)
    }
    g.stroke()
  }
  g.restore()
}

/** Der grüne Punkt — die einzige Regel, die Ben kennen muss. Dazu Pfeil, Strichnummer und Ball. */
function startpunkt(g: CanvasRenderingContext2D, w: Welt) {
  const s = aktiverStrich(w)
  const p = spitze(w)
  const hilfe = hilfeVon(w)
  const bild = hilfsbild(w)
  const puls = hilfe === 0 || w.wenigerBewegung ? 0 : 0.5 + 0.5 * Math.sin(w.zeitGesamt * 6)
  const r = Math.max(8, band(w) * 0.14) * (hilfe > 0 ? 1.25 : 1)

  if (hilfe > 0) kreis(g, p.x, p.y, r * (1.5 + 0.6 * puls), 'rgba(34,180,85,0.25)')
  kreis(g, p.x, p.y, r, F.start)
  if (s.length > 1 && (bild === 'dick' || hilfe >= 2)) pfeil(g, w, s, r)
  if (bild === 'dick') text(g, String(w.strichNr + 1), p.x, p.y + 1, r * 1.4, '#ffffff')

  const rest = laenge(s) - w.fortschritt
  if (s.length > 1 && hilfe === 3 && !w.schreibt) {
    // Fährt langsam immer wieder voraus, aber nur solange Ben schaut und nicht schreibt …
    ball(g, s, w.fortschritt + rest * ((w.zeitGesamt % 2.6) / 2.6))
  } else if (s.length > 1 && hilfe === 3) {
    // … beim Schreiben bleibt er ein Stück vor dem Stift, und Ben fährt hinterher.
    ball(g, s, Math.min(laenge(s), w.fortschritt + 0.7 * band(w)))
  } else if (s.length > 1 && w.ballUhr > 0) {
    ball(g, s, w.fortschritt + rest * (1 - w.ballUhr / BALL_SEK))
  }
}

/** Kleiner Pfeil ab der Spitze in Schreibrichtung. */
function pfeil(g: CanvasRenderingContext2D, w: Welt, s: Strich, r: number) {
  const von = punktBei(s, w.fortschritt)
  const nach = punktBei(s, w.fortschritt + 0.25 * band(w))
  const a = Math.atan2(nach.y - von.y, nach.x - von.x)
  g.save()
  g.translate(von.x, von.y)
  g.rotate(a)
  g.fillStyle = F.start
  g.beginPath()
  g.moveTo(r * 2.6, 0)
  g.lineTo(r * 1.4, -r * 0.8)
  g.lineTo(r * 1.4, r * 0.8)
  g.closePath()
  g.fill()
  g.restore()
}

function ball(g: CanvasRenderingContext2D, s: Strich, bei: number) {
  const p = punktBei(s, bei)
  kreis(g, p.x, p.y, 13, F.text)
  kreis(g, p.x, p.y, 11, '#ffffff')
  kreis(g, p.x, p.y, 4.5, F.text)
}

function funken(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  for (const f of w.funken) {
    g.globalAlpha = Math.max(0, f.leben / FUNKEN_SEK)
    kreis(g, f.x, f.y, 5, f.farbe)
  }
  g.restore()
}

/** Die Kurve ruft den Nachnamen, beim Kapitän doppelt. */
function jubel(g: CanvasRenderingContext2D, w: Welt) {
  const name = nachname(spielerVon(w)).toUpperCase()
  const ruf = kaderplatz(w) === kapitaen(w) ? `${name}! ${name}!` : `${name}!`
  g.font = schrift(52, 800)
  // Breite messen statt raten — ein neuer Verein bringt andere Namen mit.
  const px = Math.min(52, (52 * 540) / g.measureText(ruf).width)
  text(g, ruf, 595, 540, px, w.farben.primaer)
}

function tafelSteht(g: CanvasRenderingContext2D) {
  text(g, 'Die Startelf steht!', 595, 250, 52, F.text)
}

/** Der Profi hilft. Nur dann ist er zu sehen — sonst lenkt er vom Schreiben ab (A2). */
function sprechblase(g: CanvasRenderingContext2D, w: Welt, satz: string) {
  // Im Jubel steht unten der Ruf der Kurve; dann rückt die Blase darüber.
  const y = w.phase === 'jubel' ? 440 : 545
  kreis(g, 356, y, 40, w.farben.primaer)
  kreis(g, 356, y - 6, 28, F.haut)
  g.fillStyle = F.haar
  g.beginPath()
  g.arc(356, y - 12, 27, Math.PI, 0)
  g.fill()
  kreis(g, 347, y - 6, 3, F.text)
  kreis(g, 365, y - 6, 3, F.text)
  g.strokeStyle = F.text
  g.lineWidth = 2.5
  g.beginPath()
  g.arc(356, y, 10, 0.2, Math.PI - 0.2)
  g.stroke()

  g.font = schrift(28, 700)
  const breite = g.measureText(satz).width + 48
  g.fillStyle = '#ffffff'
  g.strokeStyle = F.tafelRand
  g.lineWidth = 2
  rundRect(g, 414, y - 34, breite, 68, 20)
  g.fill()
  g.stroke()
  g.beginPath()
  g.moveTo(416, y - 10)
  g.lineTo(400, y)
  g.lineTo(416, y + 10)
  g.fill()
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = F.text
  g.fillText(satz, 438, y + 1)
}
