/**
 * Zeichnen von „Ball hochhalten". Liest nur aus der Welt und verändert sie nicht —
 * dadurch bleibt die Physik in welt.ts ohne Canvas testbar.
 */

import { tastenDruckWert } from '../../eingabe'
import {
  BODEN_Y, DECKE_Y, H, REICHWEITE, W,
  helligkeit, inReichweite, klemme, komboMulti, kraftAus, mischeFarbe, vorhersage,
  type Ballon, type Deko, type Teilchen, type Welt,
} from './welt'

const F = {
  himmelOben: '#7ecdfb', himmelUnten: '#dff3ff',
  wolke: '#ffffff', wolkeSchatten: '#e8f4fd',
  // Rasen gedämpfter als der Rest der App: unter einer Stadionkulisse wirkt Neongrün falsch.
  gras: '#3f9d1e', grasHell: '#4cb327',
  violett: '#a855f7', violettTief: '#7c34c9',
  gold: '#ffc800', rot: '#ff4b4b',
  tinte: '#3b4a5a',
  ballSchatten: '#e9f0f9', panel: '#7f93b8', panelHell: '#a6b5d0',
}

/** Unterkante des Tribünendachs — darüber ist Himmel, darunter Ränge. */
const DACH_Y = 138
/** Oberkante der Bande am Spielfeldrand. */
const BANDE_Y = 500

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 600) => `${gewicht} ${px}px ${SCHRIFT}`

/** Sichtfenster: Maßstab und Rand, damit die 900×640-Bühne mittig ins Canvas passt. */
export type Sicht = { s: number; dx: number; dy: number }

export function berechneSicht(breite: number, hoehe: number): Sicht {
  const s = Math.min(breite / W, hoehe / H)
  return { s, dx: (breite - W * s) / 2, dy: (hoehe - H * s) / 2 }
}

/* ── Formhelfer ────────────────────────────────────────────────────────── */
function kreis(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
}

function rundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number) {
  // Rand außerhalb der Bühne: oben Himmel, unten Rasen. Sonst steht unter dem
  // Spielfeld ein blauer Streifen, sobald das Canvas nicht 900×640 ist.
  g.setTransform(1, 0, 0, 1, 0, 0)
  const rasenKante = sicht.dy + BODEN_Y * sicht.s
  g.fillStyle = F.himmelOben
  g.fillRect(0, 0, breite, rasenKante)
  g.fillStyle = F.gras
  g.fillRect(0, rasenKante, breite, hoehe - rasenKante)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  if (w.ruettel > 0) {
    g.translate((Math.random() * 2 - 1) * w.ruettel, (Math.random() * 2 - 1) * w.ruettel)
  }
  g.save()
  g.beginPath()
  g.rect(0, 0, W, H)
  g.clip()

  kulisse(g, w)
  wolken(g, w)
  zuschauer(g, w)
  anzeigetafel(g, w)
  band(g, w)
  for (const b of w.ballons) ballon(g, w, b)
  boden(g, w)
  laden(g, w)
  ball(g, w)
  hinweis(g, w)
  effekte(g, w)
  ersatzDruck(g, w)

  if (w.blitz > 0) {
    g.globalAlpha = klemme(w.blitz * 1.4, 0, 0.45)
    g.fillStyle = w.blitzFarbe
    g.fillRect(0, 0, W, H)
    g.globalAlpha = 1
  }
  g.restore()
}

/* ── Kulisse: das Stadion dieses Vereins ───────────────────────────────────
   Alles hier hängt nur an `w.deko`. Ein neuer Verein bringt seine eigene Kulisse
   mit, ohne dass diese Datei angefasst wird — der Verein bleibt ein Datenpaket. */

let kulisseBild: HTMLCanvasElement | null = null
let kulisseSchluessel = ''

/**
 * Die Kulisse ändert sich während eines Spiels nie. Sie wird einmal je Verein in ein
 * eigenes Canvas gezeichnet und danach nur noch kopiert — über tausend Sitzschalen bei
 * jedem Bild neu zu zeichnen würde genau das Zeitbudget kosten, das A1 braucht.
 */
function kulisse(g: CanvasRenderingContext2D, w: Welt) {
  const d = w.deko
  const schluessel = `${d.primaer}|${d.sekundaer}|${d.name}`
  if (!kulisseBild || kulisseSchluessel !== schluessel) {
    kulisseBild = document.createElement('canvas')
    kulisseBild.width = W
    kulisseBild.height = H
    const k = kulisseBild.getContext('2d')
    if (!k) return
    baueKulisse(k, d)
    kulisseSchluessel = schluessel
  }
  g.drawImage(kulisseBild, 0, 0)
}

