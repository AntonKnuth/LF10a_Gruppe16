/**
 * Funken (A1): ein kurzer Stoß bunter Punkte als Sofortbelohnung.
 *
 * Gemeinsam für alle Spiele, die Funken zeigen. Drei Regeln gelten überall:
 * - Ben hat ADHS (A2): es flackert nichts dauerhaft. Jeder Funke lebt eine feste Zeit, und die
 *   Zahl gleichzeitiger Funken ist hart begrenzt.
 * - Kein Zufall: die Richtung folgt aus der Nummer des Funkens. So ist jeder Test wiederholbar.
 * - `prefers-reduced-motion` prüft das Spiel selbst, bevor es `funkenstoss` aufruft — die Welt
 *   gehört dem Spiel, nicht dieser Datei.
 *
 * Wie kräftig ein Stoß ist, darf jedes Spiel selbst bestimmen (`Stossart`): ein großer Jubel am
 * Tor sieht anders aus als ein kleiner Stoß am Ende eines Strichs.
 */
import { kreis } from './geometrie'

export type Funke = { x: number; y: number; vx: number; vy: number; leben: number; farbe: string }

/** Die Eigenheiten eines Spiels. Alle Geschwindigkeiten in Bühnenpixeln pro Sekunde. */
export type Stossart = {
  /** Lebensdauer jedes Funkens in Sekunden. */
  leben: number
  /** Höchstzahl gleichzeitig sichtbarer Funken. */
  max: number
  /** Grundtempo nach außen. */
  tempo: number
  /** Zuschlag für jeden zweiten und dritten Funken (`i % 3`), damit der Kreis nicht starr wirkt. */
  tempoStufe: number
  /** Schub nach oben, damit der Stoß wie eine kleine Fontäne aufsteigt. */
  auftrieb: number
}

/** Hängt `anzahl` Funken gleichmäßig im Kreis um (x, y) an, in den Farben reihum. */
export function funkenstoss(
  funken: Funke[], x: number, y: number, farben: string[], anzahl: number, art: Stossart,
) {
  for (let i = 0; i < anzahl && funken.length < art.max; i++) {
    const winkel = (i / anzahl) * Math.PI * 2
    const tempo = art.tempo + (i % 3) * art.tempoStufe
    funken.push({
      x, y,
      vx: Math.cos(winkel) * tempo,
      vy: Math.sin(winkel) * tempo - art.auftrieb,
      leben: art.leben,
      farbe: farben[i % farben.length],
    })
  }
}

/**
 * Funken fliegen, fallen und verschwinden nach ihrer Lebensdauer. Gibt die noch lebenden zurück;
 * der Aufrufer schreibt sie in seine Welt zurück (`w.funken = bewegeFunken(w.funken, dt)`).
 */
export function bewegeFunken(funken: Funke[], dt: number, schwerkraft = 400): Funke[] {
  for (const f of funken) {
    f.leben -= dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.vy += schwerkraft * dt
  }
  return funken.filter((f) => f.leben > 0)
}

/** Kleine Punkte, die mit ihrer Lebensdauer verblassen. `lebenSek` ist die volle Lebensdauer. */
export function zeichneFunken(g: CanvasRenderingContext2D, funken: Funke[], lebenSek: number) {
  g.save()
  for (const f of funken) {
    g.globalAlpha = Math.max(0, f.leben / lebenSek)
    g.fillStyle = f.farbe
    kreis(g, f.x, f.y, 5)
    g.fill()
  }
  g.restore()
}
