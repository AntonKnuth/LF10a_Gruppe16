/**
 * Zeichnen von „Platz aufräumen". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2 (reizarme Oberfläche): kein Zähler, keine Uhr im Bild. Der Fortschritt ist der saubere
 * Rasen. Bewegt sind nur die Kamera, das Konfetti und kurz die Funken.
 *
 * Zeichenreihenfolge: Rasen → Linien → Müll → Kreise → Greiferschatten → Seile → Kamera → Funken.
 */

import { zeichneFunken } from '../funken'
import { berechneSicht as sichtFuer, kreis, type Sicht } from '../geometrie'
import {
  FUNKEN_SEK, H, HINWEIS_SEK, SCHWENK_SEK, VERBLASS_SEK, W, abschnittVon, greiferRadius,
  kameraAnteil, ringGross, spruch, toleranzVon, type Muell, type Punkt, type Welt,
} from './welt'

const F = {
  rasen: '#4f9a3c',
  rasenHell: '#5aa845',
  linie: '#ffffff',
  papier: '#e4e7ea',
  papierFalte: '#a9b1ba',
  gelb: '#ffc800',
  seil: '#2f3740',
  kamera: '#3a4450',
  linse: '#9fd3ff',
  mast: '#8a96a3',
  tinte: '#3b4a5a',
}

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 600) => `${gewicht} ${px}px ${SCHRIFT}`

/** Höhe der Bande oben. Darunter beginnt der Rasen. */
const BANDE = 28

type G = CanvasRenderingContext2D

export type { Sicht }

/** Sichtfenster für die Bühne dieses Spiels; gerechnet wird in geometrie.ts. */
export function berechneSicht(breite: number, hoehe: number): Sicht {
  return sichtFuer(breite, hoehe, W, H)
}

function pfad(g: G, punkte: Punkt[], zu: boolean) {
  g.beginPath()
  for (const p of punkte) g.lineTo(p.x, p.y)
  if (zu) g.closePath()
}

/**
 * Seitlicher Versatz während des Schwenks: der alte Abschnitt gleitet links hinaus, der neue
 * kommt von rechts herein. So sieht es aus, als fahre die Kamera, und nicht wie ein Schnitt.
 */
function schwenkVersatz(w: Welt) {
  if (w.schwenkUhr <= 0) return 0
  const u = 1 - w.schwenkUhr / SCHWENK_SEK
  return u < 0.5 ? -u * 2 * W * 0.6 : (1 - u) * 2 * W * 0.6
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(g: G, w: Welt, sicht: Sicht, breite: number, hoehe: number) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.rasen
  g.fillRect(0, 0, breite, hoehe)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  g.save()
  g.beginPath()
  g.rect(0, 0, W, H)
  g.clip()

  const versatz = schwenkVersatz(w)
  rasen(g, versatz)
  g.save()
  g.translate(versatz, 0)
  linien(g, w)
  for (const m of w.muell) if (!m.eingesammelt) muell(g, w, m)
  g.restore()

  kreise(g, w)
  strich(g, w)
  hinweis(g, w)
  bande(g, w)
  kamera(g, w)
  zeichneFunken(g, w.funken, FUNKEN_SEK)
  g.restore()

  if (w.schwenkUhr > SCHWENK_SEK / 2) sauberBanner(g, w)
  else if (w.fund) fundZeile(g, w)
}

/** Mähstreifen wie auf einem echten Platz. Sie gleiten mit dem Schwenk. */
function rasen(g: G, versatz: number) {
  const breite = 60
  const start = (((versatz % (2 * breite)) + 2 * breite) % (2 * breite)) - 2 * breite
  g.fillStyle = F.rasenHell
  for (let x = start; x < W; x += 2 * breite) g.fillRect(x, 0, breite, H)
}

