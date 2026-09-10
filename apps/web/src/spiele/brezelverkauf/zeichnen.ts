/**
 * Zeichnen von „Brezelverkauf". Liest nur aus der Welt und verändert sie nie —
 * dadurch bleibt die Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2: kein Punktestand, keine Prozentzahl. Was zu tun ist, sagt die Sprechblase; wie gut es
 * lief, sagt die Farbe der gezeichneten Linie.
 *
 * Die Wege sind **sichtbar breit** gezeichnet, genau so breit wie die eingestellte Toleranz.
 * Eine unsichtbare Toleranz wäre für ein Kind Willkür: die Figur käme nicht vom Fleck, ohne
 * dass zu sehen ist, warum.
 */

import {
  DANK_SPRUECHE, GREIF_ABSTAND, H, MITTE, PLAETZE, W, WACKEL_SEK, WEGE, laeuferPunkt, toleranz,
  verkaeufer, type Punkt, type Welt,
} from './welt'

const F = {
  beton: '#c9d2da',
  betonDunkel: '#aab6c0',
  rasen: '#3f9d1e',
  rasenHell: '#4cb327',
  kreide: '#ffffff',
  weg: '#f2f5f8',
  drin: '#2fd06a',
  daneben: '#ff4b4b',
  haut: '#f2c49b',
  laeufer: '#48586a',
  /** Hervorhebung des Bestellers — vereinsunabhängig, damit sie auf jedem Wappen sichtbar ist. */
  ruf: '#ffb020',
  tinte: '#3b4a5a',
  blase: '#ffffff',
  brezel: '#9a5a1e',
  becher: '#e64f3a',
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

function pfad(g: CanvasRenderingContext2D, punkte: Punkt[]) {
  g.beginPath()
  g.moveTo(punkte[0].x, punkte[0].y)
  for (let i = 1; i < punkte.length; i++) g.lineTo(punkte[i].x, punkte[i].y)
}

/** Ein Mensch von oben: Kopf, Schultern. Mehr braucht es bei dieser Größe nicht. */
function person(g: CanvasRenderingContext2D, x: number, y: number, farbe: string, r = 7) {
  g.fillStyle = farbe
  kreis(g, x, y + r * 0.5, r * 1.1)
  g.fill()
  g.fillStyle = F.haut
  kreis(g, x, y - r * 0.3, r * 0.72)
  g.fill()
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(
  g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number,
) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.beton
  g.fillRect(0, 0, breite, hoehe)

  // Ein Zusammenstoß wackelt spürbar, klingt aber schnell ab: der Ausschlag folgt der
  // Restzeit, damit das Bild nicht abrupt stehenbleibt.
  const kraft = w.wackelUhr > 0 ? (w.wackelUhr / WACKEL_SEK) * 9 : 0
  const rx = kraft ? (Math.random() - 0.5) * 2 * kraft : 0
  const ry = kraft ? (Math.random() - 0.5) * 2 * kraft : 0

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx + rx * sicht.s, sicht.dy + ry * sicht.s)
  spielfeld(g)
  wege(g, w)
  sitzplaetze(g, w)
  linie(g, w)
  laeufer(g, w)
  blase(g, w)
  figur(g, w)
}

/** Das Spielfeld in der Mitte — der Grund, warum überhaupt jemand auf der Tribüne sitzt. */
function spielfeld(g: CanvasRenderingContext2D) {
  g.save()
  g.beginPath()
  g.ellipse(MITTE.x, MITTE.y, 168, 104, 0, 0, Math.PI * 2)
  g.fillStyle = F.rasen
  g.fill()
  g.clip()
  for (let i = 0; i * 40 < W; i++) {
    if (i % 2 === 0) continue
    g.fillStyle = F.rasenHell
    g.fillRect(MITTE.x - 168 + i * 40, MITTE.y - 104, 40, 208)
  }
  g.restore()

  g.strokeStyle = F.kreide
  g.globalAlpha = 0.8
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(MITTE.x, MITTE.y, 168, 104, 0, 0, Math.PI * 2)
  g.stroke()
  kreis(g, MITTE.x, MITTE.y, 34)
  g.stroke()
  g.globalAlpha = 1
}

/** Ränge und Treppen, genau so breit wie die Toleranz — deshalb ist sichtbar, was erlaubt ist. */
function wege(g: CanvasRenderingContext2D, w: Welt) {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const weg of WEGE) {
    g.lineWidth = toleranz(w.stufe) * 2
    g.strokeStyle = F.weg
    pfad(g, weg)
    g.stroke()

    g.lineWidth = 2
    g.strokeStyle = F.betonDunkel
    g.globalAlpha = 0.5
    pfad(g, weg)
    g.stroke()
    g.globalAlpha = 1
  }
  g.restore()
}

/**
 * Die Zuschauer auf ihren Plätzen, in den Vereinsfarben. Der Besteller sitzt hervorgehoben.
 *
 * Die Hervorhebung ist bewusst **keine** Vereinsfarbe: beim HSV ist die zweite Farbe Weiß,
 * und ein weißer Zuschauer auf hellem Beton ist unsichtbar. Ein neuer Verein darf die
 * wichtigste Figur des Spiels nicht unlesbar machen.
 */
