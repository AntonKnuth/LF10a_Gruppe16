/**
 * Zeichnen von „Platzwart". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2 (reizarme Oberfläche): kein Punktestand, keine Prozentzahl, kein Zähler. Der Platz
 * selbst ist die Fortschrittsanzeige — was noch dunkel und struppig ist, muss noch gemäht
 * werden. Die einzige Anzeige ist der Druckbalken, und der ist Rückmeldung, keine Statistik.
 */

import { tastenDruckWert } from '../../eingabe'
import {
  H, MAEHER_R, RASEN_B, RASEN_H, RASEN_X, RASEN_Y, SPALTEN, W, ZEILEN, ZELLE,
  bandOben, bandUnten, klemme, urteil, type Welt,
} from './welt'

const F = {
  himmel: '#7ecdfb',
  // Hohes Gras ist deutlich dunkler als geschnittenes — der Unterschied muss aus zwei
  // Metern Abstand auf einem iPad erkennbar sein, nicht nur nebeneinander.
  hoch: '#2f6b1f', hochHell: '#377d25',
  kurz: '#5cc23f', kurzHell: '#6ed24f',
  erde: '#8a5a34', erdeHell: '#9a6a40',
  linie: '#ffffff',
  tinte: '#3b4a5a',
  gutRing: '#2fd06a', leichtRing: '#1cb0f6', festRing: '#ff4b4b',
  balken: '#e8eef6', balkenRand: '#c3cede',
}

const BANDE = 16
const BALKEN_Y = H - 62
const BALKEN_H = 24

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
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, hoehe)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  bande(g, w)
  rasen(g, w)
  linien(g)
  druckBalken(g, w)
  ersatzdruckHinweis(g)
  maeher(g, w)
}

/** Bande rund um den Platz in Vereinsfarben — C1: das ist ein Stadion, kein Vorgarten. */
function bande(g: CanvasRenderingContext2D, w: Welt) {
  rundRect(g, RASEN_X - BANDE, RASEN_Y - BANDE, RASEN_B + 2 * BANDE, RASEN_H + 2 * BANDE, 10)
  g.fillStyle = w.farben.primaer
  g.fill()
  // Helle Segmente auf der Bande, damit sie nicht als massiver Block wirkt.
  g.fillStyle = w.farben.sekundaer
  g.globalAlpha = 0.55
  for (let x = RASEN_X - BANDE + 12; x < RASEN_X + RASEN_B; x += 96) {
    g.fillRect(x, RASEN_Y - BANDE + 4, 48, 8)
    g.fillRect(x, RASEN_Y + RASEN_H + BANDE - 12, 48, 8)
  }
  g.globalAlpha = 1
}

function rasen(g: CanvasRenderingContext2D, w: Welt) {
  for (let ze = 0; ze < ZEILEN; ze++) {
    for (let sp = 0; sp < SPALTEN; sp++) {
      const zustand = w.zellen[ze * SPALTEN + sp]
      const x = RASEN_X + sp * ZELLE
      const y = RASEN_Y + ze * ZELLE
      // Mähstreifen wie auf einem echten Platz: je zwei Spalten wechselt der Ton.
      const hell = Math.floor(sp / 2) % 2 === 0
      if (zustand === 'gut') g.fillStyle = hell ? F.kurzHell : F.kurz
      else if (zustand === 'kaputt') g.fillStyle = hell ? F.erdeHell : F.erde
      else g.fillStyle = (sp + ze) % 2 === 0 ? F.hochHell : F.hoch
      g.fillRect(x, y, ZELLE + 1, ZELLE + 1)

      // Struppige Halme nur auf ungemähtem Gras. Sie sind der eigentliche Unterschied:
      // „hoch" erkennt man an der Silhouette, nicht am Grünton.
      if (zustand !== 'ungemaeht') continue
      g.strokeStyle = F.hoch
      g.lineWidth = 2
      g.beginPath()
      for (let i = 0; i < 3; i++) {
        const hx = x + 6 + i * 10
        g.moveTo(hx, y + ZELLE - 3)
        g.lineTo(hx + (i % 2 ? 3 : -3), y + 8)
      }
      g.stroke()
    }
  }
}

