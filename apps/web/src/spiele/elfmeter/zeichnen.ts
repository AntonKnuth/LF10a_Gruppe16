/**
 * Zeichnen von „Elfmeter". Liest nur aus der Welt und verändert sie nie — dadurch bleibt die
 * Bewertung in welt.ts ohne Canvas testbar.
 *
 * A2: kein Punktestand und keine Serie. Der Fortschritt ist gegenständlich — jeder Torball bleibt
 * im Netz liegen, der Ballsack zeigt, wie viele Bälle in dieser Runde noch kommen. In Ruhe
 * bewegen sich nur Zielmarke, Torwart und der Ring um den Ball.
 */

import {
  ANLAUF, BAELLE_JE_RUNDE, BALL, BALL_R, H, KREIS_R, NACHLEGEN_SEK, REAKTION_SEK, TOR, W,
  fenster, istWappen, klemme, ziel, zielArt, zielRadius, type Punkt, type Welt,
} from './welt'

const F = {
  himmel: '#9fd9fb',
  gras: '#3f9d1e',
  grasHell: '#4cb327',
  kreide: '#ffffff',
  tinte: '#3b4a5a',
  haut: '#f2c79b',
  haare: '#5a4632',
  hose: '#22303f',
  handschuh: '#ffd23c',
  gold: '#ffc800',
  ball: '#ffffff',
  ballFleck: '#2b3a4a',
}

const SCHRIFT = 'system-ui, sans-serif'
const schrift = (px: number, gewicht = 600) => `${gewicht} ${px}px ${SCHRIFT}`

/** Wo der Ballsack steht. Von hier rollt der nächste Ball auf den Punkt. */
const SACK: Punkt = { x: 112, y: 578 }

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

function linie(g: CanvasRenderingContext2D, a: Punkt, b: Punkt) {
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(b.x, b.y)
  g.stroke()
}

const zwischen = (a: Punkt, b: Punkt, u: number): Punkt => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
})

/** Mischt zwei Hex-Farben — für die abgedunkelten Abstufungen der Vereinsfarbe. */
function mische(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  const teil = (bits: number) =>
    Math.round(((x >> bits) & 255) * (1 - t) + ((y >> bits) & 255) * t)
  return `rgb(${teil(16)}, ${teil(8)}, ${teil(0)})`
}

/* ── Bild ──────────────────────────────────────────────────────────────── */
export function zeichne(
  g: CanvasRenderingContext2D, w: Welt, sicht: Sicht, breite: number, hoehe: number,
) {
  // Füllt auch die Streifen neben der Bühne: oben Himmel, unten Rasen.
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = F.himmel
  g.fillRect(0, 0, breite, hoehe)
  g.fillStyle = F.gras
  g.fillRect(0, sicht.dy + TOR.unten * sicht.s, breite, hoehe)

  g.setTransform(sicht.s, 0, 0, sicht.s, sicht.dx, sicht.dy)
  tribuene(g, w)
  rasen(g)
  torRaum(g)
  netz(g, w)
  zielmarke(g, w)
  torBaelle(g, w)
  pfosten(g)
  schusskreis(g, w)
  geisterstrich(g, w)
  // Ein Ball über die Latte oder an den Pfosten fliegt am Torwart vorbei.
  torwart(g, w)
  spur(g, w)
  ball(g, w)
  ballsack(g, w)
  puff(g, w)
  for (const p of w.teilchen) {
    g.globalAlpha = klemme(p.leben * 2, 0, 1)
    g.fillStyle = p.farbe
    g.fillRect(p.x - 4, p.y - 3, 8, 6)
  }
  g.globalAlpha = 1
  if (w.blase) blase(g, w, w.blase)
}

/* ── Kulisse ───────────────────────────────────────────────────────────── */

