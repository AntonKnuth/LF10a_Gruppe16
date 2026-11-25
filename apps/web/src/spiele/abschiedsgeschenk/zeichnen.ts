/**
 * Zeichnen der „Urkunde". Liest nur aus der Welt und verändert sie nie — dadurch bleibt die
 * Logik in welt.ts ohne Canvas testbar.
 *
 * Zweigeteilt:
 *   - `zeichneUrkunde` malt das Blatt selbst: Rahmen, Texte, Wappen, Lineatur, Vorlage, Tinte.
 *     Sie bekommt nur, was auf dem Blatt steht, und kennt weder Schritt noch Uhr. So kann das
 *     Lob nach der Smiley-Frage (#8) dieselbe Urkunde mit Bens Strichen zeichnen und auf
 *     `PROFI_LINIE` Profi-Unterschrift und Stempel ergänzen.
 *   - `zeichne` ist das Bild des Spiels: Himmel, Auf- und Einrollen, Leuchten des Bands.
 *
 * A2: keine Sterne, keine Zahl, kein Lob. Die Urkunde bleibt im Spiel neutral (C3).
 */

import {
  AUFROLLEN_SEK, EINROLLEN_SEK, GRUNDLINIE_Y, H, W, unterlinieY, type Welt,
} from './welt'

const F = {
  himmel: '#c6e9fb',
  papier: '#fffdf5',
  schrift: '#334155',
  leise: '#64748b',
  linie: '#334155',
  hilfslinie: '#93c5fd',
  vorlage: '#cbd5e1',
  tinte: '#1e3a8a',
  schatten: 'rgba(31,53,80,0.22)',
  rolle: '#f3eedc',
}

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 600) => `${gewicht} ${px}px ${SCHRIFT}`

/** Das Blatt auf der Bühne. Unten bleibt Platz für den „Fertig"-Knopf. */
export const URKUNDE = { x: 60, y: 16, b: 780, h: 548 }

/** Die leere Linie für den Profi rechts neben Bens Band. Im Spiel bleibt sie leer. */
export const PROFI_LINIE = { x: 700, y: GRUNDLINIE_Y, breite: 110 }

/** Sichtfenster: Maßstab und Rand, damit die 900×640-Bühne mittig ins Canvas passt. */
export type Sicht = { s: number; dx: number; dy: number }

export function berechneSicht(breite: number, hoehe: number): Sicht {
  const s = Math.min(breite / W, hoehe / H)
  return { s, dx: (breite - W * s) / 2, dy: (hoehe - H * s) / 2 }
}

/** Alles, was auf dem Blatt steht. Die Welt hat diese Felder; das Lob baut sie aus `extra`. */
export type UrkundenBild = Pick<
  Welt, 'urkunde' | 'wort' | 'name' | 'band' | 'lineatur' | 'vorlage' | 'schrift'
>

/* ── Bild des Spiels ───────────────────────────────────────────────────── */
export function zeichne(g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, hoehe)
  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)

  // Wie weit die Urkunde offen ist, 0 bis 1.
  const offen =
    w.schritt === 'uebergabe' ? Math.min(1, w.schrittUhr / AUFROLLEN_SEK)
    : w.schritt === 'abgabe' ? Math.max(0, 1 - w.schrittUhr / EINROLLEN_SEK)
    : 1

  // Das Band leuchtet sanft, solange Ben unterschreiben soll — so weiß er ohne Pfeil, wo.
  // Die Uhr ist die Spielzeit: angehalten steht auch das Pulsieren.
  const leuchten =
    w.schritt === 'unterschreiben' ? 0.5 + 0.5 * Math.sin((w.zeitGesamt * Math.PI * 2) / 2) : 0

  const u = URKUNDE
  g.save()
  g.beginPath()
  g.rect(u.x - 30, u.y - 30, u.b + 60, u.h * offen + 30)
  g.clip()
  zeichneUrkunde(g, w, leuchten)
  g.restore()

  if (offen < 1) rolle(g, u.y + u.h * offen)
}

