/**
 * Zeichnen von „Einlasskontrolle". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2 (reizarme Oberfläche): kein Punktestand, kein Zähler, nie mehr als ein wartender Fan. Die
 * Tribüne ist die Fortschrittsanzeige. Alles außer der Markierung ist ruhig und neutral.
 *
 * Markiert wird mit **Form und Farbe** (gestrichelter gelber Ring und Warndreieck): rund 8 % der
 * Jungen haben eine Rot-Grün-Schwäche, und Rot ist bei manchen Vereinen schon Vereinsfarbe.
 */

import { zeichneFunken } from '../funken'
import { berechneSicht as sichtFuer, klemme, kreis, type Sicht } from '../geometrie'
import { tastenDruckWert } from '../../eingabe'
import {
  FUNKEN_SEK, GEHT_SEK, H, HUEPF_SEK, KISTE, KOMMT_SEK, LAOLA_SEK, REIHEN, TASCHE, W, WACKEL_SEK,
  bandOben, bandUnten, greifAnteil, griffOrt, griffUrteil, hilfeFuer, kisteRadius,
  objektRadius, spielerDerTasche, spruch, type Art, type Ding, type Punkt, type Urteil, type Welt,
} from './welt'

const F = {
  wand: '#dfe6ec',
  boden: '#cfd8e0',
  beton: '#aab6c0',
  sitz: '#c3ccd5',
  tisch: '#e9dfcf',
  tischRand: '#cdbfa8',
  bogen: '#8b98a5',
  futter: '#4d5a68',
  futterRand: '#37424e',
  tinte: '#3b4a5a',
  markierung: '#ffd21f',
  gut: '#2fd06a',
  leicht: '#b9c4cf',
  fest: '#ff9a3c',
  haut: '#f2c49b',
  balken: '#e8eef6',
  balkenRand: '#c3cede',
}

/** Wie der Druck am Ring aussieht. Grau statt Rot: zu leicht ist kein Fehler (C2). */
const RING: Record<Urteil, string> = { gut: F.gut, 'zu-leicht': F.leicht, 'zu-fest': F.fest }

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 600) => `${gewicht} ${px}px ${SCHRIFT}`

type G = CanvasRenderingContext2D

export type { Sicht }

/** Sichtfenster für die Bühne dieses Spiels; gerechnet wird in geometrie.ts. */
export function berechneSicht(breite: number, hoehe: number): Sicht {
  return sichtFuer(breite, hoehe, W, H)
}

/* ── Formhelfer ────────────────────────────────────────────────────────── */

function rundRect(g: G, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}

/** Gefülltes Rechteck mit runden Ecken — daraus bestehen die meisten Dinge. */
function block(g: G, farbe: string, x: number, y: number, w: number, h: number, r: number) {
  g.fillStyle = farbe
  rundRect(g, x, y, w, h, r)
  g.fill()
}

function scheibe(g: G, farbe: string, x: number, y: number, r: number) {
  g.fillStyle = farbe
  kreis(g, x, y, r)
  g.fill()
}

function vieleck(g: G, farbe: string, ...punkte: [number, number][]) {
  g.fillStyle = farbe
  g.beginPath()
  for (const [x, y] of punkte) g.lineTo(x, y)
  g.closePath()
  g.fill()
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(g: G, w: Welt, sicht: Sicht, breite: number, hoehe: number) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.wand
  g.fillRect(0, 0, breite, hoehe)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  tribuene(g, w)
  tisch(g)
  kiste(g, w)
  tasche(g, w)
  fan(g, w)
  dinge(g, w)
  zeichneFunken(g, w.funken, FUNKEN_SEK)
  danke(g, w)
  if (w.laolaUhr > 0) ausverkauft(g)
  hilfe(g, w)
  ersatzdruckHinweis(g, w)
}