/** Fans in Vereinsfarben. Sie bewegen sich nur beim Jubel, sonst bleibt die Kulisse ruhig. */
function tribuene(g: CanvasRenderingContext2D, w: Welt) {
  const { primaer, sekundaer } = w.deko
  g.fillStyle = mische(primaer, '#0b121b', 0.55)
  g.fillRect(-400, 34, W + 800, TOR.unten - 34)

  const jubel = w.phase === 'abpfiff' ||
    (w.phase === 'reaktion' && (w.urteil === 'tor' || w.urteil === 'drueber'))
  const farben = [mische(primaer, '#0b121b', 0.25), mische(sekundaer, '#0b121b', 0.45)]
  for (let reihe = 0; reihe < 6; reihe++) {
    for (let i = -10; i < 47; i++) {
      const x = i * 24 + (reihe % 2) * 12
      const huepfen = jubel && !w.wenigerBewegung
        ? Math.abs(Math.sin(w.t * 5 + i * 0.5 + reihe)) * 8
        : 0
      const y = 58 + reihe * 40 - huepfen
      g.fillStyle = farben[(i + reihe * 2 + 20) % 2]
      rundRect(g, x - 9, y + 7, 18, 22, 7)
      g.fill()
      g.fillStyle = mische(F.haut, '#0b121b', 0.3)
      kreis(g, x, y, 8)
      g.fill()
    }
  }

  // Bande mit dem Vereinsnamen, neben dem Tor auf beiden Seiten.
  g.fillStyle = primaer
  g.fillRect(-400, 292, W + 800, 38)
  g.fillStyle = sekundaer
  g.font = schrift(19, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(w.deko.verein, 115, 312, 210)
  g.fillText(w.deko.verein, W - 115, 312, 210)
}

function rasen(g: CanvasRenderingContext2D) {
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 === 0 ? F.gras : F.grasHell
    g.fillRect(-400, TOR.unten + i * 60, W + 800, 60)
  }
  g.strokeStyle = F.kreide
  g.globalAlpha = 0.8
  g.lineWidth = 4
  linie(g, { x: -400, y: TOR.unten }, { x: W + 400, y: TOR.unten })
  // Torraum in leichter Perspektive.
  g.beginPath()
  g.moveTo(170, TOR.unten)
  g.lineTo(130, 390)
  g.lineTo(W - 130, 390)
  g.lineTo(W - 170, TOR.unten)
  g.stroke()
  g.globalAlpha = 1
  g.fillStyle = F.kreide
  g.beginPath()
  g.ellipse(BALL.x, BALL.y + BALL_R, 12, 5, 0, 0, Math.PI * 2)
  g.fill()
}

/** Dunkle Fläche hinter dem Netz: davor sind Marke, Torwart und Ball gut zu erkennen. */
function torRaum(g: CanvasRenderingContext2D) {
  g.fillStyle = 'rgba(12, 22, 34, 0.8)'
  g.fillRect(TOR.links, TOR.oben, TOR.rechts - TOR.links, TOR.unten - TOR.oben)
}

/** Das Netz beult sich beim Tor um den Treffpunkt aus und federt zurück. */
function netz(g: CanvasRenderingContext2D, w: Welt) {
  const seit = REAKTION_SEK - w.phaseUhr
  const beule = w.phase === 'reaktion' && w.urteil === 'tor' && !w.wenigerBewegung
    ? 16 * Math.max(0, 1 - seit / 0.6)
    : 0

  const knoten = (x: number, y: number): Punkt => {
    if (!beule) return { x, y }
    const dx = x - w.treff.x
    const dy = y - w.treff.y
    const d = Math.hypot(dx, dy) || 1
    const schub = beule * Math.max(0, 1 - d / 90)
    return { x: x + (dx / d) * schub, y: y + (dy / d) * schub }
  }

  g.strokeStyle = F.kreide
  g.globalAlpha = 0.35
  g.lineWidth = 1.5
  for (let x = TOR.links; x <= TOR.rechts; x += 20) {
    for (let y = TOR.oben; y < TOR.unten; y += 20) {
      const p = knoten(x, y)
      linie(g, p, knoten(x, y + 20))
      if (x < TOR.rechts) linie(g, p, knoten(x + 20, y))
    }
  }
  g.globalAlpha = 1
}

