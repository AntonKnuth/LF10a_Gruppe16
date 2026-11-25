/**
 * Einstrich-Schrift zum Nachspuren — gemeinsam für Startelf und Stadionführung.
 *
 * Selbst gezeichnet, weil `fillText` nur **Umrisse** liefert: nachfahren kann man aber nur eine
 * Mittellinie, und dafür braucht es Startpunkt, Richtung und Reihenfolge der Striche. Kennt kein
 * Canvas und kein React, damit alles ohne Browser testbar bleibt (siehe schrift.test.ts).
 *
 * **Maße:** Einheit ist das *Band*, also der Abstand zweier Linien im Schulheft.
 *   y = 0 Oberlinie · 1 Mittellinie · 2 Grundlinie · 3 Unterlinie (y nach unten)
 *   x = 0 linke Kante des Zeichens
 * Großbuchstaben und Ziffern stehen zwischen 0 und 2, kleine Buchstaben zwischen 1 und 2.
 *
 * **Ein Strich** ist eine Punktfolge in Schreibrichtung. Ein Strich mit nur **einem** Punkt ist
 * ein Tupfer (i-Punkt, Umlautpunkte): er wird getippt, nicht gefahren.
 *
 * Was ein Spiel davon braucht:
 *   `hatVorlage(text)`      lässt sich der ganze Text schreiben?
 *   `zeilenBreite(text)`    Breite in Bändern — damit rechnet das Spiel sein Band aus
 *   `legeZeile(...)`        Zeichen mit fertigen Strichen in Bühnenkoordinaten
 *   `laenge`, `punktBei`, `anfangVon`, `naechster`   die Geometrie zum Nachspuren
 *   `fahreNach(...)`        wie weit ist ein Strich nach dieser Stiftbewegung gefüllt?
 *
 * Offen (mit Thomas zu klären): Strichfolge und Formen sind eine einfache Druckschrift. Lernt Ben
 * in der Schule eine andere, werden sie **hier** geändert, kein Spiel muss dafür angefasst werden.
 */

export type Punkt = { x: number; y: number }
export type Strich = Punkt[]
export type Vorlage = { breite: number; striche: Strich[] }

/** Ein Zeichen an seinem Platz auf der Bühne. */
export type Zeichenlage = {
  z: string
  /** Linke Kante und Breite, für Kästchen und Hervorhebung. */
  x: number
  breite: number
  /** Bandhöhe und Oberlinie in Bühnen-Pixeln. */
  band: number
  y0: number
  striche: Strich[]
}

/** Lücke zwischen zwei Zeichen und Breite des Leerzeichens, in Bändern. */
const LUECKE = 0.3
const LEERZEICHEN = 0.6

/* ── Helfer zum Zeichnen der Vorlagen ──────────────────────────────────── */

const p = (x: number, y: number): Punkt => ({ x, y })

/**
 * Ellipsenbogen. Winkel in Grad: 0 rechts, 90 **unten**, 180 links, -90 oben — weil y nach unten
 * zeigt, läuft ein steigender Winkel im Uhrzeigersinn. Ein O wird dagegen gegen den Uhrzeigersinn
 * geschrieben, deshalb `-90 → -450`.
 */
function bogen(mx: number, my: number, rx: number, ry: number, von: number, bis: number): Punkt[] {
  const schritte = Math.ceil(Math.abs(bis - von) / 15)
  return Array.from({ length: schritte + 1 }, (_, i) => {
    const a = ((von + ((bis - von) * i) / schritte) * Math.PI) / 180
    return p(mx + rx * Math.cos(a), my + ry * Math.sin(a))
  })
}

const v = (breite: number, ...striche: Strich[]): Vorlage => ({ breite, striche })

/** Runder Teil von a, d, g und q: rechts oben ansetzen, einmal links herum, zurück nach rechts. */
const bauch = () => bogen(0.5, 1.5, 0.42, 0.5, -40, -360)

/* ── Der Schriftsatz ───────────────────────────────────────────────────── */