/** Die eingerollte Kante beim Auf- und Einrollen. */
function rolle(g: CanvasRenderingContext2D, y: number) {
  const u = URKUNDE
  const verlauf = g.createLinearGradient(0, y - 14, 0, y + 14)
  verlauf.addColorStop(0, '#d8d0b4')
  verlauf.addColorStop(0.5, F.rolle)
  verlauf.addColorStop(1, '#c9c0a2')
  g.save()
  g.shadowColor = F.schatten
  g.shadowBlur = 12
  g.shadowOffsetY = 4
  g.fillStyle = verlauf
  rundRect(g, u.x - 8, y - 14, u.b + 16, 28, 14)
  g.fill()
  g.restore()
}

/* ── Das Blatt ─────────────────────────────────────────────────────────── */

/**
 * Die Urkunde in Bühnenkoordinaten. `leuchten` (0–1) hebt das Band hervor; 0 heißt aus.
 * Vereinsname und Farben kommen aus dem Content — ein neuer Verein ist eine Datei.
 */
export function zeichneUrkunde(g: CanvasRenderingContext2D, bild: UrkundenBild, leuchten = 0) {
  const u = URKUNDE
  const k = bild.urkunde

  // Papier mit Schatten
  g.save()
  g.shadowColor = F.schatten
  g.shadowBlur = 24
  g.shadowOffsetY = 8
  g.fillStyle = F.papier
  g.fillRect(u.x, u.y, u.b, u.h)
  g.restore()

  // Doppelter Rahmen in der Vereinsfarbe
  g.strokeStyle = k.primaer
  g.lineWidth = 6
  g.strokeRect(u.x + 14, u.y + 14, u.b - 28, u.h - 28)
  g.lineWidth = 2
  g.strokeRect(u.x + 24, u.y + 24, u.b - 48, u.h - 48)

  // Band oben
  g.fillStyle = k.primaer
  g.fillRect(u.x + 24, u.y + 24, u.b - 48, 42)
  g.fillStyle = k.sekundaer
  g.font = schrift(18, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('PROBETRAINING BESTANDEN', W / 2, u.y + 46)

  // Texte
  g.fillStyle = F.schrift
  g.font = schrift(48, 800)
  g.fillText('U R K U N D E', W / 2, u.y + 112)
  if (bild.wort) {
    // Fremdsprachig immer mit Übersetzung (Leitidee).
    g.fillStyle = F.leise
    g.font = `italic ${schrift(20, 500)}`
    g.fillText(`„${bild.wort.text}" – ${bild.wort.sprache} für „${bild.wort.uebersetzung}"`, W / 2, u.y + 148)
  }
  g.fillStyle = F.schrift
  g.font = schrift(30, 700)
  g.fillText(`Probetraining beim ${k.vereinName}`, W / 2, u.y + 192)
  g.fillStyle = F.leise
  g.font = schrift(24, 600)
  g.fillText('5 Trainingstage geschafft', W / 2, u.y + 228)

  wappen(g, 132, 330, k.primaer, k.sekundaer)
  band(g, bild, leuchten)
  tinte(g, bild)
}

/** Ein Schild in Vereinsfarben. Kein Wappenbild: das sind Marken (CLAUDE.md, Vereinsassets). */
function wappen(g: CanvasRenderingContext2D, cx: number, oben: number, primaer: string, sekundaer: string) {
  const b = 76
  const h = 92
  g.save()
  g.beginPath()
  g.moveTo(cx - b / 2, oben)
  g.lineTo(cx + b / 2, oben)
  g.lineTo(cx + b / 2, oben + h * 0.45)
  g.quadraticCurveTo(cx + b / 2, oben + h * 0.85, cx, oben + h)
  g.quadraticCurveTo(cx - b / 2, oben + h * 0.85, cx - b / 2, oben + h * 0.45)
  g.closePath()
  g.fillStyle = primaer
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = F.schrift
  g.stroke()
  // Querstreifen in der Zweitfarbe, nur innerhalb des Schilds
  g.clip()
  g.fillStyle = sekundaer
  g.fillRect(cx - b / 2, oben + h * 0.36, b, h * 0.18)
  g.restore()
}

/** Bens Band mit Lineatur und Vorlage, darunter „Spieler"; rechts die leere Profi-Linie. */
function band(g: CanvasRenderingContext2D, bild: UrkundenBild, leuchten: number) {
  const b = bild.band
  const grund = b.y + b.hoehe

  if (leuchten > 0) {
    g.save()
    g.globalAlpha = 0.06 + 0.09 * leuchten
    g.fillStyle = bild.urkunde.primaer
    rundRect(g, b.x - 8, b.y - 8, b.breite + 16, b.hoehe + 16, 12)
    g.fill()
    g.restore()
  }

  // Hilfslinien hellblau gestrichelt, wie im Schulheft
  const hilfslinien =
    bild.lineatur === 'vier' ? [b.y, b.y + b.hoehe / 2, unterlinieY(b)]
    : bild.lineatur === 'zwei' ? [b.y + b.hoehe / 2]
    : []
  g.save()
  g.setLineDash([10, 8])
  g.strokeStyle = F.hilfslinie
  g.lineWidth = 1.5
  for (const y of hilfslinien) linie(g, b.x, y, b.x + b.breite)
  g.restore()

  // Grundlinie kräftig
  g.strokeStyle = F.linie
  g.lineWidth = 2.5
  linie(g, b.x, grund, b.x + b.breite)

  // Vorlage: nur eine Hilfe, wird nicht ausgewertet
  if (bild.name && bild.vorlage === 'nachspuren') {
    // So groß, dass die Kleinbuchstaben etwa bis zur Mittellinie reichen.
    let px = b.hoehe
    g.font = schrift(px, 700)
    const breite = g.measureText(bild.name).width
    if (breite > b.breite - 32) px *= (b.breite - 32) / breite
    g.font = schrift(px, 700)
    g.fillStyle = F.vorlage
    g.textAlign = 'left'
    g.textBaseline = 'alphabetic'
    g.fillText(bild.name, b.x + 16, grund)
  } else if (bild.name && bild.vorlage === 'abschauen') {
    g.font = schrift(22, 600)
    g.fillStyle = F.leise
    g.textAlign = 'left'
    g.textBaseline = 'alphabetic'
    g.fillText(bild.name, b.x, b.y - 12)
  }

  // Beschriftung unter den Linien, auf jeder Stufe an derselben Stelle
  const p = PROFI_LINIE
  g.strokeStyle = F.linie
  g.lineWidth = 2.5
  linie(g, p.x, p.y, p.x + p.breite)
  g.fillStyle = F.leise
  g.font = schrift(16, 600)
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillText('Spieler', b.x, GRUNDLINIE_Y + 88)
  g.fillText('Trainer', p.x, GRUNDLINIE_Y + 88)
}

/** Bens Tinte, dunkelblau wie ein Füller. Die Breite folgt dem Druck (2–5 Bühnen-px). */
function tinte(g: CanvasRenderingContext2D, bild: UrkundenBild) {
  const s = bild.schrift
  g.save()
  g.strokeStyle = F.tinte
  g.fillStyle = F.tinte
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 0; i < s.length; i++) {
    const q = s[i]
    const breite = 2 + 3 * q.druck
    if (q.neu) {
      // Jeder Strich beginnt mit einem Punkt — so ist auch ein kurzes Tippen sofort zu sehen (A1).
      g.beginPath()
      g.arc(q.x, q.y, breite / 2, 0, Math.PI * 2)
      g.fill()
      continue
    }
    const p = s[i - 1]
    g.lineWidth = breite
    g.beginPath()
    g.moveTo(p.x, p.y)
    g.lineTo(q.x, q.y)
    g.stroke()
  }
  g.restore()
}

/* ── Formhelfer ────────────────────────────────────────────────────────── */
function linie(g: CanvasRenderingContext2D, x0: number, y: number, x1: number) {
  g.beginPath()
  g.moveTo(x0, y)
  g.lineTo(x1, y)
  g.stroke()
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