function pfosten(g: CanvasRenderingContext2D) {
  g.strokeStyle = F.kreide
  g.lineWidth = 10
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(TOR.links, TOR.unten)
  g.lineTo(TOR.links, TOR.oben)
  g.lineTo(TOR.rechts, TOR.oben)
  g.lineTo(TOR.rechts, TOR.unten)
  g.stroke()
}

/** Wohin geschossen wird. Bis Stufe 2 leuchtet der ganze Streifen, weil die Höhe egal ist. */
function zielmarke(g: CanvasRenderingContext2D, w: Welt) {
  if (w.phase === 'lockern' || w.phase === 'abpfiff') return
  const z = ziel(w)
  const r = zielRadius(w.stufe, w.regler)
  const puls = w.wenigerBewegung ? 0.5 : 0.5 + 0.5 * Math.sin(w.t * 3.5)

  g.save()
  g.beginPath()
  g.rect(TOR.links, TOR.oben, TOR.rechts - TOR.links, TOR.unten - TOR.oben)
  g.clip()

  if (zielArt(w.stufe) === 'streifen') {
    g.fillStyle = 'rgba(255, 226, 122, 0.22)'
    g.fillRect(z.x - r, TOR.oben, r * 2, TOR.unten - TOR.oben)
  }

  // Weißer Rand um die Vereinsfarbe: ein dunkles Blau ginge vor dem dunklen Tor unter.
  g.fillStyle = `rgba(255, 226, 122, ${0.22 + 0.2 * puls})`
  kreis(g, z.x, z.y, r)
  g.fill()
  g.strokeStyle = F.kreide
  g.lineWidth = 11
  kreis(g, z.x, z.y, r - 6)
  g.stroke()
  g.strokeStyle = w.deko.primaer
  g.lineWidth = 6
  g.stroke()
  g.restore()

  if (istWappen(w)) wappen(g, w, z)
  else {
    g.fillStyle = F.kreide
    kreis(g, z.x, z.y, 6)
    g.fill()
  }
}

/** Das Wappen als Schild mit Kürzel, wie auf der Kartennadel des Startbildschirms. */
function wappen(g: CanvasRenderingContext2D, w: Welt, p: Punkt) {
  g.beginPath()
  g.moveTo(p.x - 24, p.y - 26)
  g.lineTo(p.x + 24, p.y - 26)
  g.lineTo(p.x + 24, p.y + 6)
  g.quadraticCurveTo(p.x + 20, p.y + 22, p.x, p.y + 30)
  g.quadraticCurveTo(p.x - 20, p.y + 22, p.x - 24, p.y + 6)
  g.closePath()
  g.fillStyle = w.deko.primaer
  g.fill()
  g.strokeStyle = F.gold
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = w.deko.sekundaer
  g.font = schrift(17, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(w.deko.kuerzel, p.x, p.y)
}

/* ── Spielfiguren ──────────────────────────────────────────────────────── */

/** Jeder Torball bleibt im Netz liegen, in Reihen zu zwölft. */
function torBaelle(g: CanvasRenderingContext2D, w: Welt) {
  // Der gerade geschossene Ball fällt noch; er liegt erst mit dem nächsten im Haufen.
  const liegen = w.phase === 'reaktion' && w.urteil === 'tor' ? w.tore - 1 : w.tore
  for (let i = 0; i < liegen; i++) {
    const reihe = Math.floor(i / 12)
    // Fünferschritte, damit die Bälle über die Breite verteilt liegen statt von links gestapelt.
    const platz = (i * 5) % 12
    zeichneBall(g, 259 + platz * 34 + (reihe % 2) * 8, 320 - reihe * 15, 10, i)
  }
}

function zeichneBall(g: CanvasRenderingContext2D, x: number, y: number, r: number, dreh: number) {
  g.save()
  g.translate(x, y)
  g.rotate(dreh)
  g.fillStyle = F.ball
  kreis(g, 0, 0, r)
  g.fill()
  g.strokeStyle = F.ballFleck
  g.lineWidth = 1.2
  g.stroke()
  g.fillStyle = F.ballFleck
  kreis(g, 0, 0, r * 0.32)
  g.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    kreis(g, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.18)
    g.fill()
  }
  g.restore()
}