function baueKulisse(g: CanvasRenderingContext2D, d: Deko) {
  const himmel = g.createLinearGradient(0, 0, 0, DACH_Y + 40)
  himmel.addColorStop(0, F.himmelOben)
  himmel.addColorStop(1, F.himmelUnten)
  g.fillStyle = himmel
  g.fillRect(0, 0, W, DACH_Y + 40)

  g.fillStyle = 'rgba(255,243,196,.85)'
  kreis(g, 792, 64, 44)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,.55)'
  kreis(g, 792, 64, 30)
  g.fill()

  // Links bleibt Platz für die Anzeigetafel.
  flutlicht(g, 340)
  flutlicht(g, 772)
  raenge(g, d)
  dach(g, d)
  bande(g, d)
}

/** Flutlichtmast. Steht hinter dem Dach, ragt in den Himmel. */
function flutlicht(g: CanvasRenderingContext2D, x: number) {
  const schein = g.createRadialGradient(x, 62, 8, x, 62, 96)
  schein.addColorStop(0, 'rgba(255,252,214,.4)')
  schein.addColorStop(1, 'rgba(255,252,214,0)')
  g.fillStyle = schein
  kreis(g, x, 62, 96)
  g.fill()

  g.strokeStyle = '#9aa7b4'
  g.lineWidth = 9
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x, DACH_Y + 26)
  g.lineTo(x, 76)
  g.stroke()
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(x - 15, 122); g.lineTo(x + 15, 100)
  g.moveTo(x - 15, 100); g.lineTo(x + 15, 122)
  g.stroke()

  g.fillStyle = '#8d9aa8'
  rundRect(g, x - 40, 40, 80, 30, 6)
  g.fill()
  g.fillStyle = 'rgba(255,250,214,.95)'
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      kreis(g, x - 28 + i * 19, 49 + j * 13, 6)
      g.fill()
    }
  }
}

/** Ober- und Unterrang in Vereinsfarben, getrennt durch den dunklen Umlauf. */
function raenge(g: CanvasRenderingContext2D, d: Deko) {
  g.fillStyle = d.tief
  g.fillRect(0, DACH_Y, W, BANDE_Y - DACH_Y)
  g.fillStyle = mischeFarbe(d.tief, '#000000', 0.4)
  g.fillRect(0, 246, W, 30)
  g.fillStyle = 'rgba(255,255,255,.07)'
  g.fillRect(0, 272, W, 3)

  // Die Blöcke wechseln die Farbe — das gibt das Streifenmuster einer Kurve in
  // Vereinsfarben, ohne ein einziges Bild zu laden.
  const hell = mischeFarbe(d.dunkel, d.sekundaer, 0.45)
  for (const p of plaetze()) {
    g.fillStyle = (Math.floor(p.spalte / 6) + Math.floor(p.reihe / 4)) % 2 ? hell : d.dunkel
    rundRect(g, p.x, p.y, p.b, p.h, 3)
    g.fill()
  }

  // Schleier über den ganzen Rängen: die Vereinsfarbe bleibt erkennbar, aber der
  // Hintergrund tritt zurück, damit Ball und Zielband davor nicht untergehen.
  g.fillStyle = 'rgba(10,16,24,.16)'
  g.fillRect(0, DACH_Y, W, BANDE_Y - DACH_Y)
}

/* ── Zuschauer ─────────────────────────────────────────────────────────────
   Der Punktestand ist die Tribüne: mit jedem Treffer kommen Fans dazu. Ben muss
   dafür keine Zahl lesen — er sieht sein Stadion voller werden (C4). */

type Platz = { x: number; y: number; b: number; h: number; reihe: number; spalte: number; ordnung: number }

let platzListe: Platz[] | null = null

/**
 * Alle Sitzplätze beider Ränge, in fester Streureihenfolge. Neue Fans tauchen dadurch
 * über die ganze Tribüne verteilt auf statt von links nach rechts — und weil die
 * Reihenfolge deterministisch ist, springen die schon sitzenden nie um.
 */
function plaetze(): Platz[] {
  if (platzListe) return platzListe
  const alle: Platz[] = []
  sammlePlaetze(alle, DACH_Y + 28, 246, 13, 8)
  sammlePlaetze(alle, 286, BANDE_Y - 8, 16, 11)
  platzListe = [...alle].sort((a, b) => a.ordnung - b.ordnung)
  return platzListe
}

function sammlePlaetze(ziel: Platz[], oben: number, unten: number, breite: number, hoehe: number) {
  const spalten = Math.ceil(W / (breite + 3))
  for (let y = oben, reihe = 0; y + hoehe <= unten; y += hoehe + 3, reihe++) {
    for (let spalte = 0; spalte < spalten; spalte++) {
      // Jede zwölfte Spalte bleibt frei: das ist der Aufgang zwischen den Blöcken.
      if (spalte % 12 === 11) continue
      const s = Math.sin((ziel.length + 1) * 12.9898) * 43758.5453
      ziel.push({
        x: spalte * (breite + 3) + 2, y, b: breite, h: hoehe, reihe, spalte,
        ordnung: s - Math.floor(s),
      })
    }
  }
}