export const SCHRIFT: Record<string, Vorlage> = {
  '0': v(1.2, bogen(0.6, 1, 0.55, 1, -90, -450)),
  '1': v(0.8, [p(0.1, 0.6), p(0.65, 0), p(0.65, 2)]),
  '2': v(1.1, [...bogen(0.55, 0.55, 0.48, 0.55, -170, 30), p(0.05, 2), p(1.05, 2)]),
  '3': v(1.1, [...bogen(0.52, 0.5, 0.42, 0.5, -150, 90), ...bogen(0.52, 1.5, 0.5, 0.5, -90, 150)]),
  '4': v(1.1, [p(0.7, 0), p(0.05, 1.35), p(1.05, 1.35)], [p(0.75, 0.8), p(0.75, 2)]),
  '5': v(1.1, [p(0.2, 0), p(0.15, 0.88), ...bogen(0.5, 1.35, 0.5, 0.65, -135, 150)],
    [p(0.2, 0), p(1, 0)]),
  '6': v(1.1, [...bogen(0.8, 1.4, 0.75, 1.4, -90, -180), ...bogen(0.55, 1.4, 0.5, 0.6, 180, -180)]),
  '7': v(1.1, [p(0.05, 0), p(1.05, 0), p(0.4, 2)], [p(0.3, 1), p(0.95, 1)]),
  '8': v(1.1, [...bogen(0.55, 0.5, 0.42, 0.5, -90, -270), ...bogen(0.55, 1.5, 0.5, 0.5, -90, 270),
    ...bogen(0.55, 0.5, 0.42, 0.5, 90, -90)]),
  '9': v(1.1, [...bogen(0.55, 0.55, 0.45, 0.55, 0, -360), p(0.97, 1.2), p(0.84, 1.65), p(0.5, 2)]),

  A: v(1.3, [p(0.65, 0), p(0.05, 2)], [p(0.65, 0), p(1.25, 2)], [p(0.26, 1.3), p(1.04, 1.3)]),
  B: v(1.1, [p(0.1, 0), p(0.1, 2)],
    [p(0.1, 0), ...bogen(0.5, 0.5, 0.4, 0.5, -90, 90), p(0.2, 1),
      ...bogen(0.5, 1.5, 0.5, 0.5, -90, 90), p(0.1, 2)]),
  C: v(1.25, bogen(0.7, 1, 0.65, 1, -45, -315)),
  D: v(1.25, [p(0.1, 0), p(0.1, 2)],
    [p(0.1, 0), ...bogen(0.4, 1, 0.75, 1, -90, 90), p(0.1, 2)]),
  E: v(1, [p(0.1, 0), p(0.1, 2)], [p(0.1, 0), p(0.95, 0)], [p(0.1, 1), p(0.8, 1)],
    [p(0.1, 2), p(0.95, 2)]),
  F: v(1, [p(0.1, 0), p(0.1, 2)], [p(0.1, 0), p(0.95, 0)], [p(0.1, 1), p(0.8, 1)]),
  G: v(1.35, [...bogen(0.7, 1, 0.6, 1, -45, -355), p(1.3, 1.1), p(0.8, 1.1)]),
  H: v(1.2, [p(0.1, 0), p(0.1, 2)], [p(1.1, 0), p(1.1, 2)], [p(0.1, 1), p(1.1, 1)]),
  I: v(0.3, [p(0.15, 0), p(0.15, 2)]),
  J: v(0.85, [p(0.75, 0), ...bogen(0.4, 1.5, 0.35, 0.5, 0, 150)]),
  K: v(1.1, [p(0.1, 0), p(0.1, 2)], [p(1, 0), p(0.1, 1.15), p(1.05, 2)]),
  L: v(1, [p(0.1, 0), p(0.1, 2), p(0.95, 2)]),
  M: v(1.5, [p(0.1, 0), p(0.1, 2)], [p(0.1, 0), p(0.75, 1.3), p(1.4, 0), p(1.4, 2)]),
  N: v(1.2, [p(0.1, 0), p(0.1, 2)], [p(0.1, 0), p(1.1, 2), p(1.1, 0)]),
  O: v(1.5, bogen(0.75, 1, 0.7, 1, -90, -450)),
  P: v(1.05, [p(0.1, 0), p(0.1, 2)],
    [p(0.1, 0), ...bogen(0.5, 0.55, 0.45, 0.55, -90, 90), p(0.1, 1.1)]),
  Q: v(1.5, bogen(0.75, 1, 0.7, 1, -90, -450), [p(0.9, 1.4), p(1.45, 2)]),
  R: v(1.1, [p(0.1, 0), p(0.1, 2)],
    [p(0.1, 0), ...bogen(0.5, 0.55, 0.45, 0.55, -90, 90), p(0.15, 1.1), p(0.45, 1.1), p(1.05, 2)]),
  S: v(1.2, [...bogen(0.6, 0.5, 0.5, 0.5, -30, -270), ...bogen(0.6, 1.5, 0.55, 0.5, -90, 150)]),
  T: v(1.2, [p(0.6, 0), p(0.6, 2)], [p(0.05, 0), p(1.15, 0)]),
  U: v(1.2, [p(0.1, 0), ...bogen(0.6, 1.45, 0.5, 0.55, 180, 0), p(1.1, 0)]),
  V: v(1.3, [p(0.05, 0), p(0.65, 2), p(1.25, 0)]),
  W: v(1.7, [p(0.05, 0), p(0.45, 2), p(0.85, 0.3), p(1.25, 2), p(1.65, 0)]),
  X: v(1.2, [p(0.1, 0), p(1.1, 2)], [p(1.1, 0), p(0.1, 2)]),
  Y: v(1.2, [p(0.1, 0), p(0.6, 1)], [p(1.1, 0), p(0.6, 1), p(0.6, 2)]),
  Z: v(1.2, [p(0.1, 0), p(1.1, 0), p(0.05, 2), p(1.15, 2)]),
  // Große Umlaute sind kleiner, damit die Punkte unter der Oberlinie Platz haben.
  Ä: v(1.3, [p(0.65, 0.4), p(0.05, 2)], [p(0.65, 0.4), p(1.25, 2)], [p(0.28, 1.4), p(1.02, 1.4)],
    [p(0.25, 0.15)], [p(1.05, 0.15)]),
  Ö: v(1.5, bogen(0.75, 1.25, 0.7, 0.75, -90, -450), [p(0.4, 0.15)], [p(1.1, 0.15)]),
  Ü: v(1.2, [p(0.1, 0.55), ...bogen(0.6, 1.45, 0.5, 0.55, 180, 0), p(1.1, 0.55)],
    [p(0.3, 0.15)], [p(0.9, 0.15)]),

  a: v(1.02, [...bauch(), p(0.92, 1), p(0.92, 2)]),
  b: v(1.05, [p(0.1, 0), p(0.1, 2), ...bogen(0.55, 1.5, 0.45, 0.5, -180, 180)]),
  c: v(0.9, bogen(0.5, 1.5, 0.42, 0.5, -45, -315)),
  d: v(1.02, [...bauch(), p(0.92, 0), p(0.92, 2)]),
  e: v(1, [p(0.08, 1.5), ...bogen(0.5, 1.5, 0.42, 0.5, 0, -315)]),
  f: v(0.9, [...bogen(0.6, 0.4, 0.3, 0.4, -30, -180), p(0.3, 2)], [p(0.05, 1), p(0.7, 1)]),
  g: v(1.02, [...bauch(), p(0.92, 1), ...bogen(0.5, 2.5, 0.42, 0.45, 0, 140)]),
  h: v(1, [p(0.1, 0), p(0.1, 2), ...bogen(0.5, 1.45, 0.4, 0.45, -180, 0), p(0.9, 2)]),
  i: v(0.3, [p(0.15, 1), p(0.15, 2)], [p(0.15, 0.55)]),
  j: v(0.65, [p(0.5, 1), ...bogen(0.25, 2.5, 0.25, 0.4, 0, 130)], [p(0.5, 0.55)]),
  k: v(0.85, [p(0.1, 0), p(0.1, 2)], [p(0.75, 1), p(0.1, 1.5), p(0.8, 2)]),
  l: v(0.3, [p(0.15, 0), p(0.15, 2)]),
  m: v(1.4, [p(0.1, 1), p(0.1, 2), ...bogen(0.4, 1.4, 0.3, 0.4, -180, 0), p(0.7, 2),
    ...bogen(1, 1.4, 0.3, 0.4, -180, 0), p(1.3, 2)]),
  n: v(0.96, [p(0.1, 1), p(0.1, 2), ...bogen(0.48, 1.45, 0.38, 0.45, -180, 0), p(0.86, 2)]),
  o: v(1, bogen(0.5, 1.5, 0.45, 0.5, -90, -450)),
  p: v(1.05, [p(0.1, 1), p(0.1, 3), ...bogen(0.55, 1.5, 0.45, 0.5, -180, 180)]),
  q: v(1.02, [...bauch(), p(0.92, 1), p(0.92, 3)]),
  r: v(0.8, [p(0.1, 1), p(0.1, 2), ...bogen(0.45, 1.4, 0.35, 0.4, -180, -40)]),
  s: v(0.84, [...bogen(0.42, 1.25, 0.34, 0.25, -30, -270),
    ...bogen(0.42, 1.75, 0.38, 0.25, -90, 150)]),
  t: v(0.85, [p(0.35, 0.4), ...bogen(0.6, 1.75, 0.25, 0.25, 180, 60)], [p(0.05, 1), p(0.7, 1)]),
  u: v(0.96, [p(0.1, 1), ...bogen(0.48, 1.55, 0.38, 0.45, 180, 0), p(0.86, 1), p(0.86, 2)]),
  v: v(0.9, [p(0.05, 1), p(0.45, 2), p(0.85, 1)]),
  w: v(1.3, [p(0.05, 1), p(0.35, 2), p(0.65, 1.2), p(0.95, 2), p(1.25, 1)]),
  x: v(0.85, [p(0.05, 1), p(0.8, 2)], [p(0.8, 1), p(0.05, 2)]),
  y: v(0.95, [p(0.05, 1), p(0.5, 2)], [p(0.9, 1), p(0.1, 3)]),
  z: v(0.85, [p(0.05, 1), p(0.8, 1), p(0.05, 2), p(0.8, 2)]),
  ä: v(1.02, [...bauch(), p(0.92, 1), p(0.92, 2)], [p(0.3, 0.55)], [p(0.75, 0.55)]),
  ö: v(1, bogen(0.5, 1.5, 0.45, 0.5, -90, -450), [p(0.3, 0.55)], [p(0.7, 0.55)]),
  ü: v(0.96, [p(0.1, 1), ...bogen(0.48, 1.55, 0.38, 0.45, 180, 0), p(0.86, 1), p(0.86, 2)],
    [p(0.28, 0.55)], [p(0.68, 0.55)]),
  ß: v(1.05, [p(0.1, 2), ...bogen(0.5, 0.45, 0.4, 0.45, -180, 90),
    ...bogen(0.5, 1.45, 0.5, 0.55, -90, 120)]),

  '.': v(0.2, [p(0.1, 1.95)]),
  ',': v(0.3, [p(0.2, 1.85), p(0.08, 2.35)]),
  '-': v(0.65, [p(0.05, 1.3), p(0.6, 1.3)]),
}