/** Wohin der Ball fliegt — neben dem Tor bremst ihn der Pfosten, darüber fängt ihn ein Fan. */
function flugEnde(w: Welt): Punkt {
  if (w.urteil === 'vorbei') return { x: w.treff.x < BALL.x ? TOR.links : TOR.rechts, y: w.treff.y }
  if (w.urteil === 'drueber') return { x: klemme(w.treff.x, 60, W - 60), y: w.treff.y }
  return w.treff
}

/** Wo der Ball gerade ist und wie groß er aussieht. Beim Lockern liegt keiner da. */
function ballOrt(w: Welt): (Punkt & { r: number }) | null {
  if (w.phase === 'lockern') return null
  if (w.phase === 'nachlegen') {
    return { ...zwischen(BALL, SACK, w.phaseUhr / NACHLEGEN_SEK), r: BALL_R }
  }
  if (w.phase === 'flug') {
    const u = klemme(1 - w.phaseUhr / w.flugDauer, 0, 1)
    const p = zwischen(BALL, flugEnde(w), u)
    // Ungleichmäßiger Druck: der Ball eiert sichtbar.
    if (w.urteil === 'abgewehrt') p.x += Math.sin(u * 22) * 9 * u
    return { ...p, r: BALL_R * (1 - 0.55 * u) }
  }
  if (w.phase === 'reaktion') {
    const u = klemme((REAKTION_SEK - w.phaseUhr) / 0.5, 0, 1)
    const ende = flugEnde(w)
    const klein = BALL_R * 0.45
    const nachAussen = ende.x < BALL.x ? -1 : 1
    switch (w.urteil) {
      case 'tor':
        // Fällt im Netz zu Boden.
        return { x: ende.x, y: ende.y + (320 - ende.y) * u * u, r: klein }
      case 'gehalten':
        return { x: w.torwart.x, y: w.torwart.y + 4, r: klein }
      case 'abgewehrt':
        return { ...zwischen(ende, { x: ende.x + nachAussen * 150, y: 410 }, u), r: klein }
      case 'vorbei':
        return { ...zwischen(ende, { x: ende.x + nachAussen * 70, y: 400 }, u), r: klein }
      case 'drueber':
        return { ...ende, r: klein }
    }
  }
  return { ...BALL, r: BALL_R }
}

function ball(g: CanvasRenderingContext2D, w: Welt) {
  const p = ballOrt(w)
  if (!p) return
  const amBoden = w.phase !== 'flug' && w.phase !== 'reaktion'
  if (amBoden) {
    g.fillStyle = 'rgba(30, 50, 30, 0.35)'
    g.beginPath()
    g.ellipse(p.x, p.y + p.r - 2, p.r, p.r * 0.35, 0, 0, Math.PI * 2)
    g.fill()
  }
  zeichneBall(g, p.x, p.y, p.r, w.phase === 'flug' || w.phase === 'nachlegen' ? w.t * 9 : 0)

  // Hier beginnt der Strich.
  if (w.phase === 'bereit') {
    const puls = w.wenigerBewegung ? 0.5 : 0.5 + 0.5 * Math.sin(w.t * 3.5)
    g.strokeStyle = F.kreide
    g.globalAlpha = 0.5 + 0.4 * puls
    g.lineWidth = 4
    kreis(g, p.x, p.y, BALL_R + 9 + puls * 4)
    g.stroke()
    g.globalAlpha = 1
  }
}