let fanBilder: { ruhe: HTMLCanvasElement; jubel: HTMLCanvasElement } | null = null
let fanSchluessel = ''

/**
 * Zwei fertige Zuschauer-Ebenen — sitzend und jubelnd. Die Welle ist danach nur ein
 * Ausschnitt aus der Jubel-Ebene: zwei `drawImage` statt tausend Pfaden je Bild.
 * Neu gebaut wird nur, wenn sich die Besetzung ändert, also ein paar Mal pro Spiel.
 */
function fanEbenen(w: Welt) {
  const liste = plaetze()
  const anzahl = Math.round(klemme(w.fanAnteil, 0, 1) * liste.length)
  const schluessel = `${w.deko.primaer}|${w.deko.sekundaer}|${anzahl}`
  if (!fanBilder || fanSchluessel !== schluessel) {
    const farben = [
      w.deko.sekundaer,
      mischeFarbe(w.deko.primaer, '#ffffff', 0.45),
      '#f0c9a4',
      mischeFarbe(w.deko.sekundaer, '#f0c9a4', 0.5),
    ]
    const male = (jubelt: boolean) => {
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      const k = cv.getContext('2d')
      if (k) for (let i = 0; i < anzahl; i++) fan(k, liste[i], farben[i % farben.length], jubelt)
      return cv
    }
    fanBilder = { ruhe: male(false), jubel: male(true) }
    fanSchluessel = schluessel
  }
  return fanBilder
}

/** Ein Zuschauer als Silhouette. Beim Jubel steht er auf und reißt die Arme hoch. */
function fan(g: CanvasRenderingContext2D, p: Platz, farbe: string, jubelt: boolean) {
  const r = p.h * 0.5
  const x = p.x + p.b / 2
  const y = p.y + p.h * (jubelt ? 0.12 : 0.5)
  g.fillStyle = farbe
  g.beginPath()
  g.arc(x, y - r * 1.2, r * 0.62, 0, 6.3)
  g.moveTo(x - r, y + r)
  g.quadraticCurveTo(x - r * 0.95, y - r * 0.45, x, y - r * 0.5)
  g.quadraticCurveTo(x + r * 0.95, y - r * 0.45, x + r, y + r)
  g.closePath()
  if (jubelt) {
    for (const s of [-1, 1]) {
      g.moveTo(x + s * r * 0.75, y - r * 0.2)
      g.lineTo(x + s * r * 1.5, y - r * 2)
      g.lineTo(x + s * r * 1.05, y - r * 2.1)
      g.lineTo(x + s * r * 0.3, y - r * 0.45)
      g.closePath()
    }
  }
  g.fill()
}

function zuschauer(g: CanvasRenderingContext2D, w: Welt) {
  const e = fanEbenen(w)
  g.drawImage(e.ruhe, 0, 0)

  // Aufstehen und jubeln gibt es nur einmal: nach dem Abpfiff, als La Ola durch das
  // ganze Stadion. Während des Spiels bleiben die Ränge ruhig.
  if (w.abpfiff && w.welle > 0) {
    jubelnd(g, e.jubel, ((w.welle % 1) * (W + 460)) - 230, 150)
  }
}

/** Blendet einen senkrechten Streifen der Jubel-Ebene ein. */
function jubelnd(g: CanvasRenderingContext2D, bild: HTMLCanvasElement, x: number, halb: number) {
  g.save()
  g.beginPath()
  g.rect(x - halb, DACH_Y, halb * 2, BANDE_Y - DACH_Y)
  g.clip()
  g.drawImage(bild, 0, 0)
  g.restore()
}

/**
 * Anzeigetafel auf dem Dach: Punkte und laufende Serie. Ersetzt die schwebende
 * Punktepille — im Stadion steht die Zahl auf der Tafel, nicht in der Luft.
 */
function anzeigetafel(g: CanvasRenderingContext2D, w: Welt) {
  const x = 22, y = 40, b = 250, h = 88
  g.strokeStyle = '#8d9aa8'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(x + 46, y + h); g.lineTo(x + 46, DACH_Y)
  g.moveTo(x + b - 46, y + h); g.lineTo(x + b - 46, DACH_Y)
  g.stroke()

  g.fillStyle = 'rgba(12,18,26,.92)'
  rundRect(g, x, y, b, h, 12)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,.28)'
  g.lineWidth = 3
  g.stroke()

  stern(g, x + 34, y + 32, 15)
  g.font = schrift(34, 800)
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = '#ffd75e'
  g.fillText(String(w.punkte), x + 58, y + 34)

  g.font = schrift(19, 700)
  if (w.abpfiff) {
    // Nach dem Pfiff bleibt der Endstand stehen — dafür sind die vier Sekunden da.
    g.fillStyle = '#ffd75e'
    g.fillText('ENDSTAND', x + 18, y + 68)
  } else if (w.kombo >= 2) {
    g.fillStyle = '#4fe08a'
    g.fillText(`Serie ${w.kombo}  ·  x${komboMulti(w.kombo)}`, x + 18, y + 68)
  } else {
    g.fillStyle = 'rgba(255,255,255,.3)'
    g.fillText('Serie —', x + 18, y + 68)
  }
}