/** Mit jeder leeren Tasche füllt sich eine Reihe. Leerer wird sie nie (C2). */
function tribuene(g: G, w: Welt) {
  const unten = 142
  block(g, F.beton, 0, 0, W, unten, 0)
  for (let reihe = 0; reihe < REIHEN; reihe++) {
    const besetzt = reihe < w.taschen
    const y = unten - 9 - reihe * 13
    for (let i = 0; i < 60; i++) {
      const x = 8 + i * 15
      if (!besetzt) {
        block(g, F.sitz, x - 5, y - 3, 10, 7, 2)
        continue
      }
      // La Ola: eine Welle läuft einmal durch die volle Tribüne.
      const welle = w.laolaUhr > 0 && !w.wenigerBewegung
        ? Math.max(0, Math.sin((1 - w.laolaUhr / LAOLA_SEK) * 12 - i * 0.12)) * 5
        : 0
      scheibe(g, (i + reihe) % 3 === 0 ? w.farben.sekundaer : w.farben.primaer, x, y - welle, 5)
      scheibe(g, F.haut, x, y - 5 - welle, 3)
    }
  }
  block(g, w.farben.primaer, 0, unten, W, 8, 0)
}

function tisch(g: G) {
  block(g, F.boden, 0, 150, W, H - 150, 0)
  block(g, F.tischRand, 30, 212, 715, 350, 18)
  block(g, F.tisch, 30, 206, 715, 348, 18)
  // Der Scanner-Bogen über der Tasche. Er hat die Dinge schon gefunden.
  g.strokeStyle = F.bogen
  g.lineWidth = 12
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(TASCHE.x - 20, TASCHE.y + TASCHE.h + 12)
  g.lineTo(TASCHE.x - 20, 182)
  g.lineTo(TASCHE.x + TASCHE.b + 20, 182)
  g.lineTo(TASCHE.x + TASCHE.b + 20, TASCHE.y + TASCHE.h + 12)
  g.stroke()
}

/** Genau so groß gezeichnet, wie sie zählt — eine unsichtbare Toleranz wäre Willkür. */
function kiste(g: G, w: Welt) {
  const r = kisteRadius(w.stufe)
  // Hängt ein Ding am Stift, zeigt ein ruhiger Rand, wohin damit.
  if (w.griff?.gegriffen) {
    g.strokeStyle = F.markierung
    g.lineWidth = 5
    kreis(g, KISTE.x, KISTE.y, r + 8)
    g.stroke()
  }
  scheibe(g, w.farben.primaer, KISTE.x, KISTE.y, r)
  g.strokeStyle = w.farben.sekundaer
  g.lineWidth = 4
  kreis(g, KISTE.x, KISTE.y, r - 6)
  g.stroke()
  scheibe(g, F.futterRand, KISTE.x, KISTE.y, r - 12)
  scheibe(g, F.futter, KISTE.x, KISTE.y + 4, r - 18)

  block(g, '#ffffff', KISTE.x - 58, KISTE.y + r + 14, 116, 34, 8)
  g.fillStyle = F.tinte
  g.font = schrift(20, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('Abgabe', KISTE.x, KISTE.y + r + 32)
}

/** 0 beim Hereinkommen, 1 wenn die Tasche auf dem Tisch steht, beim Gehen wieder 0. */
function daAnteil(w: Welt) {
  if (w.phase === 'kommt') return klemme(1 - w.phaseUhr / KOMMT_SEK, 0, 1)
  if (w.phase === 'geht') return klemme(w.phaseUhr / GEHT_SEK, 0, 1)
  return 1
}

function tasche(g: G, w: Welt) {
  const { x, y, b, h } = TASCHE
  g.save()
  g.globalAlpha = daAnteil(w)
  block(g, w.farben.primaer, x, y, b, h, 34)
  block(g, w.farben.sekundaer, x + 5, y + 5, b - 10, h - 10, 30)
  block(g, w.farben.primaer, x + 9, y + 9, b - 18, h - 18, 27)
  block(g, F.futterRand, x + 14, y + 14, b - 28, h - 28, 24)
  block(g, F.futter, x + 18, y + 18, b - 36, h - 36, 22)

  // Leitidee: ab und zu ist es die Tasche eines Spielers dieses Vereins.
  const spieler = spielerDerTasche(w)
  if (spieler) {
    const text = `Nr. ${spieler.nummer} · ${spieler.name}`
    g.font = schrift(18, 700)
    const breite = g.measureText(text).width + 32
    const mx = x + b / 2
    block(g, '#ffffff', mx - breite / 2, y + h - 12, breite, 34, 10)
    g.fillStyle = F.tinte
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, mx, y + h + 6)
  }
  g.restore()
}

