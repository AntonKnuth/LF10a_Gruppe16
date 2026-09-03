/**
 * Zeichnen von „Platzwart". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2 (reizarme Oberfläche): kein Punktestand, keine Prozentzahl, kein Zähler. Der Platz
 * selbst ist die Fortschrittsanzeige — was noch struppig ist, muss noch gemäht werden.
 *
 * Die Zonen unterscheiden sich **nicht nur im Farbton, sondern in der Silhouette**: junge
 * Saat sind ein paar kurze Spitzen, hohes Gras ein dichter Wald. Ein Grünton-Unterschied
 * allein wäre auf einem iPad aus zwei Metern Abstand nicht lesbar.
 */

import { tastenDruckWert } from '../../eingabe'
import {
  H, MAEHER_R, RASEN_B, RASEN_H, RASEN_X, RASEN_Y, SPALTEN, W, ZEILEN, ZELLE,
  bandOben, bandUnten, klemme, urteil, zoneBei, zoneVon, type Welt, type Zone,
} from './welt'

const F = {
  himmel: '#7ecdfb',
  kurz: '#5cc23f', kurzHell: '#6ed24f',
  erde: '#8a5a34', erdeHell: '#9a6a40',
  linie: '#ffffff',
  tinte: '#3b4a5a',
  gutRing: '#2fd06a', leichtRing: '#1cb0f6', festRing: '#ff4b4b',
  balken: '#e8eef6', balkenRand: '#c3cede',
}

/** Optik je Wuchszone: Farbe, Halmzahl und Halmhöhe. */
const OPTIK: Record<Zone, { a: string; b: string; strich: string; halme: number; hoch: number }> = {
  jung: { a: '#d3e396', b: '#c6da85', strich: '#9cb55e', halme: 2, hoch: 7 },
  normal: { a: '#4e9c34', b: '#58ab3c', strich: '#35701f', halme: 3, hoch: 14 },
  hoch: { a: '#1f5417', b: '#27641e', strich: '#0f3409', halme: 4, hoch: 23 },
}

const NAME: Record<Zone, string> = { jung: 'junge Saat', normal: 'normaler Rasen', hoch: 'hohes Gras' }

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
  // Die Zone unter dem Mäher steuert Ring und Druckbalken — beim Überfahren einer
  // Grenze springt das erlaubte Band sichtbar. Das ist die eigentliche Rückmeldung.
  const zone = zoneBei(w, w.maeher.x, w.maeher.y)
  bande(g, w)
  rasen(g, w)
  linien(g)
  druckBalken(g, w, zone)
  ersatzdruckHinweis(g, zone)
  maeher(g, w, zone)
  if (w.platzFertig) fertigBanner(g)
}