function dach(g: CanvasRenderingContext2D, d: Deko) {
  g.fillStyle = mischeFarbe(d.tief, '#000000', 0.3)
  g.fillRect(0, DACH_Y - 6, W, 24)
  g.fillStyle = 'rgba(255,255,255,.16)'
  g.fillRect(0, DACH_Y + 16, W, 4)

  // Schatten unter dem Dach: hält den oberen Spielbereich ruhig, damit Ball und
  // Zielband davor lesbar bleiben (die Frage nach dem Beißen mit dem Hintergrund).
  const schatten = g.createLinearGradient(0, DACH_Y + 20, 0, DACH_Y + 150)
  schatten.addColorStop(0, 'rgba(0,0,0,.45)')
  schatten.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = schatten
  g.fillRect(0, DACH_Y + 20, W, 130)
}

/** Bandenwerbung am Spielfeldrand: Wappen und Vereinsname. */
function bande(g: CanvasRenderingContext2D, d: Deko) {
  const h = BODEN_Y - BANDE_Y
  const mitte = BANDE_Y + h / 2
  g.fillStyle = d.primaer
  g.fillRect(0, BANDE_Y, W, h)
  g.fillStyle = mischeFarbe(d.primaer, '#ffffff', 0.3)
  g.fillRect(0, BANDE_Y, W, 5)
  g.fillStyle = mischeFarbe(d.primaer, '#000000', 0.4)
  g.fillRect(0, BODEN_Y - 6, W, 6)

  wappen(g, d, 58, mitte, 20)
  wappen(g, d, W - 58, mitte, 20)

  g.font = schrift(30, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = lesbar(d.primaer, d.sekundaer)
  g.fillText(d.name.toUpperCase(), W / 2, mitte + 1)
}

/**
 * Vereinswappen: Schild mit Kürzel, wie die Nadel auf dem Startbildschirm. Sobald es
 * echte Wappenbilder gibt, wird hier ein Bild gezeichnet — der Verein bleibt Daten.
 */
function wappen(g: CanvasRenderingContext2D, d: Deko, x: number, y: number, r: number) {
  g.save()
  g.translate(x, y)
  g.beginPath()
  g.moveTo(-r, -r * 1.2)
  g.lineTo(r, -r * 1.2)
  g.lineTo(r, r * 0.35)
  g.quadraticCurveTo(r * 0.85, r * 1.2, 0, r * 1.45)
  g.quadraticCurveTo(-r * 0.85, r * 1.2, -r, r * 0.35)
  g.closePath()
  g.fillStyle = d.sekundaer
  g.fill()
  g.save()
  g.clip()
  g.fillStyle = d.primaer
  g.fillRect(-r, -r * 0.28, r * 2, r * 0.86)
  g.restore()
  g.lineWidth = 3
  g.strokeStyle = mischeFarbe(d.primaer, '#000000', 0.35)
  g.stroke()

  g.font = schrift(Math.round(r * 0.72), 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = lesbar(d.primaer, d.sekundaer)
  g.fillText(d.kuerzel, 0, r * 0.14)
  g.restore()
}

/**
 * Schriftfarbe, die auf `hintergrund` sicher lesbar ist. Ohne das wäre der Vereinsname
 * bei einem Verein mit hellen Farben unsichtbar — und es kommen noch Vereine dazu.
 */
function lesbar(hintergrund: string, wunsch: string) {
  if (Math.abs(helligkeit(hintergrund) - helligkeit(wunsch)) > 0.35) return wunsch
  return helligkeit(hintergrund) > 0.5 ? '#16202c' : '#ffffff'
}

/** Wolken ziehen nur über der Dachkante — darunter ist Tribüne. */
function wolken(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.beginPath()
  g.rect(0, 0, W, DACH_Y - 6)
  g.clip()
  for (const c of w.wolken) wolke(g, c.x, c.y, c.s)
  g.restore()
}

function wolke(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  g.fillStyle = F.wolkeSchatten
  kreis(g, 0, 8, 30); g.fill()
  kreis(g, 34, 12, 24); g.fill()
  kreis(g, -32, 12, 22); g.fill()
  g.fillStyle = F.wolke
  kreis(g, 0, 0, 30); g.fill()
  kreis(g, 32, 6, 23); g.fill()
  kreis(g, -30, 7, 21); g.fill()
  kreis(g, 14, -16, 20); g.fill()
  g.restore()
}

/**
 * Spielfeld: gemähte Bahnen, Seitenlinie, Mittellinie und Anstoßkreis. Von der Seite
 * gesehen laufen die Bahnen waagerecht und werden nach hinten schmaler.
 */
function boden(g: CanvasRenderingContext2D, _w: Welt) {
  const tiefe = H - BODEN_Y
  g.fillStyle = F.gras
  g.fillRect(0, BODEN_Y, W, tiefe)

  // Bahnen: hinten schmal, vorn breit — das gibt die Tiefe ohne echte Perspektive.
  const kanten = [0, 12, 28, 48, tiefe]
  for (let i = 0; i < kanten.length - 1; i++) {
    if (i % 2) continue
    g.fillStyle = F.grasHell
    g.fillRect(0, BODEN_Y + kanten[i], W, kanten[i + 1] - kanten[i])
  }

  g.strokeStyle = 'rgba(255,255,255,.8)'
  g.lineCap = 'butt'
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(0, BODEN_Y + 7)
  g.lineTo(W, BODEN_Y + 7)
  g.stroke()

  g.lineWidth = 3
  g.beginPath()
  g.moveTo(W / 2, BODEN_Y + 7)
  g.lineTo(W / 2, H)
  g.stroke()
  g.beginPath()
  g.ellipse(W / 2, H + 6, 150, 42, 0, Math.PI, 0)
  g.stroke()

  g.fillStyle = 'rgba(0,0,0,.14)'
  g.fillRect(0, BODEN_Y, W, 4)
}

/* ── Zielband ──────────────────────────────────────────────────────────── */
function band(g: CanvasRenderingContext2D, w: Welt) {
  const y = w.band.y, h = w.band.h
  const oben = y - h / 2, unten = y + h / 2

  g.fillStyle = 'rgba(168,88,247,.16)'
  g.fillRect(0, oben, W, h)

  g.save()
  g.beginPath()
  g.rect(0, oben, W, h)
  g.clip()
  g.strokeStyle = 'rgba(168,88,247,.13)'
  g.lineWidth = 10
  const versatz = (w.t * 26) % 44
  for (let x = -h - 60 + versatz; x < W + h; x += 44) {
    g.beginPath()
    g.moveTo(x, unten)
    g.lineTo(x + h, oben)
    g.stroke()
  }
  g.restore()

  /* Goldener Kern: doppelte Punkte */
  const kh = h * 0.34
  const kern = g.createLinearGradient(0, y - kh / 2, 0, y + kh / 2)
  kern.addColorStop(0, 'rgba(255,200,0,0)')
  kern.addColorStop(0.5, 'rgba(255,200,0,.42)')
  kern.addColorStop(1, 'rgba(255,200,0,0)')
  g.fillStyle = kern
  g.fillRect(0, y - kh / 2, W, kh)

  g.strokeStyle = 'rgba(255,200,0,.85)'
  g.lineWidth = 2
  g.setLineDash([9, 9])
  g.lineDashOffset = -w.t * 34
  g.beginPath()
  g.moveTo(0, y)
  g.lineTo(W, y)
  g.stroke()

  g.strokeStyle = F.violett
  g.lineWidth = 4
  g.lineCap = 'round'
  g.setLineDash([18, 13])
  g.lineDashOffset = w.t * 22
  for (const ky of [oben, unten]) {
    g.beginPath()
    g.moveTo(0, ky)
    g.lineTo(W, ky)
    g.stroke()
  }
  g.setLineDash([])

  schild(g, 46, y, 'ZONE', F.violett, '#fff')
  schild(g, W - 46, y, 'x2', F.gold, '#5a4200')
}

function schild(g: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, vg: string) {
  g.font = schrift(17)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const b = g.measureText(text).width + 24
  g.fillStyle = bg
  rundRect(g, x - b / 2, y - 14, b, 28, 14)
  g.fill()
  g.fillStyle = vg
  g.fillText(text, x, y + 1)
}

/* ── Ballons ───────────────────────────────────────────────────────────── */
function ballon(g: CanvasRenderingContext2D, w: Welt, b: Ballon) {
  g.save()
  g.translate(b.x, b.y)
  g.rotate(Math.sin(w.t * 1.1 + b.ph) * 0.12)
  g.strokeStyle = 'rgba(255,255,255,.75)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(0, b.r)
  g.quadraticCurveTo(10, b.r + 26, -6, b.r + 52)
  g.stroke()
  g.fillStyle = b.farbe
  g.beginPath()
  if (b.wappen) herz(g, b.r)
  else g.ellipse(0, 0, b.r * 0.88, b.r, 0, 0, 6.3)
  g.fill()
  if (b.wappen) {
    // Heller Rand: der Ballon fliegt auch vor der Bande und muss sich davon absetzen.
    g.strokeStyle = 'rgba(255,255,255,.9)'
    g.lineWidth = 3
    g.lineJoin = 'round'
    g.stroke()
  }
  g.beginPath()
  g.moveTo(-5, b.r * 0.92)
  g.lineTo(5, b.r * 0.92)
  g.lineTo(0, b.r + 8)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,255,255,.45)'
  g.beginPath()
  g.ellipse(-b.r * 0.34, -b.r * 0.4, b.r * 0.17, b.r * 0.24, -0.5, 0, 6.3)
  g.fill()
  // Der seltene Ballon trägt das Wappen des Vereins — daran erkennt man die 300 Punkte.
  if (b.wappen) wappen(g, w.deko, 0, -b.r * 0.06, b.r * 0.44)
  g.restore()
}

/** Herzumriss um (0,0), etwa `r` hoch. Der Wappenballon ist ein Herzluftballon. */
function herz(g: CanvasRenderingContext2D, r: number) {
  g.moveTo(0, r * 0.98)
  g.bezierCurveTo(-r * 1.4, r * 0.04, -r * 0.74, -r * 1.2, 0, -r * 0.42)
  g.bezierCurveTo(r * 0.74, -r * 1.2, r * 1.4, r * 0.04, 0, r * 0.98)
  g.closePath()
}

/* ── Ball ──────────────────────────────────────────────────────────────── */
function ball(g: CanvasRenderingContext2D, w: Welt) {
  const b = w.ball
  const r = b.r

  const hoehe = klemme((BODEN_Y - b.y) / 420, 0, 1)
  g.fillStyle = `rgba(40,80,20,${0.22 * (1 - hoehe * 0.65)})`
  g.beginPath()
  g.ellipse(b.x, BODEN_Y + 10, r * (1.15 - hoehe * 0.45), 8 * (1 - hoehe * 0.45), 0, 0, 6.3)
  g.fill()

  g.save()
  g.translate(b.x, b.y)
  g.scale(b.sx, b.sy)

  const koerper = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r * 1.05)
  koerper.addColorStop(0, '#ffffff')
  koerper.addColorStop(1, F.ballSchatten)
  g.fillStyle = koerper
  kreis(g, 0, 0, r)
  g.fill()

  /* Laufring — zeigt die Drehung, lässt das Gesicht frei */
  g.save()
  kreis(g, 0, 0, r)
  g.clip()
  g.rotate(b.dreh)
  g.lineWidth = r * 0.26
  g.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = i % 2 ? F.panel : F.panelHell
    g.beginPath()
    g.arc(0, 0, r * 0.84, (i * Math.PI * 2) / 5 + 0.3, ((i + 1) * Math.PI * 2) / 5 - 0.3)
    g.stroke()
  }
  g.restore()

  // Kräftiger dunkler Rand: der Ball muss vor jeder Vereinsfarbe stehen können.
  g.strokeStyle = 'rgba(35,48,64,.75)'
  g.lineWidth = 3
  kreis(g, 0, 0, r - 1.5)
  g.stroke()

  gesicht(g, w, r)
  g.restore()

  /* Reichweite zeigen, solange der Zeiger nah genug ist */
  if (b.lebt && !w.laden.an && w.zeiger.drin && inReichweite(w, w.zeiger.x, w.zeiger.y)) {
    g.strokeStyle = 'rgba(255,255,255,.75)'
    g.lineWidth = 3
    g.setLineDash([6, 8])
    g.lineDashOffset = -w.t * 30
    kreis(g, b.x, b.y, r + REICHWEITE - 6)
    g.stroke()
    g.setLineDash([])
  }
}

