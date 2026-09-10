/**
 * Zeichnen der „Autogrammstunde". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2: kein Punktestand, keine Prozentzahl. Wie weit Ben ist, zeigt der Balken unter dem
 * Feld; wie sauber er war, sieht man an der eigenen Schrift.
 */

import {
  H, TRIKOT_B, TRIKOT_H, TRIKOT_Y, W, anteil, spielerVon, type Welt,
} from './welt'

const F = {
  himmel: '#c6e9fb',
  gras: '#4cb327',
  papier: '#ffffff',
  feldRand: '#c3cede',
  tinte: '#1f3550',
  daneben: '#ff4b4b',
  fortschritt: '#2fd06a',
  schatten: 'rgba(31,53,80,0.18)',
  hinweis: '#9fb0c4',
}

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 600) => `${gewicht} ${px}px ${SCHRIFT}`

const TRIKOT_X = W / 2 - TRIKOT_B / 2

/** Sichtfenster: Maßstab und Rand, damit die 900×640-Bühne mittig ins Canvas passt. */
export type Sicht = { s: number; dx: number; dy: number }

export function berechneSicht(breite: number, hoehe: number): Sicht {
  const s = Math.min(breite / W, hoehe / H)
  return { s, dx: (breite - W * s) / 2, dy: (hoehe - H * s) / 2 }
}

/* ── Formhelfer ────────────────────────────────────────────────────────── */
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
  // Hintergrund in Canvas-Koordinaten, nicht in Bühnenkoordinaten: sonst endet der Rasen
  // an der Bühnenkante und steht als grüner Block in der Landschaft, sobald das Canvas
  // ein anderes Seitenverhältnis hat als 900×640.
  g.setTransform(1, 0, 0, 1, 0, 0)
  const kante = sicht.dy + (H - 70) * sicht.s
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, kante)
  g.fillStyle = F.gras
  g.fillRect(0, kante, breite, hoehe - kante)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  trikot(g, w)
  feld(g, w)
  schrift_(g, w)
  fortschritt(g, w)
  if (w.jubelUhr > 0) jubel(g, w)
}

/** Trikot in Vereinsfarben mit Rückennummer und Namen — der Verein ist reiner Content. */
function trikot(g: CanvasRenderingContext2D, w: Welt) {
  const s = spielerVon(w)
  const x = TRIKOT_X
  const y = TRIKOT_Y

  g.save()
  g.shadowColor = F.schatten
  g.shadowBlur = 24
  g.shadowOffsetY = 10

  // Ärmel als angesetzte Schrägen, nicht als Rechtecke hinter dem Rumpf — sonst sieht das
  // Trikot aus wie ein Blatt Papier mit zwei Zetteln dahinter.
  g.fillStyle = w.farben.primaer
  for (const seite of [-1, 1]) {
    const rand = seite < 0 ? x : x + TRIKOT_B
    g.beginPath()
    g.moveTo(rand, y + 6)
    g.lineTo(rand + seite * 78, y + 62)
    g.lineTo(rand + seite * 60, y + 150)
    g.lineTo(rand, y + 116)
    g.closePath()
    g.fill()
  }

  // Rumpf
  rundRect(g, x, y, TRIKOT_B, TRIKOT_H, 26)
  g.fill()
  g.restore()

  // Ärmelbündchen in der Zweitfarbe
  g.fillStyle = w.farben.sekundaer
  for (const seite of [-1, 1]) {
    const rand = seite < 0 ? x : x + TRIKOT_B
    g.beginPath()
    g.moveTo(rand + seite * 78, y + 62)
    g.lineTo(rand + seite * 60, y + 150)
    g.lineTo(rand + seite * 44, y + 143)
    g.lineTo(rand + seite * 62, y + 55)
    g.closePath()
    g.fill()
  }

  // Kragen: ein Ausschnitt im Rumpf, kein aufgesetztes Element.
  g.fillStyle = w.farben.sekundaer
  rundRect(g, x + TRIKOT_B / 2 - 54, y - 10, 108, 36, 18)
  g.fill()
  g.fillStyle = F.himmel
  rundRect(g, x + TRIKOT_B / 2 - 42, y - 14, 84, 30, 15)
  g.fill()

  // Name und Rückennummer
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = w.farben.sekundaer
  g.font = schrift(24, 800)
  g.fillText(s.name.toUpperCase(), x + TRIKOT_B / 2, y + 68)
  g.font = schrift(112, 800)
  g.fillText(String(s.nummer), x + TRIKOT_B / 2, y + 158)
}

