/**
 * Zeichnen von „Dribbeln mit Pfiff". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2: kein Punktestand, keine Zahl, kein Blinken. Auch die Haltedauer wird nicht angezeigt: ein
 * sich füllender Ring kündigte den Doppelpfiff an, und Ben zählte mit, statt zu warten.
 *
 * Das Stopp-Zeichen steht **am Ball**, weil Ben auf die Stiftspitze schaut. Der Trainer oben
 * zeigt dasselbe nur zusätzlich. Stopp ist ein Ring, Weiter ein Pfeil: sie unterscheiden sich in
 * der Form, nicht nur in der Farbe (Rot-Grün-Schwäche).
 */

import {
  BALL_R, FANG_R, H, HILFE_TEXT, HUETCHEN, PFEIL_SEK, STERNE_SEK, W, aktuellerPfiff, ballPunkt,
  kuendigtAn, nummer, punktAuf, type Punkt, type Welt,
} from './welt'

const F = {
  himmel: '#7ecdfb',
  gras: '#3f9d1e',
  grasHell: '#4cb327',
  kreide: '#ffffff',
  stopp: '#ff5a3c',
  weiter: '#2fd06a',
  wartet: '#ffe27a',
  ball: '#ffffff',
  ballFleck: '#2b3a4a',
  tinte: '#3b4a5a',
  haut: '#f2c39b',
  hose: '#2b3a4a',
}

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

function rundRect(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}

function strich(g: CanvasRenderingContext2D, a: Punkt, b: Punkt) {
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(b.x, b.y)
  g.stroke()
}

function bahnPfad(g: CanvasRenderingContext2D, bahn: Punkt[]) {
  g.beginPath()
  g.moveTo(bahn[0].x, bahn[0].y)
  for (let i = 1; i < bahn.length; i++) g.lineTo(bahn[i].x, bahn[i].y)
}

/** Laufrichtung der Bahn beim Ball, als Winkel. */
function richtung(w: Welt) {
  const a = punktAuf(w.bahn, w.fortschritt - 0.01)
  const b = punktAuf(w.bahn, w.fortschritt + 0.01)
  return Math.atan2(b.y - a.y, b.x - a.x)
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(
  g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number,
) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, hoehe)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  rasen(g)
  gasse(g, w)
  huetchen(g, w)
  mitspieler(g, w)
  spur(g, w)
  wartet(g, w)
  ball(g, w)
  zeichenAmBall(g, w)
  trainer(g, w)
  sterne(g, w)
  if (w.jubelUhr > 0) spruch(g, w)
  else if (w.hilfeUhr > 0) band(g, HILFE_TEXT)
}

/** Rasen mit Mähstreifen — dieselbe Bildsprache wie die anderen Platzspiele. */
function rasen(g: CanvasRenderingContext2D) {
  for (let i = 0; i * 90 < W; i++) {
    g.fillStyle = i % 2 === 0 ? F.gras : F.grasHell
    g.fillRect(i * 90, 0, 90, H)
  }
}

/** Die Gasse in voller Korridorbreite: eine unsichtbare Grenze wäre für ein Kind Willkür. */
function gasse(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = w.p.korridor * 2
  g.strokeStyle = F.kreide
  g.globalAlpha = w.amBall ? 0.34 : 0.22
  bahnPfad(g, w.bahn)
  g.stroke()

  g.setLineDash([16, 14])
  g.lineWidth = 4
  g.globalAlpha = 0.75
  bahnPfad(g, w.bahn)
  g.stroke()
  g.restore()
}

/** Hütchen in Vereinsfarben auf beiden Seiten der Gasse. Passierte werden blass. */
function huetchen(g: CanvasRenderingContext2D, w: Welt) {
  for (const t of HUETCHEN) {
    const p = punktAuf(w.bahn, t)
    for (const seite of [-1, 1]) {
      g.save()
      g.translate(p.x, p.y + seite * (w.p.korridor + 18) + 8)
      g.globalAlpha = w.fortschritt >= t ? 0.4 : 1
      g.lineWidth = 2
      g.strokeStyle = F.tinte
      g.fillStyle = w.farben.primaer
      g.beginPath()
      g.moveTo(0, -26)
      g.lineTo(13, 4)
      g.lineTo(-13, 4)
      g.closePath()
      g.fill()
      g.stroke()
      g.fillStyle = w.farben.sekundaer
      rundRect(g, -17, 0, 34, 7, 3)
      g.fill()
      g.stroke()
      g.restore()
    }
  }
}