/* ── Text auslegen ─────────────────────────────────────────────────────── */

const vorlage = (z: string): Vorlage | undefined => SCHRIFT[z]

/** Hat jedes Zeichen des Textes eine Vorlage? Leerzeichen zählen als vorhanden. */
export const hatVorlage = (text: string) => [...text].every((z) => z === ' ' || vorlage(z))

/**
 * Setzt einen Text in eine Zeile. `band` in Bühnen-Pixeln, `x0` linke Kante, `y0` Oberlinie.
 * Leerzeichen und Zeichen ohne Vorlage kommen im Ergebnis nicht vor: ein fehlendes Zeichen darf
 * das Spiel nicht anhalten. Dass im Content keines fehlt, prüft schrift.test.ts.
 */
export function legeZeile(text: string, band: number, x0: number, y0: number): Zeichenlage[] {
  const zeile: Zeichenlage[] = []
  let x = x0
  for (const z of text) {
    if (z === ' ') {
      x += LEERZEICHEN * band
      continue
    }
    const vor = vorlage(z)
    if (!vor) continue
    const links = x
    zeile.push({
      z,
      x: links,
      breite: vor.breite * band,
      band,
      y0,
      striche: vor.striche.map((s) => s.map((q) => p(links + q.x * band, y0 + q.y * band))),
    })
    x += (vor.breite + LUECKE) * band
  }
  return zeile
}