/** Bande in Vereinsfarben oben, an den Ecken die Masten der Seilkamera. */
function bande(g: G, w: Welt) {
  g.fillStyle = w.farben.primaer
  g.fillRect(0, 0, W, BANDE)
  g.fillStyle = w.farben.sekundaer
  g.globalAlpha = 0.6
  for (let x = 12; x < W; x += 96) g.fillRect(x, 10, 48, 8)
  g.globalAlpha = 1
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    g.fillStyle = F.mast
    kreis(g, x, y, 16)
    g.fill()
  }
}

/** Jeder Abschnitt hat seine Platzlinien — Ben sieht, wo auf dem Platz er gerade aufräumt. */
function linien(g: G, w: Welt) {
  g.save()
  g.strokeStyle = F.linie
  g.globalAlpha = 0.8
  g.lineWidth = 5
  const linie = (x0: number, y0: number, x1: number, y1: number) => {
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
  }
  const punkt = (x: number, y: number) => {
    g.fillStyle = F.linie
    kreis(g, x, y, 6)
    g.fill()
  }
  switch (abschnittVon(w.nummer)) {
    case 'strafraum':
      linie(40, BANDE, 40, H)
      g.strokeRect(40, 120, 260, 440)
      g.strokeRect(40, 250, 80, 180)
      punkt(220, 340)
      g.beginPath()
      g.arc(220, 340, 110, -0.75, 0.75)
      g.stroke()
      break
    case 'mittelkreis':
      linie(450, BANDE, 450, H)
      kreis(g, 450, 340, 120)
      g.stroke()
      punkt(450, 340)
      break
    case 'eckfahne':
      linie(40, BANDE, 40, 600)
      linie(40, 600, W, 600)
      g.beginPath()
      g.arc(40, 600, 40, -Math.PI / 2, 0)
      g.stroke()
      g.strokeRect(40, 160, 200, 440)
      eckfahne(g, w, 40, 600)
      break
    case 'seitenlinie':
      linie(0, 600, W, 600)
      linie(450, BANDE, 450, 600)
      g.beginPath()
      g.arc(450, 600, 120, Math.PI, 0)
      g.stroke()
      break
    case 'torraum':
      linie(860, BANDE, 860, H)
      g.strokeRect(600, 120, 260, 440)
      g.strokeRect(780, 250, 80, 180)
      punkt(680, 340)
      g.lineWidth = 3
      g.strokeRect(860, 290, 30, 100)
      break
  }
  g.restore()
}

function eckfahne(g: G, w: Welt, x: number, y: number) {
  g.globalAlpha = 1
  g.strokeStyle = F.mast
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - 46)
  g.stroke()
  g.fillStyle = w.farben.primaer
  g.beginPath()
  g.moveTo(x, y - 46)
  g.lineTo(x + 26, y - 38)
  g.lineTo(x, y - 30)
  g.fill()
}

/* ── Müll ──────────────────────────────────────────────────────────────── */