function gesicht(g: CanvasRenderingContext2D, w: Welt, r: number) {
  const art = w.ball.gesicht
  const ax = r * 0.34, ay = -r * 0.06
  g.fillStyle = F.tinte
  g.strokeStyle = F.tinte
  g.lineCap = 'round'

  if (art === 'happy') {
    g.lineWidth = 3.4
    for (const s of [-1, 1]) {
      g.beginPath()
      g.arc(s * ax, ay + 2, r * 0.17, Math.PI * 1.15, Math.PI * 1.85)
      g.stroke()
    }
    g.lineWidth = 3.2
    g.beginPath()
    g.arc(0, r * 0.18, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  } else if (art === 'dizzy') {
    g.lineWidth = 3.2
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * ax - 5, ay - 5); g.lineTo(s * ax + 5, ay + 5)
      g.moveTo(s * ax + 5, ay - 5); g.lineTo(s * ax - 5, ay + 5)
      g.stroke()
    }
    g.lineWidth = 3
    g.beginPath()
    g.arc(0, r * 0.38, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI)
    g.stroke()
  } else if (art === 'aim') {
    g.lineWidth = 3.6
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * ax - 6, ay + 1)
      g.lineTo(s * ax + 6, ay + 1)
      g.stroke()
    }
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-r * 0.16, r * 0.26)
    g.quadraticCurveTo(0, r * 0.16, r * 0.16, r * 0.26)
    g.stroke()
  } else if (art === 'rise') {
    for (const s of [-1, 1]) { kreis(g, s * ax, ay, r * 0.13); g.fill() }
    g.beginPath()
    g.ellipse(0, r * 0.26, r * 0.13, r * 0.17, 0, 0, 6.3)
    g.fill()
  } else if (art === 'meh') {
    for (const s of [-1, 1]) { kreis(g, s * ax, ay, r * 0.1); g.fill() }
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-r * 0.16, r * 0.27)
    g.lineTo(r * 0.16, r * 0.23)
    g.stroke()
  } else {
    for (const s of [-1, 1]) {
      g.beginPath()
      g.ellipse(s * ax, ay, r * 0.1, r * 0.13, 0, 0, 6.3)
      g.fill()
    }
    g.fillStyle = '#ffffff'
    for (const s of [-1, 1]) { kreis(g, s * ax + 2, ay - 3, r * 0.04); g.fill() }
    g.fillStyle = F.tinte
    g.lineWidth = 3
    g.beginPath()
    g.arc(0, r * 0.12, r * 0.24, 0.2 * Math.PI, 0.8 * Math.PI)
    g.stroke()
  }
}