/** Breite einer Zeile in Bändern. Mal Bandhöhe ergibt das die Breite auf der Bühne. */
export function zeilenBreite(text: string): number {
  const letztes = legeZeile(text, 1, 0, 0).at(-1)
  return letztes ? letztes.x + letztes.breite : 0
}

/* ── Geometrie eines Strichs ───────────────────────────────────────────── */

/** Bogenlänge. Bei einem Tupfer 0. */
export function laenge(s: Strich): number {
  let summe = 0
  for (let i = 1; i < s.length; i++) summe += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y)
  return summe
}

/** Der Anfang des Strichs bis zur Bogenlänge `bis` — das, was schon nachgespurt ist. */
export function anfangVon(s: Strich, bis: number): Strich {
  const teil = [s[0]]
  let rest = bis
  for (let i = 1; i < s.length && rest > 0; i++) {
    const a = s[i - 1]
    const b = s[i]
    const stueck = Math.hypot(b.x - a.x, b.y - a.y)
    if (stueck === 0) continue
    const t = Math.min(1, rest / stueck)
    teil.push(p(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
    rest -= stueck
  }
  return teil
}

/** Der Punkt bei Bogenlänge `bis`. */
export const punktBei = (s: Strich, bis: number): Punkt => anfangVon(s, bis).at(-1) ?? s[0]

/**
 * Der nächste Punkt des Strichs zum Zeiger, gesucht nur zwischen den Bogenlängen `von` und `bis`.
 *
 * Das Fenster ist der Kern des Nachspurens: bei O, 0 und 8 liegen Anfang und Ende aufeinander.
 * Auf der ganzen Linie gesucht, spränge das erste Aufsetzen sofort auf „fertig".
 */
export function naechster(
  s: Strich, x: number, y: number, von: number, bis: number,
): { bogen: number; abstand: number } {
  let bester = { bogen: von, abstand: Infinity }
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const a = s[i]
    const b = s[i + 1] ?? a
    const stueck = Math.hypot(b.x - a.x, b.y - a.y)
    const ende = start + stueck
    if (ende >= von && start <= bis) {
      // Lotfußpunkt auf dem Teilstück, beschränkt auf das Fenster.
      const lot = stueck === 0
        ? 0
        : ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / stueck
      const weg = Math.min(Math.min(stueck, bis - start), Math.max(Math.max(0, von - start), lot))
      const t = stueck === 0 ? 0 : weg / stueck
      const abstand = Math.hypot(x - (a.x + (b.x - a.x) * t), y - (a.y + (b.y - a.y) * t))
      // Bei Gleichstand gewinnt das frühere Stück: beim n führt der Weg auf derselben Linie
      // hinunter und wieder hinauf, und Ben soll erst unten ankommen.
      if (abstand < bester.abstand - 0.01) bester = { bogen: start + weg, abstand }
    }
    start = ende
  }
  return bester
}

/* ── Nachspuren ────────────────────────────────────────────────────────── */

/** So viel vom Ende darf fehlen: ein Zehntel des Strichs oder dieses Stück in Bändern, je nachdem,
 *  was mehr ist. Beim Querstrich des F wäre ein Zehntel sonst ein halber Millimeter. */
const REST = 0.15
/** So weit voraus (in Bändern) darf der Stift springen. Verhindert Abkürzen. */
const VORSPRUNG = 0.6
/** Zwischen zwei Abtastungen wird in so kleinen Schritten gefahren (Bühnen-Pixel). */
const SCHRITT = 6

/**
 * Der Stift fährt von `a` nach `b`: wie weit ist der Strich danach gefüllt? Gefahren wird in
 * kleinen Schritten: bei einer schnellen Maus liegen zwei Abtastungen weiter auseinander als der
 * erlaubte Vorsprung, und der Strich bliebe ohne Grund stehen.
 *
 * Gesucht wird nur knapp vor der Spitze — so springt ein geschlossenes O nicht beim ersten Punkt
 * auf fertig, und quer durch die Schleife abzukürzen bringt nichts.
 */
export function fahreNach(
  s: Strich, a: Punkt, b: Punkt, fortschritt: number, korridor: number, band: number,
): { fortschritt: number; fertig: boolean } {
  const ganz = laenge(s)
  const schritte = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / SCHRITT))
  for (let i = 1; i <= schritte; i++) {
    const x = a.x + ((b.x - a.x) * i) / schritte
    const y = a.y + ((b.y - a.y) * i) / schritte
    const n = naechster(s, x, y, fortschritt, fortschritt + VORSPRUNG * band)
    if (n.abstand <= korridor) fortschritt = Math.max(fortschritt, n.bogen)
    if (ganz - fortschritt <= Math.max(0.1 * ganz, REST * band)) return { fortschritt, fertig: true }
  }
  return { fortschritt, fertig: false }
}