/** Der Vereinstorwart mit der 1. Beim Sprung legt er sich in Flugrichtung. */
function torwart(g: CanvasRenderingContext2D, w: Welt) {
  const springt = w.phase === 'flug' || w.phase === 'reaktion'
  const weit = springt ? klemme((w.torwart.x - 450) / 150, -1, 1) : 0
  const faengt = w.phase === 'reaktion' && w.urteil === 'gehalten'
  const ruhig = w.wenigerBewegung || springt
  const wippen = ruhig ? 0 : Math.sin(w.t * 3) * 3
  // Beim Lockern macht er das Händeschütteln vor — Ben liest noch unsicher (A5).
  const schuetteln = w.phase === 'lockern' ? Math.sin(w.t * 22) * 9 : 0

  g.save()
  g.translate(w.torwart.x, w.torwart.y + wippen)
  g.rotate(faengt ? 0 : weit * 0.9)
  g.lineCap = 'round'

  // Beine
  g.strokeStyle = F.hose
  g.lineWidth = 13
  linie(g, { x: -9, y: 20 }, { x: -13, y: 42 })
  linie(g, { x: 9, y: 20 }, { x: 13, y: 42 })

  // Arme: hoch beim Sprung, sonst fangbereit vor dem Körper.
  const hand = faengt
    ? { x: 13, y: 4 }
    : springt ? { x: 24, y: -58 } : { x: 38, y: 4 }
  g.strokeStyle = w.deko.primaer
  g.lineWidth = 11
  for (const seite of [-1, 1]) {
    const h = { x: hand.x * seite + schuetteln, y: hand.y + schuetteln * 0.5 }
    linie(g, { x: 18 * seite, y: -14 }, h)
    g.fillStyle = F.handschuh
    kreis(g, h.x, h.y, 9)
    g.fill()
  }

  // Trikot mit heller Kante, damit es sich vom dunklen Tor abhebt.
  g.fillStyle = w.deko.primaer
  rundRect(g, -23, -24, 46, 48, 12)
  g.fill()
  g.strokeStyle = w.deko.sekundaer
  g.lineWidth = 2.5
  g.stroke()
  g.fillStyle = w.deko.sekundaer
  g.font = schrift(24, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('1', 0, 1)

  // Kopf
  g.fillStyle = F.haare
  kreis(g, 0, -42, 18)
  g.fill()
  g.fillStyle = F.haut
  kreis(g, 0, -38, 16)
  g.fill()
  g.fillStyle = F.tinte
  kreis(g, -6, -40, 2.2)
  g.fill()
  kreis(g, 6, -40, 2.2)
  g.fill()
  // Er lächelt immer: Trainingspartner, kein Gegner (C2).
  g.strokeStyle = F.tinte
  g.lineWidth = 2
  g.beginPath()
  g.arc(0, -36, 7, 0.3, Math.PI - 0.3)
  g.stroke()
  g.restore()
}

/* ── Strich und Hilfe ──────────────────────────────────────────────────── */

/** Bis über diese Linie muss der Strich gehen. Nur die obere Hälfte, nach unten geht kein Schuss. */
function schusskreis(g: CanvasRenderingContext2D, w: Welt) {
  if (w.phase !== 'bereit' && w.phase !== 'zieht') return
  g.save()
  g.setLineDash([12, 12])
  g.lineWidth = 4
  g.strokeStyle = F.kreide
  g.globalAlpha = 0.75
  g.beginPath()
  g.arc(BALL.x, BALL.y, KREIS_R, Math.PI, 0)
  g.stroke()
  g.restore()
}

/** Die Spur zeigt den Druck als Breite — Ben sieht ein ungleichmäßiges Band, bevor der Ball landet. */
function spur(g: CanvasRenderingContext2D, w: Welt) {
  if (w.spur.length < 2) return
  g.save()
  g.lineCap = 'round'
  g.strokeStyle = F.gold
  g.globalAlpha = w.phase === 'reaktion' ? 0.45 : 0.95
  for (let i = 1; i < w.spur.length; i++) {
    g.lineWidth = 3 + 8 * w.spur[i].druck
    linie(g, w.spur[i - 1], w.spur[i])
  }
  g.restore()
}

/** Hilfe (C2): ein Strich zur Marke, auf dem ein Punkt im richtigen Tempo läuft. */
function geisterstrich(g: CanvasRenderingContext2D, w: Welt) {
  if (!w.hilfe || w.phase !== 'bereit') return
  const z = ziel(w)
  g.save()
  g.strokeStyle = F.kreide
  g.globalAlpha = 0.7
  g.setLineDash([4, 12])
  g.lineCap = 'round'
  g.lineWidth = 5
  linie(g, BALL, z)
  g.restore()

  // Läuft die Anlaufstrecke in der Mitte des Tempofensters ab, dann eine Pause.
  const f = fenster(w.stufe, w.regler)
  const anlauf = (f.min + f.max) / 2000
  const u = (w.t % (anlauf + 1)) / anlauf
  if (u > 1) return
  const weg = BALL_R + u * ANLAUF
  const laenge = Math.hypot(z.x - BALL.x, z.y - BALL.y)
  const p = zwischen(BALL, z, weg / laenge)
  g.fillStyle = F.gold
  kreis(g, p.x, p.y, 11)
  g.fill()
}

/** Wie viele Bälle in dieser Runde noch kommen — nicht, wie viele getroffen haben (C2). */
function ballsack(g: CanvasRenderingContext2D, w: Welt) {
  g.fillStyle = 'rgba(255, 255, 255, 0.28)'
  rundRect(g, 18, 552, 190, 52, 24)
  g.fill()
  // Während des Schusses ist der laufende Ball schon unterwegs.
  const weg = w.phase === 'abpfiff' ? BAELLE_JE_RUNDE : w.phase === 'lockern' ? 0 : w.ballNr + 1
  for (let i = 0; i < BAELLE_JE_RUNDE; i++) {
    g.globalAlpha = i < weg ? 0.22 : 1
    zeichneBall(g, 44 + i * 34, SACK.y, 13, i)
  }
  g.globalAlpha = 1
}

function puff(g: CanvasRenderingContext2D, w: Welt) {
  if (w.puff.uhr <= 0) return
  const u = 1 - w.puff.uhr / 0.4
  g.strokeStyle = F.kreide
  g.globalAlpha = 1 - u
  g.lineWidth = 4
  kreis(g, w.puff.x, w.puff.y, 8 + 18 * u)
  g.stroke()
  g.globalAlpha = 1
}

/** Ein Satz über dem Tor. Vom Torwart mit Spitze zu ihm hin, beim Jubel ohne. */
function blase(
  g: CanvasRenderingContext2D, w: Welt, b: { text: string; klein: string; vomTorwart: boolean },
) {
  const y = 78
  const h = b.klein ? 84 : 62
  g.font = schrift(30, 800)
  const breite = Math.max(200, g.measureText(b.text).width + 56)
  const x = b.vomTorwart ? klemme(w.torwart.x, breite / 2 + 10, W - breite / 2 - 10) : W / 2

  g.fillStyle = 'rgba(255, 255, 255, 0.96)'
  rundRect(g, x - breite / 2, y - h / 2, breite, h, 22)
  g.fill()
  if (b.vomTorwart) {
    g.beginPath()
    g.moveTo(x - 16, y + h / 2 - 2)
    g.lineTo(x + 16, y + h / 2 - 2)
    g.lineTo(x, y + h / 2 + 24)
    g.closePath()
    g.fill()
  }

  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = F.tinte
  g.fillText(b.text, x, b.klein ? y - 14 : y)
  if (!b.klein) return
  g.font = schrift(20, 600)
  g.fillText(b.klein, x, y + 20)
}