/* ── Aufladen und Vorschau ─────────────────────────────────────────────── */
function laden(g: CanvasRenderingContext2D, w: Welt) {
  if (!w.laden.an) return
  const b = w.ball
  const c = kraftAus(w.laden.druck)
  const v = vorhersage(w, c, w.laden.ox)

  for (let i = 0; i < v.punkte.length; i++) {
    const t = i / Math.max(1, v.punkte.length - 1)
    g.globalAlpha = 0.28 + 0.55 * (1 - t)
    g.fillStyle = '#ffffff'
    kreis(g, v.punkte[i][0], v.punkte[i][1], 5 - t * 2)
    g.fill()
  }
  g.globalAlpha = 1

  const zuHoch = v.scheitelY < DECKE_Y + b.r + 4
  const imBand = Math.abs(v.scheitelY - w.band.y) <= w.band.h / 2
  const farbe = zuHoch ? F.rot : imBand ? F.gold : '#ffffff'
  const y = klemme(v.scheitelY, DECKE_Y + 8, BODEN_Y - 10)

  g.strokeStyle = farbe
  g.globalAlpha = 0.8
  g.lineWidth = 2.5
  g.setLineDash([10, 10])
  g.lineDashOffset = -w.t * 40
  g.beginPath()
  g.moveTo(0, y)
  g.lineTo(W, y)
  g.stroke()
  g.setLineDash([])
  g.globalAlpha = 1

  g.strokeStyle = farbe
  g.lineWidth = 3.5
  kreis(g, v.scheitelX, y, 15 + Math.sin(w.t * 9) * 1.6)
  g.stroke()
  g.fillStyle = farbe
  kreis(g, v.scheitelX, y, 4)
  g.fill()

  if (zuHoch) {
    g.fillStyle = F.rot
    g.font = schrift(19)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('zu hoch!', v.scheitelX, y + 34)
  }

  /* Kraftring: zeigt den aktuellen Andruck — beim Loslassen ist das die Schusskraft */
  const rr = b.r + 13
  g.lineWidth = 7
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(255,255,255,.55)'
  kreis(g, b.x, b.y, rr)
  g.stroke()
  g.strokeStyle = c < 0.4 ? '#2fd06a' : c < 0.75 ? F.gold : '#ff9600'
  g.beginPath()
  g.arc(b.x, b.y, rr, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2)
  g.stroke()

  /* Anspielpunkt */
  const winkel = Math.atan2(w.laden.py - b.y, w.laden.px - b.x)
  const px = b.x + Math.cos(winkel) * b.r, py = b.y + Math.sin(winkel) * b.r
  g.fillStyle = '#ffffff'
  kreis(g, px, py, 7)
  g.fill()
  g.fillStyle = F.tinte
  kreis(g, px, py, 3.4)
  g.fill()

  if (Math.abs(w.laden.ox) > 0.12) {
    const richtung = -Math.sign(w.laden.ox)
    const sx = b.x + richtung * (b.r + 34)
    g.strokeStyle = 'rgba(255,255,255,.9)'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(b.x + richtung * (b.r + 14), b.y)
    g.lineTo(sx, b.y)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,.9)'
    g.beginPath()
    g.moveTo(sx + richtung * 10, b.y)
    g.lineTo(sx - richtung * 3, b.y - 7)
    g.lineTo(sx - richtung * 3, b.y + 7)
    g.closePath()
    g.fill()
  }
}