/** Becher und Wimpel tragen Vereinsfarben: das ist der Fanmüll *dieses* Vereins. */
function muell(g: G, w: Welt, m: Muell) {
  const { x, y, r } = m
  g.save()
  g.translate(x, y)
  if (m.vorgemerkt) {
    // Erfasst: ein heller Rand zeigt, dass die Kamera es gleich holt.
    g.strokeStyle = F.gelb
    g.lineWidth = 3
    kreis(g, 0, 0, r + 6)
    g.stroke()
  }
  switch (m.art) {
    case 'becher':
      g.rotate(0.5)
      g.fillStyle = w.farben.primaer
      g.beginPath()
      g.moveTo(-r * 0.9, -r * 0.55)
      g.lineTo(r * 0.9, -r * 0.35)
      g.lineTo(r * 0.9, r * 0.35)
      g.lineTo(-r * 0.9, r * 0.55)
      g.closePath()
      g.fill()
      g.fillStyle = w.farben.sekundaer
      g.fillRect(-r * 0.2, -r * 0.48, r * 0.3, r * 0.96)
      g.beginPath()
      g.ellipse(-r * 0.9, 0, r * 0.22, r * 0.55, 0, 0, Math.PI * 2)
      g.fill()
      break
    case 'papier':
      g.fillStyle = F.papier
      kreis(g, 0, 0, r)
      g.fill()
      g.strokeStyle = F.papierFalte
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(-r * 0.6, -r * 0.2)
      g.lineTo(-r * 0.1, r * 0.1)
      g.lineTo(r * 0.5, -r * 0.4)
      g.moveTo(-r * 0.3, r * 0.6)
      g.lineTo(r * 0.3, r * 0.3)
      g.stroke()
      break
    case 'wimpel':
      g.rotate(-0.4)
      g.fillStyle = w.farben.primaer
      g.beginPath()
      g.moveTo(-r, -r * 0.6)
      g.lineTo(r, 0)
      g.lineTo(-r, r * 0.6)
      g.closePath()
      g.fill()
      g.fillStyle = w.farben.sekundaer
      g.fillRect(-r, -r * 0.6, r * 0.3, r * 1.2)
      break
    case 'konfetti': {
      // Farbe und Drehung aus der Lage statt Zufall — jedes Bild sieht gleich aus.
      const nr = Math.round(x * 3 + y * 7)
      g.rotate((nr % 6) * 0.5)
      g.fillStyle = [w.farben.primaer, F.gelb, w.farben.sekundaer][nr % 3]
      g.fillRect(-r, -r * 0.6, r * 2, r * 1.2)
      break
    }
    case 'fundstueck':
      // Schienbeinschoner: hell mit Rand in Vereinsfarbe.
      g.rotate(0.3)
      g.fillStyle = '#ffffff'
      g.strokeStyle = w.farben.primaer
      g.lineWidth = 4
      g.beginPath()
      g.roundRect(-r * 0.6, -r, r * 1.2, r * 2, r * 0.5)
      g.fill()
      g.stroke()
      break
  }
  g.restore()
}

/* ── Kreise ────────────────────────────────────────────────────────────── */

/** Geschlossene Kreise füllen sich halbtransparent; was nichts geholt hat, verblasst. */
function kreise(g: G, w: Welt) {
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  for (const a of w.auftraege) {
    g.globalAlpha = 0.35
    g.fillStyle = w.farben.primaer
    pfad(g, a.punkte, true)
    g.fill()
    g.globalAlpha = 1
    linienzug(g, w, a.punkte, true)
  }
  for (const v of w.verblassen) {
    g.globalAlpha = Math.max(0, v.uhr / VERBLASS_SEK) * (v.art === 'erledigt' ? 0.5 : 0.8)
    linienzug(g, w, v.punkte, v.art !== 'offen')
  }
  g.restore()
}

/** Strich in Vereinsfarbe mit weißem Rand — auf jedem Rasen und bei jeder Vereinsfarbe sichtbar. */
function linienzug(g: G, w: Welt, punkte: Punkt[], zu: boolean) {
  g.strokeStyle = '#ffffff'
  g.lineWidth = 10
  pfad(g, punkte, zu)
  g.stroke()
  g.strokeStyle = w.farben.primaer
  g.lineWidth = 5
  g.stroke()
}

/** Der Strich wächst mit jedem Zeigerpunkt (A1). Der Startpunkt leuchtet, wenn der Kreis gleich zugeht. */
function strich(g: G, w: Welt) {
  const s = w.strich
  if (!s) return
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const start = s[0]
  const r = toleranzVon(w) * (ringGross(w) ? 2 : 1)
  g.globalAlpha = w.nahStart ? 0.85 : 0.35
  g.fillStyle = w.nahStart ? F.gelb : '#ffffff'
  kreis(g, start.x, start.y, r)
  g.fill()
  g.globalAlpha = 1
  linienzug(g, w, s, false)
  g.fillStyle = '#ffffff'
  kreis(g, start.x, start.y, 7)
  g.fill()
  g.restore()
}