/** Mittellinie und Anstoßkreis, blass über allem — der Platz ist als Spielfeld erkennbar. */
function linien(g: CanvasRenderingContext2D) {
  g.save()
  g.globalAlpha = 0.3
  g.strokeStyle = F.linie
  g.lineWidth = 4
  const mx = RASEN_X + RASEN_B / 2
  g.beginPath()
  g.moveTo(mx, RASEN_Y)
  g.lineTo(mx, RASEN_Y + RASEN_H)
  g.stroke()
  kreis(g, mx, RASEN_Y + RASEN_H / 2, 62)
  g.stroke()
  g.strokeRect(RASEN_X + 2, RASEN_Y + 2, RASEN_B - 4, RASEN_H - 4)
  g.restore()
}

/**
 * Druckbalken: zeigt, wo der aktuelle Andruck im erlaubten Band liegt (A1, B1).
 *
 * Ohne ihn ist „zu leicht" unsichtbar — eine nicht gemähte Zelle sieht genauso aus, als
 * wäre man nie darübergefahren. Das ist der einzige Kanal, der den Unterschied zeigt.
 */
function druckBalken(g: CanvasRenderingContext2D, w: Welt) {
  rundRect(g, RASEN_X, BALKEN_Y, RASEN_B, BALKEN_H, 12)
  g.fillStyle = F.balken
  g.fill()
  g.strokeStyle = F.balkenRand
  g.lineWidth = 2
  g.stroke()

  // Das erlaubte Band als grüner Bereich.
  const u = RASEN_X + bandUnten(w.stufe) * RASEN_B
  const o = RASEN_X + bandOben(w.stufe) * RASEN_B
  g.save()
  rundRect(g, RASEN_X, BALKEN_Y, RASEN_B, BALKEN_H, 12)
  g.clip()
  g.fillStyle = F.gutRing
  g.globalAlpha = 0.45
  g.fillRect(u, BALKEN_Y, o - u, BALKEN_H)
  g.restore()

  // Marke für den aktuellen Andruck.
  const x = RASEN_X + klemme(w.druck.wert, 0, 1) * RASEN_B
  const art = urteil(w.druck.wert, w.stufe)
  g.fillStyle = art === 'gut' ? F.gutRing : art === 'zu-leicht' ? F.leichtRing : F.festRing
  g.beginPath()
  g.moveTo(x, BALKEN_Y - 8)
  g.lineTo(x + 9, BALKEN_Y - 20)
  g.lineTo(x - 9, BALKEN_Y - 20)
  g.closePath()
  g.fill()
  g.fillRect(x - 3, BALKEN_Y, 6, BALKEN_H)

  g.fillStyle = F.tinte
  g.font = schrift(15, 700)
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillText('zu leicht', RASEN_X + 10, BALKEN_Y + BALKEN_H / 2)
  g.textAlign = 'right'
  g.fillText('zu fest', RASEN_X + RASEN_B - 10, BALKEN_Y + BALKEN_H / 2)
}

/** Gleicher Hinweis wie in „Ball hochhalten" — ohne Stift muss man die Ziffern kennen. */
function ersatzdruckHinweis(g: CanvasRenderingContext2D) {
  g.fillStyle = F.tinte
  g.globalAlpha = 0.65
  g.font = schrift(14, 600)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(
    `Ersatzdruck ${Math.round(tastenDruckWert() * 100)} % · Tasten 1–9, 0`,
    W / 2,
    BALKEN_Y + BALKEN_H + 18,
  )
  g.globalAlpha = 1
}

function maeher(g: CanvasRenderingContext2D, w: Welt) {
  if (!w.maeher.drin) return
  const { x, y } = w.maeher
  const art = urteil(w.druck.wert, w.stufe)
  const farbe = art === 'gut' ? F.gutRing : art === 'zu-leicht' ? F.leichtRing : F.festRing

  // Schnittkreis: zeigt genau die Fläche, die der Mäher erwischt.
  g.strokeStyle = farbe
  g.lineWidth = w.maeht ? 6 : 3
  g.globalAlpha = w.maeht ? 1 : 0.6
  kreis(g, x, y, MAEHER_R)
  g.stroke()
  g.globalAlpha = 1

  // Gehäuse mit Griff.
  g.fillStyle = F.tinte
  rundRect(g, x - 14, y - 10, 28, 20, 5)
  g.fill()
  g.fillStyle = farbe
  rundRect(g, x - 10, y - 6, 20, 12, 3)
  g.fill()
  g.strokeStyle = F.tinte
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(x + 8, y - 8)
  g.lineTo(x + 22, y - 24)
  g.stroke()
}