type Arm = 'unten' | 'oben' | 'pfeife'

/** Eine Figur von vorn, Füße bei (x, y). Trainer und Mitspieler sind dieselbe Zeichnung. */
function figur(
  g: CanvasRenderingContext2D, x: number, y: number, w: Welt,
  links: Arm, rechts: Arm, rueckennummer?: number,
) {
  g.save()
  g.translate(x, y)
  g.lineCap = 'round'

  g.strokeStyle = F.hose
  g.lineWidth = 9
  strich(g, { x: -8, y: -30 }, { x: -9, y: 0 })
  strich(g, { x: 8, y: -30 }, { x: 9, y: 0 })

  // Arme hinter dem Trikot, damit der Ansatz sauber verschwindet.
  g.strokeStyle = F.haut
  g.lineWidth = 8
  for (const [seite, arm] of [[-1, links], [1, rechts]] as const) {
    const schulter = { x: seite * 16, y: -62 }
    if (arm === 'unten') strich(g, schulter, { x: seite * 24, y: -34 })
    else if (arm === 'oben') strich(g, schulter, { x: seite * 28, y: -96 })
    else strich(g, schulter, { x: seite * 27, y: -72 })
  }

  g.fillStyle = w.farben.primaer
  g.strokeStyle = w.farben.sekundaer
  g.lineWidth = 2
  rundRect(g, -19, -70, 38, 44, 9)
  g.fill()
  g.stroke()

  g.fillStyle = F.haut
  kreis(g, 0, -84, 14)
  g.fill()
  g.fillStyle = F.tinte
  g.beginPath()
  g.arc(0, -86, 14, Math.PI, 0)
  g.fill()

  if (rechts === 'pfeife') {
    // Unterarm und Pfeife liegen vor dem Gesicht.
    g.strokeStyle = F.haut
    g.lineWidth = 8
    strich(g, { x: 27, y: -72 }, { x: 10, y: -78 })
    g.fillStyle = F.wartet
    rundRect(g, -2, -82, 11, 7, 3)
    g.fill()
  }
  if (rueckennummer !== undefined) {
    g.fillStyle = w.farben.sekundaer
    g.font = schrift(24, 800)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(rueckennummer), 0, -47)
  }
  g.restore()
}

/** Ruhig sind die Arme unten; beim Pfiff ist eine flache Hand oben und die Pfeife am Mund. */
function trainer(g: CanvasRenderingContext2D, w: Welt) {
  const stoppt = w.phase === 'stopp' || w.phase === 'halten'
  const y = 130
  figur(g, W / 2, y, w, stoppt ? 'oben' : 'unten', stoppt || kuendigtAn(w) ? 'pfeife' : 'unten')
  if (!stoppt) return
  g.fillStyle = F.haut
  rundRect(g, W / 2 - 37, y - 118, 18, 26, 6)
  g.fill()
}

/** Nur die Nummer, kein Name: Lesen ist hier nicht die Aufgabe. */
function mitspieler(g: CanvasRenderingContext2D, w: Welt) {
  const ende = w.bahn[w.bahn.length - 1]
  const arm = w.jubelUhr > 0 ? 'oben' : 'unten'
  figur(g, ende.x + 80, ende.y + 45, w, arm, arm, nummer(w))
}

/** Die letzten 1,2 Sekunden der Handbewegung, blass. Keine Farbe für richtig oder falsch. */
function spur(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.lineWidth = 6
  g.lineCap = 'round'
  g.strokeStyle = w.farben.sekundaer
  for (let i = 1; i < w.spur.length; i++) {
    g.globalAlpha = 0.5 * Math.max(0, 1 - (w.zeitGesamt - w.spur[i].zeit) / 1.2)
    strich(g, w.spur[i - 1], w.spur[i])
  }
  g.restore()
}

/** Der Ball wartet: ein ruhiges Leuchten in der Größe, in der Ben ihn greifen kann. */
function wartet(g: CanvasRenderingContext2D, w: Welt) {
  if (w.amBall || w.jubelUhr > 0 || w.phase === 'stopp' || w.phase === 'halten') return
  const p = ballPunkt(w)
  g.save()
  g.fillStyle = F.wartet
  g.globalAlpha = 0.55
  kreis(g, p.x, p.y, FANG_R)
  g.fill()
  g.restore()
}

