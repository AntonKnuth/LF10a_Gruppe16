/**
 * Zeichnen der „Stadionführung". Liest nur aus der Welt und verändert sie nie — dadurch bleiben die
 * Regeln in welt.ts ohne Canvas testbar.
 *
 * A2: keine Zahl, kein Balken, keine Stationsnummer. C2: neben der Vorlage wird die Tinte grau,
 * nicht rot — rote Striche an Buchstaben kennt ein Kind aus der Heftkorrektur.
 */

import { zeichneFunken } from '../funken'
import { berechneSicht as sichtFuer, type Sicht } from '../geometrie'
import { anfangVon, laenge, punktBei, type Strich } from '../schrift'
import {
  ABGANG_SEK, FAN_SEK, FUNKEN_SEK, H, PULS_SEK, TAFEL, W, WARTE_TEXT, WORTFELD, aktiverStrich, band,
  faktVon, hilfeVon, spitze, tour, type Welt,
} from './welt'

const F = {
  himmel: '#cfe9fb',
  beton: '#b9c3cf',
  weg: '#d9d2c2',
  rasen: '#7cc46a',
  tafel: '#16222f',
  raster: 'rgba(255,255,255,0.05)',
  vorlage: '#6c7f93',
  aktiv: '#ffffff',
  leuchtet: '#ffd54a',
  tinte: '#4aa3df',
  daneben: '#8794a3',
  start: '#22c45e',
  text: '#1f3550',
  haut: ['#f3c9a0', '#d9a273', '#8d5a3b', '#f0d2b5'],
  haar: ['#6b4423', '#2b2420', '#c99a3c', '#8a8f98'],
  jacke: ['#4f7cac', '#8a6fb0', '#4f9d8a', '#b0825a'],
  hund: '#a8744a',
}

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 700) => `${gewicht} ${px}px ${SCHRIFT}`

/** Auf dieser Höhe stehen die Füße der vorderen Reihe. */
const BODEN = 608

export type { Sicht }

/** Sichtfenster für die Bühne dieses Spiels; gerechnet wird in geometrie.ts. */
export function berechneSicht(breite: number, hoehe: number): Sicht {
  return sichtFuer(breite, hoehe, W, H)
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
  // Hintergrund in Canvas-Koordinaten: sonst endet das Stadion an der Bühnenkante.
  g.setTransform(1, 0, 0, 1, 0, 0)
  const streifen = (vonY: number, farbe: string) => {
    const y = sicht.dy + vonY * sicht.s
    g.fillStyle = farbe
    g.fillRect(0, y, breite, hoehe - y)
  }
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, hoehe)
  streifen(392, F.beton)
  streifen(398, w.farben.primaer)
  streifen(420, w.farben.sekundaer)
  streifen(440, w.farben.primaer)
  streifen(462, F.beton)
  streifen(470, F.weg)
  streifen(BODEN + 14, F.rasen)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  tafel(g, w)
  vorlage(g, w)
  tinte(g, w)
  if (w.phase === 'schreiben') startpunkt(g, w)
  if (w.phase === 'fakt') fakt(g, w)
  zeichneFunken(g, w.funken, FUNKEN_SEK)
  gruppe(g, w)
  fuehrer(g, w)
  if (w.blase) sprechblase(g, w)
}

function tafel(g: CanvasRenderingContext2D, w: Welt) {
  const { x, y, b, h } = TAFEL
  // Zwei Pfosten bis in die Tribüne.
  g.fillStyle = F.beton
  g.fillRect(x + 120, y + h, 22, 60)
  g.fillRect(x + b - 142, y + h, 22, 60)
  rundRect(g, x, y, b, h, 18)
  g.fillStyle = w.farben.primaer
  g.fill()
  rundRect(g, x + 10, y + 10, b - 20, h - 20, 10)
  g.fillStyle = F.tafel
  g.fill()
  // Das Raster einer Anzeigetafel, nur angedeutet.
  g.fillStyle = F.raster
  for (let i = x + 30; i < x + b - 20; i += 20) g.fillRect(i, y + 10, 1, h - 20)
  for (let i = y + 30; i < y + h - 20; i += 20) g.fillRect(x + 10, i, b - 20, 1)
}