/** Das Autogrammfeld — klein, damit die feine Führung gefragt ist (Pinzettengriff). */
function feld(g: CanvasRenderingContext2D, w: Welt) {
  const f = w.feld
  rundRect(g, f.x, f.y, f.b, f.h, 10)
  g.fillStyle = F.papier
  g.fill()
  g.strokeStyle = F.feldRand
  g.lineWidth = 3
  g.stroke()

  // Schreiblinie und Hinweis nur, solange **im Feld** nichts steht. Auf `schrift` zu
  // prüfen wäre falsch: ein Strich daneben nähme Ben genau die Hilfe weg, die er
  // offensichtlich noch braucht.
  if (w.tinte > 0) return
  g.save()
  g.setLineDash([8, 8])
  g.strokeStyle = F.hinweis
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(f.x + 14, f.y + f.h * 0.72)
  g.lineTo(f.x + f.b - 14, f.y + f.h * 0.72)
  g.stroke()
  g.restore()

  g.fillStyle = F.hinweis
  g.font = schrift(15, 700)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('hier unterschreiben', f.x + f.b / 2, f.y + f.h * 0.34)
}

/** Bens Schrift. Daneben geschriebenes bleibt rot stehen — es blockiert nichts (C2). */
function schrift_(g: CanvasRenderingContext2D, w: Welt) {
  if (w.schrift.length < 2) return
  g.save()
  g.lineWidth = 5
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 1; i < w.schrift.length; i++) {
    const p = w.schrift[i - 1]
    const q = w.schrift[i]
    // `neu` heißt: der Stift war zwischendurch oben. Keine Linie über die Luftlinie.
    if (q.neu) continue
    g.strokeStyle = q.drin && p.drin ? F.tinte : F.daneben
    g.beginPath()
    g.moveTo(p.x, p.y)
    g.lineTo(q.x, q.y)
    g.stroke()
  }
  g.restore()
}

/** Schmaler Balken unter dem Feld: wie voll das Autogramm ist. Rückmeldung, keine Statistik. */
function fortschritt(g: CanvasRenderingContext2D, w: Welt) {
  const f = w.feld
  const y = f.y + f.h + 16
  rundRect(g, f.x, y, f.b, 12, 6)
  g.fillStyle = 'rgba(255,255,255,0.7)'
  g.fill()

  const a = anteil(w)
  if (a <= 0) return
  g.save()
  rundRect(g, f.x, y, f.b, 12, 6)
  g.clip()
  g.fillStyle = F.fortschritt
  g.fillRect(f.x, y, f.b * a, 12)
  g.restore()
}

/** C5/C2: der Fan bedankt sich, danach kommt der nächste — kein Spielende. */
function jubel(g: CanvasRenderingContext2D, w: Welt) {
  // Nur der Rufname: Vereine sind reiner Content, und „Daniel Heuer Fernandes" oder ein
  // niederländischer Name sprengt jede fest gesetzte Kastenbreite.
  const rufname = spielerVon(w).name.split(' ')[0]
  const zeile = `${rufname} freut sich!`
  const y = TRIKOT_Y + 180

  g.textAlign = 'center'
  g.textBaseline = 'middle'
  // Breite messen statt raten — sonst steht der Text irgendwann neben seinem Kasten.
  g.font = schrift(18, 600)
  const breite = Math.max(300, g.measureText(zeile).width + 72)

  rundRect(g, W / 2 - breite / 2, y - 44, breite, 88, 22)
  g.fillStyle = 'rgba(255,255,255,0.95)'
  g.fill()

  g.fillStyle = F.tinte
  g.font = schrift(34, 800)
  g.fillText('Danke!', W / 2, y - 10)
  g.font = schrift(18, 600)
  g.fillText(zeile, W / 2, y + 24)
}