/** Bande rund um den Platz in Vereinsfarben — C1: das ist ein Stadion, kein Vorgarten. */
function bande(g: CanvasRenderingContext2D, w: Welt) {
  rundRect(g, RASEN_X - BANDE, RASEN_Y - BANDE, RASEN_B + 2 * BANDE, RASEN_H + 2 * BANDE, 10)
  g.fillStyle = w.farben.primaer
  g.fill()
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

      if (zustand === 'gut') {
        // Geschnitten sieht überall gleich aus — der fertige Platz ist einheitlich.
        g.fillStyle = hell ? F.kurzHell : F.kurz
        g.fillRect(x, y, ZELLE + 1, ZELLE + 1)
        continue
      }
      if (zustand === 'kaputt') {
        g.fillStyle = hell ? F.erdeHell : F.erde
        g.fillRect(x, y, ZELLE + 1, ZELLE + 1)
        continue
      }

      // Ungemäht: hier steckt die Information, welchen Andruck diese Stelle will.
      const o = OPTIK[zoneVon(sp, ze, w.platz)]
      g.fillStyle = (sp + ze) % 2 === 0 ? o.a : o.b
      g.fillRect(x, y, ZELLE + 1, ZELLE + 1)
      g.strokeStyle = o.strich
      g.lineWidth = 2
      g.beginPath()
      for (let i = 0; i < o.halme; i++) {
        const hx = x + 5 + (i * (ZELLE - 10)) / Math.max(1, o.halme - 1)
        g.moveTo(hx, y + ZELLE - 3)
        g.lineTo(hx + (i % 2 ? 3 : -3), y + ZELLE - 3 - o.hoch)
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
  kreis(g, mx, RASEN_Y + RASEN_H / 2, 58)
  g.stroke()
  g.strokeRect(RASEN_X + 2, RASEN_Y + 2, RASEN_B - 4, RASEN_H - 4)
  g.restore()
}

/**
 * Druckbalken: zeigt, wo der aktuelle Andruck im Band **der Zone unter dem Mäher** liegt.
 *
 * Ohne ihn ist „zu leicht" unsichtbar — eine nicht gemähte Zelle sieht genauso aus, als
 * wäre man nie darübergefahren. Das ist der einzige Kanal, der den Unterschied zeigt.
 */
function druckBalken(g: CanvasRenderingContext2D, w: Welt, zone: Zone) {
  rundRect(g, RASEN_X, BALKEN_Y, RASEN_B, BALKEN_H, 12)
  g.fillStyle = F.balken
  g.fill()
  g.strokeStyle = F.balkenRand
  g.lineWidth = 2
  g.stroke()

  const u = RASEN_X + klemme(bandUnten(w.stufe, zone), 0, 1) * RASEN_B
  const o = RASEN_X + klemme(bandOben(w.stufe, zone), 0, 1) * RASEN_B
  g.save()
  rundRect(g, RASEN_X, BALKEN_Y, RASEN_B, BALKEN_H, 12)
  g.clip()
  g.fillStyle = F.gutRing
  g.globalAlpha = 0.45
  g.fillRect(u, BALKEN_Y, o - u, BALKEN_H)
  g.restore()

  const x = RASEN_X + klemme(w.druck.wert, 0, 1) * RASEN_B
  const art = urteil(w.druck.wert, w.stufe, zone)
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

/** Benennt die Zone unter dem Mäher — sonst muss Ben sich den Zusammenhang erraten. */
function ersatzdruckHinweis(g: CanvasRenderingContext2D, zone: Zone) {
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = F.tinte
  g.font = schrift(19, 800)
  g.fillText(NAME[zone], W / 2, BALKEN_Y - 34)

  // Gleicher Hinweis wie in „Ball hochhalten" — ohne Stift muss man die Ziffern kennen.
  g.globalAlpha = 0.6
  g.font = schrift(14, 600)
  g.fillText(
    `Ersatzdruck ${Math.round(tastenDruckWert() * 100)} % · Tasten 1–9, 0`,
    W / 2,
    BALKEN_Y + BALKEN_H + 18,
  )
  g.globalAlpha = 1
}

function maeher(g: CanvasRenderingContext2D, w: Welt, zone: Zone) {
  if (!w.maeher.drin) return
  const { x, y } = w.maeher
  const art = urteil(w.druck.wert, w.stufe, zone)
  const farbe = art === 'gut' ? F.gutRing : art === 'zu-leicht' ? F.leichtRing : F.festRing

  // Schnittkreis: zeigt genau die Fläche, die der Mäher erwischt.
  g.strokeStyle = farbe
  g.lineWidth = w.maeht ? 6 : 3
  g.globalAlpha = w.maeht ? 1 : 0.6
  kreis(g, x, y, MAEHER_R)
  g.stroke()
  g.globalAlpha = 1

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

/** C2: der geschaffte Platz wird gefeiert, danach geht es weiter — kein Spielende. */
function fertigBanner(g: CanvasRenderingContext2D) {
  const y = RASEN_Y + RASEN_H / 2
  rundRect(g, W / 2 - 190, y - 42, 380, 84, 20)
  g.fillStyle = 'rgba(255,255,255,0.94)'
  g.fill()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = F.tinte
  g.font = schrift(38, 800)
  g.fillText('Platz fertig!', W / 2, y - 8)
  g.font = schrift(19, 600)
  g.fillText('Der nächste wartet schon.', W / 2, y + 26)
}