/** Offene Striche gestrichelt, der aktive weiß; nachgespurte leuchten. */
function vorlage(g: CanvasRenderingContext2D, w: Welt) {
  const dick = Math.max(8, band(w) * 0.2)
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  w.zeichen.forEach((z, zi) => {
    // Das gerade fertige Zeichen leuchtet kurz auf, am Wortende das ganze Wort.
    const puls = zi === w.zeichenNr - 1 || w.phase !== 'schreiben' ? w.pulsUhr / PULS_SEK : 0
    z.striche.forEach((s, si) => {
      const fertig =
        w.phase !== 'schreiben' || zi < w.zeichenNr || (zi === w.zeichenNr && si < w.strichNr)
      const aktiv = !fertig && zi === w.zeichenNr && si === w.strichNr
      if (!fertig) {
        g.globalAlpha = aktiv || zi === w.zeichenNr ? 1 : 0.6
        g.strokeStyle = aktiv ? F.aktiv : F.vorlage
        g.lineWidth = dick * 0.45
        g.setLineDash([2, g.lineWidth * 1.8])
        linie(g, s)
        g.setLineDash([])
      }
      if (fertig || (aktiv && w.fortschritt > 0)) {
        g.globalAlpha = 1
        g.strokeStyle = F.leuchtet
        g.lineWidth = dick * (1 + puls * 0.6)
        linie(g, fertig ? s : anfangVon(s, w.fortschritt))
      }
    })
  })
  g.restore()
}

const BREITEN = 8
const stufeVon = (druck: number) => Math.min(BREITEN - 1, Math.max(0, Math.floor(druck * BREITEN)))

/**
 * Bens Tinte. Die Breite ist der Druck: ungleichmäßiges Drücken sieht man an der Linie selbst, ohne
 * Anzeige daneben. In wenigen Zügen gezeichnet — ein Aufruf je Breite und Farbe statt je Teilstück,
 * sonst ruckelt es bei langen Wörtern (A1).
 */
function tinte(g: CanvasRenderingContext2D, w: Welt) {
  if (w.phase !== 'schreiben') return
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const drin of [false, true]) {
    g.strokeStyle = drin ? F.tinte : F.daneben
    for (let stufe = 0; stufe < BREITEN; stufe++) {
      g.lineWidth = 3 + (7 * (stufe + 0.5)) / BREITEN
      g.beginPath()
      for (let i = 1; i < w.tinte.length; i++) {
        const p = w.tinte[i - 1]
        const q = w.tinte[i]
        // `neu` heißt: der Stift war zwischendurch oben. Keine Linie durch die Luft.
        if (q.neu || stufeVon(q.druck) !== stufe || (p.drin && q.drin) !== drin) continue
        g.moveTo(p.x, p.y)
        g.lineTo(q.x, q.y)
      }
      g.stroke()
    }
  }
  g.restore()
}

/** Der grüne Punkt mit Pfeil: hier ansetzen, dorthin fahren. Bei Bedarf rollt ein Ball vor. */
function startpunkt(g: CanvasRenderingContext2D, w: Welt) {
  const s = aktiverStrich(w)
  const p = spitze(w)
  const hilfe = hilfeVon(w)
  const r = Math.max(9, band(w) * 0.16)
  if (hilfe > 0) {
    const puls = w.wenigerBewegung ? 0.5 : 0.5 + 0.5 * Math.sin(w.zeitGesamt * 6)
    kreis(g, p.x, p.y, r * (1.6 + 0.8 * puls), 'rgba(34,196,94,0.35)')
  }
  kreis(g, p.x, p.y, r, F.start)
  if (s.length > 1) {
    const nach = punktBei(s, w.fortschritt + 0.25 * band(w))
    g.save()
    g.translate(p.x, p.y)
    g.rotate(Math.atan2(nach.y - p.y, nach.x - p.x))
    g.fillStyle = F.start
    g.beginPath()
    g.moveTo(r * 2.5, 0)
    g.lineTo(r * 1.35, -r * 0.8)
    g.lineTo(r * 1.35, r * 0.8)
    g.closePath()
    g.fill()
    g.restore()
  }
  if (hilfe === 2 && !w.schreibt && s.length > 1) {
    const rest = laenge(s) - w.fortschritt
    const q = punktBei(s, w.fortschritt + rest * ((w.zeitGesamt % 2.6) / 2.6))
    kreis(g, q.x, q.y, 13, F.text)
    kreis(g, q.x, q.y, 11, '#ffffff')
    kreis(g, q.x, q.y, 4.5, F.text)
  }
}