function ball(g: CanvasRenderingContext2D, w: Welt) {
  const b = ballPunkt(w)
  // Beim Pass liegt der Ball beim Mitspieler am Fuß.
  const p = w.jubelUhr > 0 ? { x: b.x + 50, y: b.y + 34 } : b
  const weg = (w.bahn[w.bahn.length - 1].x - w.bahn[0].x) * w.fortschritt
  g.save()
  g.translate(p.x, p.y)

  g.globalAlpha = 0.25
  g.fillStyle = F.tinte
  g.beginPath()
  g.ellipse(0, BALL_R - 2, BALL_R, BALL_R * 0.35, 0, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1

  g.rotate(weg / BALL_R)
  g.fillStyle = F.ball
  kreis(g, 0, 0, BALL_R)
  g.fill()
  g.fillStyle = F.ballFleck
  kreis(g, 0, 0, BALL_R * 0.34)
  g.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    kreis(g, Math.cos(a) * BALL_R * 0.72, Math.sin(a) * BALL_R * 0.72, BALL_R * 0.2)
    g.fill()
  }
  g.restore()
}

/** Das maßgebliche Signal: Ring für „stehen bleiben", grüner Pfeil für „weiter". */
function zeichenAmBall(g: CanvasRenderingContext2D, w: Welt) {
  const p = ballPunkt(w)
  g.save()
  g.translate(p.x, p.y)

  const pfiff = aktuellerPfiff(w)
  if ((w.phase === 'stopp' || w.phase === 'halten') && pfiff) {
    // Schrumpft in 120 ms auf seine Größe — sichtbar ab dem ersten Bild, ohne Blinken.
    const auf = Math.min(1, (w.tMs - pfiff.stoppMs) / 120)
    const r = 34 * (1.3 - 0.3 * auf)
    if (pfiff.gestopptMs !== null) {
      g.fillStyle = F.stopp
      g.globalAlpha = 0.35
      kreis(g, 0, 0, r)
      g.fill()
    }
    g.globalAlpha = 0.5 + 0.5 * auf
    // Weißer Rand, damit der Ring auf dem Rasen auch ohne Farbe zu erkennen ist.
    g.lineWidth = 11
    g.strokeStyle = F.kreide
    kreis(g, 0, 0, r)
    g.stroke()
    g.lineWidth = 6
    g.strokeStyle = F.stopp
    kreis(g, 0, 0, r)
    g.stroke()
  } else if (w.pfeilUhr > 0) {
    g.globalAlpha = w.pfeilUhr / PFEIL_SEK
    g.rotate(richtung(w))
    g.beginPath()
    g.moveTo(30, -10)
    g.lineTo(52, -10)
    g.lineTo(52, -24)
    g.lineTo(80, 0)
    g.lineTo(52, 24)
    g.lineTo(52, 10)
    g.lineTo(30, 10)
    g.closePath()
    g.lineWidth = 5
    g.strokeStyle = F.kreide
    g.stroke()
    g.fillStyle = F.weiter
    g.fill()
  }
  g.restore()
}

/** Sieben Sterne fliegen nach einem sauberen Stopp auseinander, in den Farben des Vereins. */
function sterne(g: CanvasRenderingContext2D, w: Welt) {
  if (w.sterneUhr <= 0) return
  const u = 1 - w.sterneUhr / STERNE_SEK
  const p = ballPunkt(w)
  g.save()
  g.globalAlpha = 1 - u
  g.strokeStyle = F.tinte
  g.lineWidth = 1.5
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const r = 34 + u * 55
    stern(g, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 11)
    g.fillStyle = i % 2 === 0 ? w.farben.primaer : w.farben.sekundaer
    g.fill()
    g.stroke()
  }
  g.restore()
}

function stern(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.45
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.closePath()
}

/** Ein weißes Band neben dem Trainer, mit einer großen und einer kleinen Zeile. */
function band(g: CanvasRenderingContext2D, gross: string, klein = '') {
  const y = 190
  rundRect(g, W / 2 - 290, y - 42, 580, 84, 20)
  g.fillStyle = 'rgba(255,255,255,0.94)'
  g.fill()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = F.tinte
  g.font = schrift(30, 800)
  g.fillText(gross, W / 2, klein ? y - 11 : y)
  if (!klein) return
  g.font = schrift(19, 600)
  g.fillText(klein, W / 2, y + 22)
}

/** Der Pass ist angekommen: ein Ruf aus diesem Verein, mit Übersetzung, wenn er eine braucht. */
function spruch(g: CanvasRenderingContext2D, w: Welt) {
  const s = w.sprueche[(w.paesse - 1) % w.sprueche.length]
  if (s) band(g, s.text, s.uebersetzung === s.text ? '' : s.uebersetzung)
}