/** Der Fan mit Schal und dahinter das Drehkreuz. Er ist freundlich und nie ungeduldig (C2). */
function fan(g: G, w: Welt) {
  // Drehkreuz: dreht sich, während jemand hindurchgeht.
  const dreh = w.phase === 'geht' ? (1 - w.phaseUhr / GEHT_SEK) * Math.PI : 0
  block(g, F.bogen, 778, 168, 12, 70, 4)
  block(g, F.bogen, 862, 168, 12, 70, 4)
  g.save()
  g.translate(784, 206)
  g.rotate(Math.sin(dreh) * 0.9)
  block(g, F.tinte, 0, -4, 78, 8, 4)
  g.restore()

  let x = 822
  let y = 370
  let s = 1.7
  g.save()
  if (w.phase === 'kommt') x += (w.phaseUhr / KOMMT_SEK) * 140
  if (w.phase === 'geht') {
    // Erst nicken und danken, dann hindurchgehen.
    const t = klemme(((1 - w.phaseUhr / GEHT_SEK) - 0.4) / 0.6, 0, 1)
    y -= t * 190
    s -= t * 0.6
    g.globalAlpha = klemme((1 - t) * 4, 0, 1)
  }
  g.translate(x, y)
  g.scale(s, s)
  block(g, F.tinte, -12, 34, 9, 26, 4)
  block(g, F.tinte, 3, 34, 9, 26, 4)
  block(g, w.farben.primaer, -18, 0, 36, 42, 12)
  scheibe(g, F.haut, 0, -14, 15)
  scheibe(g, F.tinte, -5, -16, 1.8)
  scheibe(g, F.tinte, 5, -16, 1.8)
  g.strokeStyle = F.tinte
  g.lineWidth = 2
  g.beginPath()
  g.arc(0, -13, 7, 0.3, Math.PI - 0.3)
  g.stroke()
  block(g, w.farben.sekundaer, -17, -1, 34, 9, 4)
  block(g, w.farben.sekundaer, 6, 4, 9, 22, 3)
  g.strokeStyle = F.tinte
  g.lineWidth = 1
  rundRect(g, -17, -1, 34, 9, 4)
  g.stroke()
  g.restore()
}

/* ── Dinge ─────────────────────────────────────────────────────────────── */

/** Jedes Ding in einem Feld von −30 bis 30. Schwere sind dunkel und massig, leichte hell und
 *  schmal — daran erkennt Ben, wie fest er drücken muss. */