/** Der ganze Fakt unter dem Wort. Umgebrochen nach gemessener Breite: ein neuer Verein bringt
 *  andere Sätze mit. */
function fakt(g: CanvasRenderingContext2D, w: Welt) {
  g.font = schrift(28)
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const zeilen: string[] = []
  let zeile = ''
  for (const wort of faktVon(w).text.split(' ')) {
    const laenger = zeile ? `${zeile} ${wort}` : wort
    if (zeile && g.measureText(laenger).width > WORTFELD.b) {
      zeilen.push(zeile)
      zeile = wort
    } else zeile = laenger
  }
  zeilen.push(zeile)
  const mitte = (WORTFELD.y + WORTFELD.h + TAFEL.y + TAFEL.h) / 2
  zeilen.forEach((z, i) => g.fillText(z, W / 2, mitte + (i - (zeilen.length - 1) / 2) * 38))
}

/* ── Figuren ───────────────────────────────────────────────────────────── */

/** Alle Figuren sind gleich gebaut: Beine, Rumpf, Kopf. `blick` verschiebt die Augen (−1 bis 1). */
function figur(
  g: CanvasRenderingContext2D, x: number, y: number, jacke: string, nr: number, blick: number,
) {
  g.fillStyle = F.text
  g.fillRect(x - 10, y - 18, 7, 18)
  g.fillRect(x + 3, y - 18, 7, 18)
  rundRect(g, x - 15, y - 56, 30, 42, 11)
  g.fillStyle = jacke
  g.fill()
  kreis(g, x, y - 69, 16, F.haut[nr % F.haut.length])
  g.fillStyle = F.haar[nr % F.haar.length]
  g.beginPath()
  g.arc(x, y - 72, 16, Math.PI, 0)
  g.fill()
  kreis(g, x - 5 + blick * 7, y - 68, 2.8, F.text)
  kreis(g, x + 6 + blick * 7, y - 68, 2.8, F.text)
}

/** Die Gruppe hinter dem Stadionführer. Niemand verschwindet je, auch nicht bei falschem Tempo. */
function gruppe(g: CanvasRenderingContext2D, w: Welt) {
  const freut = (w.phase === 'fakt' && w.uhr > ABGANG_SEK) || w.phase === 'schluss'
  const ruft = w.tempo === 'zuSchnell' || w.blase?.text === WARTE_TEXT
  const schautSichUm = w.tempo === 'zuLangsam'
  const runde = tour(w)

  // Ab der zweiten Runde läuft ein Hund mit.
  if (runde >= 1) hund(g, w.gruppeX - Math.ceil(w.besucher / 2) * 48 - 30, BODEN)

  // Hintere Reihe zuerst.
  for (const reihe of [1, 0]) {
    for (let i = 0; i < w.besucher; i++) {
      if (i % 2 !== reihe) continue
      // Der neue Besucher läuft von rechts zur Gruppe.
      const kommt = i === w.besucher - 1 ? w.fanUhr / FAN_SEK : 0
      const x = w.gruppeX - Math.floor(i / 2) * 48 - reihe * 24 + kommt * (W - w.gruppeX + 250)
      const huepft = freut && !w.wenigerBewegung ? Math.abs(Math.sin(w.zeitGesamt * 5 + i)) * 12 : 0
      const y = BODEN - reihe * 26 - huepft
      figur(g, x, y, F.jacke[i % F.jacke.length], i, schautSichUm ? (i % 2 ? 1 : -1) : 0.4)

      // Schal, abwechselnd in beiden Vereinsfarben.
      rundRect(g, x - 14, y - 56, 28, 9, 4)
      g.fillStyle = i % 4 < 2 ? w.farben.primaer : w.farben.sekundaer
      g.fill()
      g.fillRect(x + 4, y - 52, 8, 22)

      // Beim Umschauen zeigt jeder zweite auf die Tribüne.
      const zeigt = schautSichUm && i % 2 === 1
      if (freut || ruft || zeigt) arm(g, x, y, F.jacke[i % F.jacke.length])
      // Ab der dritten Runde haben sie Fähnchen dabei.
      if (runde >= 2 && i % 3 === 0) faehnchen(g, x - 16, y - 40, 34, 24, 16, w.farben.primaer, 0)
    }
  }
}

