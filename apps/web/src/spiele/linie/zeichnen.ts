/**
 * Zeichnen von „Linie malen". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2: kein Punktestand, keine Prozentzahl. Wie weit Ben ist, sagt die Lage des Balls;
 * wie gut er war, sagt die Farbe seiner Spur.
 *
 * Der Korridor ist **sichtbar breit** gezeichnet. Eine unsichtbare Toleranz wäre für ein
 * Kind Willkür: der Ball bliebe stehen, ohne dass zu sehen ist, warum.
 */

import { BALL_R, H, W, ballPunkt, toleranz, type Punkt, type Welt } from './welt'

const F = {
  himmel: '#7ecdfb',
  gras: '#3f9d1e', grasHell: '#4cb327',
  kreide: '#ffffff',
  korridor: '#ffffff',
  drin: '#2fd06a', daneben: '#ff4b4b',
  ball: '#ffffff', ballFleck: '#2b3a4a',
  tinte: '#3b4a5a',
  netz: '#dfe8f2',
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

const strecke = (g: CanvasRenderingContext2D, a: Punkt, b: Punkt) => {
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(b.x, b.y)
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, hoehe)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  rasen(g)
  korridor(g, w)
  mittellinie(g, w)
  tor(g, w)
  anstoss(g, w)
  spur(g, w)
  ball(g, w)
  if (w.jubelUhr > 0) jubel(g)
}

/** Rasen mit Mähstreifen — dieselbe Bildsprache wie „Platzwart". */
function rasen(g: CanvasRenderingContext2D) {
  for (let i = 0; i * 90 < W; i++) {
    g.fillStyle = i % 2 === 0 ? F.gras : F.grasHell
    g.fillRect(i * 90, 0, 90, H)
  }
}

/**
 * Der erlaubte Bereich als breites Kreideband. Grün, solange der Stift drin liegt —
 * das ist die Rückmeldung aus A1, noch bevor der Ball sich bewegt.
 */
function korridor(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.lineCap = 'round'
  g.lineWidth = toleranz(w.stufe) * 2
  g.strokeStyle = w.zieht && w.imKorridor ? F.drin : F.korridor
  g.globalAlpha = w.zieht && w.imKorridor ? 0.4 : 0.22
  strecke(g, w.a, w.b)
  g.stroke()
  g.restore()
}

/** Die Bahn selbst als gestrichelte Kreidelinie. */
function mittellinie(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.setLineDash([16, 14])
  g.lineWidth = 4
  g.strokeStyle = F.kreide
  g.globalAlpha = 0.85
  strecke(g, w.a, w.b)
  g.stroke()
  g.restore()
}

/** Anstoßpunkt am Anfang der Bahn. */
function anstoss(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.strokeStyle = F.kreide
  g.globalAlpha = 0.8
  g.lineWidth = 4
  kreis(g, w.a.x, w.a.y, 30)
  g.stroke()
  g.restore()
}

/** Tor am Ende der Bahn, von der Seite — der Ball kommt von links. */
function tor(g: CanvasRenderingContext2D, w: Welt) {
  const { x, y } = w.b
  const h = 96
  const t = 34
  g.save()
  g.translate(x, y)

  // Netz
  g.strokeStyle = F.netz
  g.lineWidth = 1.5
  g.globalAlpha = 0.75
  for (let i = 0; i <= 5; i++) {
    strecke(g, { x: 0, y: -h / 2 + (i * h) / 5 }, { x: t, y: -h / 2 + (i * h) / 5 })
    g.stroke()
  }
  for (let i = 0; i <= 3; i++) {
    strecke(g, { x: (i * t) / 3, y: -h / 2 }, { x: (i * t) / 3, y: h / 2 })
    g.stroke()
  }
  g.globalAlpha = 1

  // Pfosten und Latte
  g.strokeStyle = F.kreide
  g.lineWidth = 8
  g.lineCap = 'round'
  strecke(g, { x: 0, y: -h / 2 }, { x: 0, y: h / 2 })
  g.stroke()
  strecke(g, { x: 0, y: -h / 2 }, { x: t, y: -h / 2 })
  g.stroke()
  strecke(g, { x: 0, y: h / 2 }, { x: t, y: h / 2 })
  g.stroke()
  g.restore()
}

/**
 * Die tatsächliche Handbewegung. Grün, wo sie im Korridor lag, rot daneben — nach dem
 * Zug bleibt so sichtbar stehen, wo es krumm wurde.
 */
function spur(g: CanvasRenderingContext2D, w: Welt) {
  if (w.spur.length < 2) return
  g.save()
  g.lineWidth = 6
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 1; i < w.spur.length; i++) {
    const p = w.spur[i - 1]
    const q = w.spur[i]
    g.strokeStyle = q.daneben ? F.daneben : F.drin
    g.globalAlpha = q.daneben ? 0.9 : 0.7
    strecke(g, p, q)
    g.stroke()
  }
  g.restore()
}

function ball(g: CanvasRenderingContext2D, w: Welt) {
  const p = ballPunkt(w)
  // Rollt sichtbar mit: der Drehwinkel folgt der zurückgelegten Strecke.
  const weg = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) * w.fortschritt
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

  // Ring in der Rückmeldefarbe, solange der Stift aufliegt.
  if (!w.zieht) return
  g.strokeStyle = w.imKorridor ? F.drin : F.daneben
  g.lineWidth = 4
  kreis(g, p.x, p.y, BALL_R + 8)
  g.stroke()
}

/** C2: gefeiert wird das Tor, danach kommt die nächste Bahn — kein Spielende. */
function jubel(g: CanvasRenderingContext2D) {
  const y = H / 2 - 90
  rundRect(g, W / 2 - 150, y - 40, 300, 80, 20)
  g.fillStyle = 'rgba(255,255,255,0.94)'
  g.fill()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = F.tinte
  g.font = schrift(40, 800)
  g.fillText('Tor!', W / 2, y - 6)
  g.font = schrift(18, 600)
  g.fillText('Der nächste Ball wartet.', W / 2, y + 24)
}