function sitzplaetze(g: CanvasRenderingContext2D, w: Welt) {
  for (const p of PLAETZE) {
    const bestellt = w.besteller === p
    if (bestellt) {
      const puls = 0.5 + 0.5 * Math.sin(w.zeitGesamt * 5)
      g.fillStyle = F.ruf
      g.globalAlpha = 0.25 + 0.3 * puls
      kreis(g, p.x, p.y + 2, 20 + puls * 3)
      g.fill()
      g.globalAlpha = 1
      g.strokeStyle = F.ruf
      g.lineWidth = 3
      kreis(g, p.x, p.y + 2, 16)
      g.stroke()
    }
    person(g, p.x, p.y, w.farben.primaer, bestellt ? 9 : 7)
  }
}

/** Der gezeichnete Weg: grün, wo er auf einem Weg der Tribüne lag, rot quer durch die Reihen. */
function linie(g: CanvasRenderingContext2D, w: Welt) {
  if (w.linie.length < 2) return
  g.save()
  g.lineWidth = 7
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 1; i < w.linie.length; i++) {
    const a = w.linie[i - 1]
    const b = w.linie[i]
    g.strokeStyle = b.daneben ? F.daneben : F.drin
    g.globalAlpha = b.daneben ? 0.9 : 0.75
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }
  g.restore()
}

function laeufer(g: CanvasRenderingContext2D, w: Welt) {
  for (const l of w.laeufer) {
    const p = laeuferPunkt(l)
    g.globalAlpha = 0.25
    g.fillStyle = F.tinte
    g.beginPath()
    g.ellipse(p.x, p.y + 9, 11, 4, 0, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
    person(g, p.x, p.y, F.laeufer, 10)
  }
}

/** Sprechblase über dem Besteller: erst der Wunsch, nach der Abgabe der Dank (C5-Tonfall). */
function blase(g: CanvasRenderingContext2D, w: Welt) {
  const p = w.besteller
  if (!p) return
  const dankt = w.dankUhr > 0
  const text = dankt ? w.dankSpruch || DANK_SPRUECHE[0] : ''

  g.save()
  g.font = schrift(20, 700)
  const breite = dankt ? Math.max(120, g.measureText(text).width + 34) : 74
  const hoehe = 54
  // Nach oben, außer der Platz liegt schon oben am Bildrand.
  const oben = p.y - hoehe - 26 > 6
  const y = oben ? p.y - hoehe - 26 : p.y + 26

  g.fillStyle = F.blase
  rundRect(g, p.x - breite / 2, y, breite, hoehe, 14)
  g.fill()
  g.beginPath()
  g.moveTo(p.x - 9, oben ? y + hoehe : y)
  g.lineTo(p.x + 9, oben ? y + hoehe : y)
  g.lineTo(p.x, oben ? y + hoehe + 14 : y - 14)
  g.closePath()
  g.fill()

  if (dankt) {
    g.fillStyle = F.tinte
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, p.x, y + hoehe / 2)
  } else if (w.wunsch === 'brezel') {
    brezel(g, p.x, y + hoehe / 2)
  } else {
    becher(g, p.x, y + hoehe / 2)
  }
  g.restore()
}

function brezel(g: CanvasRenderingContext2D, x: number, y: number) {
  g.save()
  g.translate(x, y)
  g.strokeStyle = F.brezel
  g.lineWidth = 6
  g.lineCap = 'round'
  kreis(g, -8, 2, 8)
  g.stroke()
  kreis(g, 8, 2, 8)
  g.stroke()
  g.beginPath()
  g.moveTo(-11, -4)
  g.quadraticCurveTo(0, -18, 11, -4)
  g.stroke()
  g.restore()
}

function becher(g: CanvasRenderingContext2D, x: number, y: number) {
  g.save()
  g.translate(x, y)
  g.fillStyle = F.becher
  g.beginPath()
  g.moveTo(-10, -12)
  g.lineTo(10, -12)
  g.lineTo(7, 14)
  g.lineTo(-7, 14)
  g.closePath()
  g.fill()
  g.fillStyle = '#ffffff'
  rundRect(g, -12, -16, 24, 6, 3)
  g.fill()
  g.fillStyle = F.tinte
  rundRect(g, 2, -26, 4, 14, 2)
  g.fill()
  g.restore()
}

/** Der Verkäufer mit dem Bauchladen. Steht er still, pulst ein Ring: dort geht ein Weg los. */
function figur(g: CanvasRenderingContext2D, w: Welt) {
  const p = verkaeufer(w)

  if (!w.zieht) {
    const puls = 0.5 + 0.5 * Math.sin(w.zeitGesamt * 4)
    g.strokeStyle = F.drin
    g.globalAlpha = 0.25 + 0.35 * puls
    g.lineWidth = 4
    kreis(g, p.x, p.y, GREIF_ABSTAND * 0.55 + puls * 6)
    g.stroke()
    g.globalAlpha = 1
  }

  g.globalAlpha = 0.28
  g.fillStyle = F.tinte
  g.beginPath()
  g.ellipse(p.x, p.y + 12, 14, 5, 0, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1

  person(g, p.x, p.y - 2, w.farben.primaer, 12)

  // Bauchladen: das Brett vor dem Bauch, darauf Brezel und Becher.
  g.fillStyle = '#c98f4a'
  rundRect(g, p.x - 20, p.y + 8, 40, 12, 4)
  g.fill()
  g.strokeStyle = F.brezel
  g.lineWidth = 3
  kreis(g, p.x - 10, p.y + 14, 4)
  g.stroke()
  g.fillStyle = F.becher
  rundRect(g, p.x + 5, p.y + 9, 8, 10, 2)
  g.fill()
}