const FORM: Record<Art, (g: G, farben: Welt['farben']) => void> = {
  flasche: (g) => {
    block(g, '#1f6b4a', -13, -8, 26, 36, 8)
    block(g, '#1f6b4a', -6, -28, 12, 26, 4)
    block(g, '#14493a', -8, -29, 16, 7, 3)
    block(g, '#dfeee6', -13, 4, 26, 12, 2)
  },
  schirm: (g) => {
    vieleck(g, '#4a3b78', [0, -29], [13, 14], [-13, 14])
    vieleck(g, '#6b59a5', [0, -29], [4, 14], [-4, 14])
    g.strokeStyle = '#2d2350'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(0, 14)
    g.lineTo(0, 22)
    g.arc(6, 22, 6, Math.PI, 0, true)
    g.stroke()
  },
  kanne: (g) => {
    block(g, '#39424c', -14, -16, 28, 44, 7)
    block(g, '#6c7782', -14, -2, 28, 6, 0)
    block(g, '#20272e', -10, -29, 20, 15, 4)
    g.strokeStyle = '#20272e'
    g.lineWidth = 5
    g.beginPath()
    g.arc(15, 6, 9, -Math.PI / 2, Math.PI / 2)
    g.stroke()
  },
  pfeife: (g) => {
    block(g, '#eef6ff', -25, -14, 34, 13, 4)
    scheibe(g, '#eef6ff', 8, 3, 17)
    scheibe(g, '#8fb9dd', 8, 3, 6)
    block(g, '#8fb9dd', -8, -14, 8, 6, 1)
  },
  dose: (g) => {
    block(g, '#8fe0f2', -12, -24, 24, 48, 6)
    block(g, '#f4fbfd', -12, -24, 24, 7, 4)
    block(g, '#f4fbfd', -12, 17, 24, 7, 4)
    scheibe(g, '#ffffff', 0, 0, 8)
  },
  troete: (g) => {
    vieleck(g, '#ffd9ec', [-26, -4], [8, -9], [26, -22], [26, 22], [8, 9], [-26, 4])
    block(g, '#e889b9', -28, -6, 9, 12, 3)
    block(g, '#e889b9', 21, -23, 6, 46, 3)
  },
  schal: (g, f) => {
    block(g, f.primaer, -26, -9, 52, 18, 5)
    for (const x of [-26, -6, 14]) block(g, f.sekundaer, x, -9, 11, 18, 3)
    block(g, f.primaer, 12, 2, 14, 24, 3)
  },
  muetze: (g, f) => {
    g.fillStyle = f.primaer
    g.beginPath()
    g.arc(0, 8, 22, Math.PI, 0)
    g.fill()
    block(g, f.sekundaer, -25, 6, 50, 13, 6)
    scheibe(g, f.sekundaer, 0, -17, 8)
  },
  brezel: (g) => {
    g.strokeStyle = '#b87333'
    g.lineWidth = 7
    g.lineCap = 'round'
    kreis(g, -10, 4, 11)
    g.stroke()
    kreis(g, 10, 4, 11)
    g.stroke()
    g.beginPath()
    g.moveTo(-16, -6)
    g.quadraticCurveTo(0, -24, 16, -6)
    g.stroke()
  },
  handschuh: (g) => {
    block(g, '#9a8670', -14, -22, 26, 34, 12)
    block(g, '#9a8670', 4, -6, 20, 11, 6)
    block(g, '#c9b79f', -15, 10, 28, 14, 4)
  },
  kissen: (g, f) => {
    block(g, f.primaer, -24, -20, 48, 40, 14)
    block(g, '#d5cdbf', -19, -15, 38, 30, 11)
    scheibe(g, '#b3a892', 0, 0, 4)
  },
  teddy: (g) => {
    for (const x of [-13, 13]) scheibe(g, '#a8845c', x, -19, 8)
    scheibe(g, '#a8845c', 0, 13, 15)
    scheibe(g, '#b89468', 0, -8, 17)
    scheibe(g, '#e3cba9', 0, -3, 8)
    for (const x of [-6, 6]) scheibe(g, F.tinte, x, -12, 2.4)
    scheibe(g, F.tinte, 0, -5, 2.6)
  },
}

function dinge(g: G, w: Welt) {
  const da = daAnteil(w)
  for (const d of w.dinge) {
    // Das gehaltene Ding kommt zuletzt, sonst verschwände es unter den anderen.
    if (w.griff?.ding === d || (d.abgegeben && !d.huepfer)) continue
    ding(g, w, d, d.abgegeben ? 1 : da)
  }
  gegriffenes(g, w)
}

/** Wo ein hüpfendes Ding gerade ist: ein kleiner Bogen nach oben, beim Wegflutschen zur Seite. */
function ort(d: Ding): Punkt & { t: number } {
  if (!d.huepfer) return { x: d.x, y: d.y, t: 1 }
  const { von, nach, uhr, seite } = d.huepfer
  const t = 1 - uhr / HUEPF_SEK
  const bogen = Math.sin(t * Math.PI)
  return {
    x: von.x + (nach.x - von.x) * t + bogen * seite,
    y: von.y + (nach.y - von.y) * t - bogen * 34,
    t,
  }
}