/** Ein gehobener Arm: Jubel, Zeigen oder „Warte!". */
function arm(g: CanvasRenderingContext2D, x: number, y: number, farbe: string) {
  g.save()
  g.strokeStyle = farbe
  g.lineWidth = 8
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x + 12, y - 48)
  g.lineTo(x + 23, y - 72)
  g.stroke()
  g.restore()
}

function hund(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = F.hund
  for (const dx of [-16, -8, 10, 18]) g.fillRect(x + dx - 3, y - 14, 6, 14)
  rundRect(g, x - 22, y - 32, 44, 22, 10)
  g.fill()
  kreis(g, x + 24, y - 36, 13, F.hund)
  kreis(g, x + 28, y - 38, 2.4, F.text)
  kreis(g, x + 37, y - 34, 3.4, F.text)
  g.fillStyle = F.hund
  g.fillRect(x - 28, y - 42, 6, 18)
}

/** `wehen`: 0 hängt das Tuch, 1 steht es waagerecht nach hinten. */
function faehnchen(
  g: CanvasRenderingContext2D, x: number, y: number, stab: number, b: number, h: number,
  farbe: string, wehen: number,
) {
  g.strokeStyle = F.text
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - stab)
  g.stroke()
  // Am Stab bleibt das Tuch fest, nur die Spitze hebt sich.
  const haengt = (1 - wehen) * 0.9
  g.fillStyle = farbe
  g.beginPath()
  g.moveTo(x, y - stab)
  g.lineTo(x - b * Math.cos(haengt), y - stab + h / 2 + b * Math.sin(haengt))
  g.lineTo(x, y - stab + h)
  g.closePath()
  g.fill()
}

/** Ben als Stadionführer. Seine Fahne weht ohne Schwelle mit dem Tempo — die schnellste Rückmeldung
 *  zum Tempo (A1), während die Besucher bewusst erst nach einer Weile reagieren. */
function fuehrer(g: CanvasRenderingContext2D, w: Welt) {
  const x = w.fuehrerX
  figur(g, x, BODEN, w.farben.primaer, 2, 0.8)
  rundRect(g, x - 17, BODEN - 92, 34, 9, 4)
  g.fillStyle = w.farben.primaer
  g.fill()
  g.fillRect(x + 6, BODEN - 86, 20, 5)
  arm(g, x, BODEN, w.farben.primaer)
  const wehen = Math.min(1, w.v / (2 * w.vorgaben.zielTempo))
  faehnchen(g, x + 23, BODEN - 66, 62, 46, 30, w.farben.primaer, wehen)
}

/** Besucher sprechen über der Gruppe, der Stadionsprecher unter der Tafel. */
function sprechblase(g: CanvasRenderingContext2D, w: Welt) {
  const blase = w.blase!
  g.font = schrift(28)
  const breite = g.measureText(blase.text).width + 48
  const vonGruppe = blase.wer === 'gruppe'
  const spitzeX = Math.max(60, w.gruppeX - 40)
  const x = vonGruppe ? Math.max(20, Math.min(W - 20 - breite, spitzeX - breite / 2)) : (W - breite) / 2
  const y = vonGruppe ? 420 : 384
  g.fillStyle = '#ffffff'
  g.strokeStyle = F.text
  g.lineWidth = 2
  rundRect(g, x, y, breite, 56, 18)
  g.fill()
  g.stroke()
  if (vonGruppe) {
    g.beginPath()
    g.moveTo(spitzeX - 12, y + 55)
    g.lineTo(spitzeX, y + 80)
    g.lineTo(spitzeX + 12, y + 55)
    g.fill()
  }
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = F.text
  g.fillText(blase.text, x + 24, y + 29)
}