/** Onboarding: steht da, solange der Ball auf das Antippen wartet. */
function hinweis(g: CanvasRenderingContext2D, w: Welt) {
  const b = w.ball
  if (w.laden.an || !b.wartet) return
  const puls = 1 + Math.sin(w.t * 5) * 0.05
  const y = b.y - b.r - 46
  const text = w.ersterSchuss ? 'Tipp den Ball an' : 'Tipp mit dem Stift auf den Ball'

  g.save()
  g.font = schrift(Math.round(21 * puls))
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const breite = g.measureText(text).width + 34
  g.fillStyle = 'rgba(255,255,255,.94)'
  rundRect(g, b.x - breite / 2, y - 20, breite, 40, 20)
  g.fill()
  g.fillStyle = F.tinte
  g.fillText(text, b.x, y + 1)
  g.fillStyle = 'rgba(255,255,255,.94)'
  g.beginPath()
  g.moveTo(b.x - 9, y + 18)
  g.lineTo(b.x + 9, y + 18)
  g.lineTo(b.x, y + 30)
  g.closePath()
  g.fill()
  g.restore()
}

/* ── Effekte ───────────────────────────────────────────────────────────── */
function effekte(g: CanvasRenderingContext2D, w: Welt) {
  for (const l of w.blaetter) {
    g.globalAlpha = 0.5
    g.fillStyle = l.farbe
    g.save()
    g.translate(l.x, l.y)
    g.rotate(Math.sin(w.t * 2 + l.ph) * 0.8)
    g.beginPath()
    g.ellipse(0, 0, 6 * l.s, 2.4 * l.s, 0, 0, 6.3)
    g.fill()
    g.restore()
  }
  g.globalAlpha = 1

  for (const p of w.puffs) {
    g.globalAlpha = klemme(p.leben / p.max, 0, 1) * 0.9
    g.fillStyle = p.farbe
    kreis(g, p.x, p.y, p.r * (0.4 + p.leben / p.max))
    g.fill()
  }
  for (const p of w.pops) schnipsel(g, p)
  g.globalAlpha = 1

  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  for (const n of w.notizen) {
    const k = klemme(n.leben / n.max, 0, 1)
    g.globalAlpha = Math.min(1, k * 1.6)
    g.font = schrift(Math.round(n.groesse * (1 + (1 - k) * 0.12)))
    g.lineWidth = 6
    g.strokeStyle = 'rgba(255,255,255,.9)'
    g.strokeText(n.text, n.x, n.y)
    g.fillStyle = n.farbe
    g.fillText(n.text, n.x, n.y)
  }
  g.globalAlpha = 1
}