function ding(g: G, w: Welt, d: Ding, alpha: number) {
  const p = ort(d)
  const r = objektRadius(w.stufe)
  g.save()
  g.globalAlpha = alpha
  g.translate(p.x, p.y)
  // In der Kiste wird es kleiner: es fällt hinein.
  const s = (r / 30) * (d.abgegeben ? 1 - 0.6 * p.t : 1)
  if (d.gewicht && !d.abgegeben) leuchten(g, w, r)
  if (d.wackelUhr > 0) g.rotate(Math.sin((d.wackelUhr / WACKEL_SEK) * Math.PI * 4) * 0.16)
  g.save()
  g.scale(s, s)
  FORM[d.art](g, w.farben)
  g.restore()
  if (d.gewicht && !d.abgegeben) markierung(g, w, r)
  g.restore()
}

/** Ruhig: höchstens ein langsames Atmen, kein Blinken (A2). */
const atem = (w: Welt) => (w.wenigerBewegung ? 1 : 0.9 + 0.1 * Math.sin(w.zeitGesamt * Math.PI))

/** Der Schein unter einem markierten Ding — in der Anweisung steht „leuchten". */
function leuchten(g: G, w: Welt, r: number) {
  g.save()
  g.globalAlpha *= 0.35 * atem(w)
  scheibe(g, F.markierung, 0, 0, r + 4)
  g.restore()
}

function markierung(g: G, w: Welt, r: number) {
  g.save()
  g.globalAlpha *= atem(w)
  g.strokeStyle = F.markierung
  g.lineWidth = 4
  g.setLineDash([9, 6])
  kreis(g, 0, 0, r + 4)
  g.stroke()
  g.restore()
  // Warndreieck oben rechts am Ring.
  const x = (r + 4) * 0.72
  const y = -(r + 4) * 0.72
  vieleck(g, F.tinte, [x, y - 13], [x + 13, y + 9], [x - 13, y + 9])
  vieleck(g, F.markierung, [x, y - 9], [x + 9.5, y + 7], [x - 9.5, y + 7])
  block(g, F.tinte, x - 1.4, y - 4, 2.8, 6, 1)
  scheibe(g, F.tinte, x, y + 4.5, 1.5)
}

/** Das Ding unter dem Stift: sinkt ein, staucht sich oder schwebt — je nach Druck (A1). */
function gegriffenes(g: G, w: Welt) {
  const gr = w.griff
  if (!gr) return
  const p = griffOrt(gr)
  const u = griffUrteil(w, gr)
  const r = objektRadius(w.stufe)
  const s = r / 30

  if (gr.gegriffen) {
    g.fillStyle = 'rgba(30,40,50,0.3)'
    g.beginPath()
    g.ellipse(p.x + 5, p.y + r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2)
    g.fill()
  }

  g.save()
  g.translate(p.x, p.y + (u === 'zu-leicht' ? 3 : 0))
  if (!gr.gegriffen) leuchten(g, w, r)
  g.save()
  const gross =gr.gegriffen ? 1.1 : 1
  g.scale(s * gross, s * gross * (u === 'zu-fest' ? 0.8 : 1))
  FORM[gr.ding.art](g, w.farben)
  g.restore()
  if (!gr.gegriffen) markierung(g, w, r)
  g.restore()

  // Greifring: füllt sich nur, solange der Druck stimmt. Außerhalb des Stifts, damit die Hand
  // ihn nicht verdeckt.
  g.lineWidth = 7
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  kreis(g, p.x, p.y, r + 15)
  g.stroke()
  g.strokeStyle = RING[u]
  if (u === 'gut') {
    g.beginPath()
    g.arc(p.x, p.y, r + 15, -Math.PI / 2, -Math.PI / 2 + greifAnteil(w, gr) * Math.PI * 2)
    g.stroke()
  } else {
    kreis(g, p.x, p.y, r + 15)
    g.stroke()
  }
}