/** Gestrichelter Greiferkreis: so groß darf ein Kreis höchstens sein. Ein Hinweis, keine Meldung. */
function hinweis(g: G, w: Welt) {
  const h = w.hinweis
  if (!h) return
  g.save()
  g.globalAlpha = Math.min(1, (h.uhr / HINWEIS_SEK) * 2)
  g.setLineDash([14, 10])
  g.strokeStyle = '#ffffff'
  g.lineWidth = 4
  kreis(g, h.x, h.y, greiferRadius(w.stufe))
  g.stroke()
  g.restore()
}

/* ── Seilkamera ────────────────────────────────────────────────────────── */

/**
 * Draufsicht: vier Seile zu den Masten, darunter ein Schatten. Beim Greifen senkt sich die Kamera —
 * sie wird kleiner und der Schatten rückt unter sie.
 */
function kamera(g: G, w: Welt) {
  const k = w.kamera
  const senkung = k.phase === 'greift' ? Math.sin(kameraAnteil(w) * Math.PI) : 0
  const hoehe = 1 - senkung * 0.75

  g.save()
  g.globalAlpha = 0.22
  g.fillStyle = '#000000'
  g.beginPath()
  g.ellipse(k.x + 16 * hoehe, k.y + 22 * hoehe, 22, 14, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()

  g.strokeStyle = F.seil
  g.lineWidth = 2
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(k.x, k.y)
    g.stroke()
  }

  const s = 0.8 + 0.2 * hoehe
  g.save()
  g.translate(k.x, k.y)
  g.scale(s, s)
  // Greifer: drei Finger, die sich beim Senken schließen.
  g.strokeStyle = F.kamera
  g.lineWidth = 4
  g.lineCap = 'round'
  const auf = 22 - senkung * 12
  for (const winkel of [Math.PI / 2, Math.PI / 2 + 2.1, Math.PI / 2 - 2.1]) {
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(Math.cos(winkel) * auf, Math.sin(winkel) * auf)
    g.stroke()
  }
  g.fillStyle = F.kamera
  g.beginPath()
  g.roundRect(-20, -15, 40, 30, 7)
  g.fill()
  g.fillStyle = w.farben.primaer
  g.fillRect(-20, -15, 40, 6)
  g.fillStyle = F.linse
  kreis(g, 0, 3, 7)
  g.fill()
  g.restore()
}

/* ── Texte ─────────────────────────────────────────────────────────────── */

function blase(g: G, zeilen: [string, number][], y: number) {
  g.save()
  let breite = 0
  for (const [text, px] of zeilen) {
    g.font = schrift(px, 800)
    breite = Math.max(breite, g.measureText(text).width)
  }
  breite += 48
  const hoehe = 20 + zeilen.reduce((s, [, px]) => s + px * 1.35, 0)
  g.fillStyle = '#ffffff'
  g.globalAlpha = 0.95
  g.beginPath()
  g.roundRect(W / 2 - breite / 2, y - hoehe / 2, breite, hoehe, 16)
  g.fill()
  g.globalAlpha = 1
  g.fillStyle = F.tinte
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let zy = y - hoehe / 2 + 10
  for (const [text, px] of zeilen) {
    g.font = schrift(px, px > 20 ? 800 : 600)
    g.fillText(text, W / 2, zy + (px * 1.35) / 2)
    zy += px * 1.35
  }
  g.restore()
}

/** „Sauber!" mit einem Spruch des Vereins, fremdsprachig immer mit Übersetzung. */
function sauberBanner(g: G, w: Welt) {
  const s = spruch(w)
  const zeilen: [string, number][] = [['Sauber!', 30]]
  if (s) zeilen.push([s.text, 22])
  if (s && s.uebersetzung !== s.text) zeilen.push([s.uebersetzung, 17])
  blase(g, zeilen, H / 2)
}

/** Ab und zu liegt ein verlorenes Fundstück eines Spielers dabei (Leitidee). Kein Zähler. */
function fundZeile(g: G, w: Welt) {
  const f = w.fund
  if (!f) return
  blase(g, [[`Schienbeinschoner von Nr. ${f.nummer} ${f.name} gefunden`, 18]], H - 40)
}