/** Derselbe Stern wie auf dem Lob-Bildschirm, damit es dieselbe Belohnung bleibt. */
let sternPfad: Path2D | null = null

function stern(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  sternPfad ??= new Path2D('M0 -11 L3.2 -3.6 11 -3.4 4.9 1.4 7.1 8.9 0 4.6 -7.1 8.9 -4.9 1.4 -11 -3.4 -3.2 -3.6 Z')
  g.save()
  g.translate(x, y)
  g.scale(r / 11, r / 11)
  g.fillStyle = '#f6b81c'
  g.strokeStyle = '#c98f0a'
  g.lineWidth = 1.2
  g.lineJoin = 'round'
  g.fill(sternPfad)
  g.stroke(sternPfad)
  g.restore()
}

/**
 * Nur im Ersatzbetrieb ohne Stift: zeigt den per Zifferntaste eingestellten Druck.
 * Sobald ein Apple Pencil echten Andruck liefert, verschwindet die Anzeige — auf
 * Bens Gerät ist sie also nie zu sehen (A2).
 */
function ersatzDruck(g: CanvasRenderingContext2D, w: Welt) {
  if (!w.synthetisch) return
  const text = `Ersatzdruck ${Math.round(tastenDruckWert() * 100)} % · Tasten 1–9, 0`
  g.font = schrift(15, 500)
  g.textAlign = 'right'
  g.textBaseline = 'bottom'
  const breite = g.measureText(text).width + 22
  g.fillStyle = 'rgba(255,255,255,.72)'
  rundRect(g, W - 14 - breite, H - 44, breite, 30, 15)
  g.fill()
  g.fillStyle = '#6b7a8c'
  g.fillText(text, W - 25, H - 22)
}

function schnipsel(g: CanvasRenderingContext2D, p: Teilchen) {
  g.globalAlpha = klemme(p.leben / p.max, 0, 1)
  g.save()
  g.translate(p.x, p.y)
  g.rotate(p.dreh)
  g.fillStyle = p.farbe
  rundRect(g, -p.r, -p.r * 0.5, p.r * 2, p.r, 2)
  g.fill()
  g.restore()
}