/** Ist die Tasche leer, bedankt sich der Fan mit einem Spruch seines Vereins. */
function danke(g: G, w: Welt) {
  const s = spruch(w)
  if (w.phase !== 'geht' || !s) return
  const fremd = s.uebersetzung !== s.text
  g.save()
  g.font = schrift(24, 800)
  let breite = g.measureText(s.text).width
  g.font = schrift(17, 600)
  if (fremd) breite = Math.max(breite, g.measureText(s.uebersetzung).width)
  breite += 40
  const hoehe = fremd ? 74 : 52
  const x = 760 - breite
  const y = 330 - hoehe / 2
  block(g, '#ffffff', x, y, breite, hoehe, 16)
  vieleck(g, '#ffffff', [758, 318], [758, 342], [782, 334])
  g.fillStyle = F.tinte
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = schrift(24, 800)
  g.fillText(s.text, x + breite / 2, fremd ? y + 27 : y + hoehe / 2)
  if (fremd) {
    g.font = schrift(17, 600)
    g.fillText(s.uebersetzung, x + breite / 2, y + 54)
  }
  g.restore()
}

/** Einmal, wenn die Tribüne voll ist. Danach geht es einfach weiter. */
function ausverkauft(g: G) {
  block(g, 'rgba(255,255,255,0.94)', W / 2 - 150, 40, 300, 66, 18)
  g.fillStyle = F.tinte
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = schrift(36, 800)
  g.fillText('Ausverkauft!', W / 2, 74)
}

/** Hilfe statt Abbruch (C2): der Druckbalken mit dem Band des Dings, das schon dreimal entwischt
 *  ist. Er zeigt nur, er macht nichts leichter. */
function hilfe(g: G, w: Welt) {
  const d = hilfeFuer(w)
  if (!d?.gewicht) return
  const x = 250
  const y = 586
  const b = 420
  const h = 24
  block(g, F.balken, x, y, b, h, 12)
  const u = x + klemme(bandUnten(w.stufe, d.gewicht, w.regler.toleranz), 0, 1) * b
  const o = x + klemme(bandOben(w.stufe, d.gewicht, w.regler.toleranz), 0, 1) * b
  g.save()
  rundRect(g, x, y, b, h, 12)
  g.clip()
  g.globalAlpha = 0.5
  g.fillStyle = F.gut
  g.fillRect(u, y, o - u, h)
  g.restore()
  g.strokeStyle = F.balkenRand
  g.lineWidth = 2
  rundRect(g, x, y, b, h, 12)
  g.stroke()

  // Das Ding daneben, damit klar ist, um welches es geht.
  g.save()
  g.translate(x - 30, y + h / 2)
  g.scale(0.65, 0.65)
  FORM[d.art](g, w.farben)
  g.restore()

  const z = x + klemme(w.griff?.druck ?? w.druck, 0, 1) * b
  g.fillStyle = F.tinte
  g.fillRect(z - 3, y - 4, 6, h + 8)
  g.font = schrift(15, 700)
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillText('zu leicht', x + 10, y + h / 2)
  g.textAlign = 'right'
  g.fillText('zu fest', x + b - 10, y + h / 2)
}

/** Nur zum Testen mit der Maus. Auf dem iPad mit Pencil erscheint er nie (A5). */
function ersatzdruckHinweis(g: G, w: Welt) {
  if (w.geraet !== 'mouse' || !w.synthetisch) return
  g.save()
  g.globalAlpha = 0.6
  g.fillStyle = F.tinte
  g.font = schrift(14, 600)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(
    `Ersatzdruck ${Math.round(tastenDruckWert() * 100)} % · Taste 3 für Leichtes, 6 für Schweres`,
    W / 2,
    H - 14,
  )
  g.restore()
}
