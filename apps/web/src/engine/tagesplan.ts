import type { Segment } from './segmente'
import { KATALOG, spieleMitRolle, type Kategorie, type Rolle } from '../spiele/katalog'

/**
 * Einstellungen des Therapeuten, die den Ablauf verändern (B1, A3, B3).
 *
 * Je Übungstyp, nicht global: B1 verlangt Toleranz, Zielgeschwindigkeit und Mindesttrefferquote
 * ausdrücklich „je Übungstyp". Die Werte kommen vom Server (`GET /api/kind`); die Vorgaben
 * unten gelten nur, solange das Gerät noch keine Antwort hat.
 */
export type SpielEinstellung = {
  stufe: number
  dauerSek: number
  toleranz: number
  zielgeschwindigkeit: number
  mindesttrefferquote: number
  /** Der Therapeut kann ein Spiel aus dem Topf nehmen. */
  aktiv: boolean
  reihenfolge: number
}

export type Einstellungen = {
  pauseDauerSek: number
  pauseInhalt: string
  /** Wie viele Übungen welcher Rolle eine Einheit hat. Vorgabe: 1 + 3 + 1. */
  anzahlAufwaermen: number
  anzahlUebungen: number
  anzahlSonder: number
  spiele: Record<string, SpielEinstellung>
}

const VORGABE: SpielEinstellung = {
  stufe: 3,
  dauerSek: 210, // 3,5 Min — A3 verlangt 3–5 Min je Spiel
  toleranz: 1,
  zielgeschwindigkeit: 1,
  mindesttrefferquote: 0.5,
  aktiv: true,
  reihenfolge: 0,
}

export const standardEinstellungen: Einstellungen = {
  pauseDauerSek: 10,
  pauseInhalt: '10 Hampelmänner',
  anzahlAufwaermen: 1,
  anzahlUebungen: 3,
  anzahlSonder: 1,
  spiele: {},
}

/** Vorgabe für ein Spiel, über das der Server nichts gesagt hat. */
export const fuerSpiel = (e: Einstellungen, spielId: string): SpielEinstellung =>
  e.spiele[spielId] ?? VORGABE

/** Der letzte Tag eines Vereins — dort steht das Sonderspiel (C6: 5 Einheiten je Verein). */
export const LETZTER_TAG = 5

/* ── Gesäter Zufall ────────────────────────────────────────────────────────
 *
 * Kein `Math.random()`: derselbe Tag muss denselben Plan ergeben. Bricht Ben ab und fängt
 * neu an, soll er das zu Ende bringen, was er angefangen hat — und der Plan muss sich mit
 * vitest prüfen lassen, was bei echtem Zufall nicht geht.
 *
 * Der Startwert kommt aus Verein und Tag, bewusst **ohne** Kind-Kennung: die kennt das Tablet
 * gar nicht, sie steckt nur im Gerätetoken. Nimmt der Therapeut ein Spiel aus dem Topf, wird
 * bei gleichem Startwert aus einer anderen Menge gezogen — dann kommen andere Übungen, ganz
 * ohne Sonderbehandlung.
 */

function startwert(vereinId: string, tag: number): number {
  let h = 2166136261
  const text = `${vereinId}#${tag}`
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Mulberry32 — ein winziger Pseudozufall. Wir brauchen keinen guten, nur einen wiederholbaren. */
function zufallsfolge(saat: number): () => number {
  let a = saat
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── Auswahl mit Abwechslung ─────────────────────────────────────────────── */

const gemeinsam = (a: Kategorie[], b: Kategorie[]) => a.filter((t) => b.includes(t)).length

/**
 * Wählt die Übungen eines Tages so, dass aufeinander möglichst verschiedene Fähigkeitsbereiche
 * folgen — Hand-Auge, dann Striche, dann Wellen, dann Druck statt zweimal dasselbe.
 *
 * Die Regel in vier Zeilen:
 * 1. Die erste Übung wird gewürfelt — dadurch führt mal Hand-Auge, mal Schreiben.
 * 2. Für jeden weiteren Platz gewinnt die Übung mit der **geringsten Überschneidung** zur
 *    vorherigen.
 * 3. Bei Gleichstand gewinnt, was heute noch nicht dran war.
 * 4. Bleibt es gleich, entscheidet der Zufall — und dasselbe Spiel nie dreimal hintereinander.
 *
 * Ist der Topf kleiner als der Tag lang, muss sich etwas wiederholen; dann greift nur noch
 * Regel 4. Normalerweise kommt es dazu nicht, weil der Server das Speichern ablehnt, wenn
 * weniger Spiele aktiv sind als eingestellt.
 */
function waehle(topf: string[], anzahl: number, wuerfel: () => number, bisher: string[]): string[] {
  if (topf.length === 0 || anzahl <= 0) return []

  const gewaehlt: string[] = []

  for (let platz = 0; platz < anzahl; platz++) {
    const alle = [...bisher, ...gewaehlt]
    const vorher = alle.at(-1)

    const erlaubt = topf.filter((id) => {
      // Nie dreimal dasselbe hintereinander.
      const [a, b] = [alle.at(-1), alle.at(-2)]
      return !(a === id && b === id)
    })
    const kandidaten = erlaubt.length ? erlaubt : topf

    const bewertet = kandidaten.map((id) => ({
      id,
      ueberschneidung: vorher ? gemeinsam(KATALOG[id].tags, KATALOG[vorher].tags) : 0,
      schonDran: gewaehlt.includes(id) ? 1 : 0,
    }))

    const beste = Math.min(...bewertet.map((k) => k.ueberschneidung))
    const engereWahl = bewertet.filter((k) => k.ueberschneidung === beste)
    const frisch = engereWahl.filter((k) => k.schonDran === 0)
    const endauswahl = frisch.length ? frisch : engereWahl

    gewaehlt.push(endauswahl[Math.floor(wuerfel() * endauswahl.length)].id)
  }

  return gewaehlt
}

const aktiveMitRolle = (e: Einstellungen, rolle: Rolle) =>
  spieleMitRolle(rolle).filter((id) => fuerSpiel(e, id).aktiv)

/**
 * Die Übungen eines Tages in ihrer Reihenfolge: erst Aufwärmen, dann die normalen Übungen,
 * und am letzten Tag zum Schluss das Sonderspiel.
 *
 * Die Abwechslungsregel läuft über die ganze Reihe hinweg, nicht je Rolle getrennt — sonst
 * käme nach einem Hand-Auge-Aufwärmspiel gleich wieder eine Hand-Auge-Übung.
 */
export function spieleDesTages(vereinId: string, tag: number, e: Einstellungen): string[] {
  const wuerfel = zufallsfolge(startwert(vereinId, tag))
  const plan: string[] = []

  plan.push(...waehle(aktiveMitRolle(e, 'aufwaermen'), e.anzahlAufwaermen, wuerfel, plan))
  plan.push(...waehle(aktiveMitRolle(e, 'normal'), e.anzahlUebungen, wuerfel, plan))

  // Das Abschiedsgeschenk schließt den Verein ab und steht deshalb immer ganz am Ende.
  if (tag === LETZTER_TAG) {
    plan.push(...waehle(aktiveMitRolle(e, 'sonder'), e.anzahlSonder, wuerfel, plan))
  }

  return plan
}

/**
 * Baut die Segmentliste für einen Trainingstag.
 *
 *   [Namenseingabe]   nur beim allerersten Start überhaupt
 *   [Ankommen]        nur an Tag 1 eines Vereins
 *    Ansage
 *    Spiel → Selbsteinschätzung → Lob → Pause → Spiel → …
 *    Abschluss-Fragebogen
 *
 * Die Reihenfolge Selbsteinschätzung **vor** Lob ist C3 und keine Geschmacksfrage:
 * andersherum misst man, ob Ben ein Ergebnis ablesen kann. Siehe Test.
 */
export function tagesplan(
  vereinId: string,
  tag: number,
  e: Einstellungen,
  ersterStartUeberhaupt: boolean,
): Segment[] {
  const segmente: Segment[] = []

  if (ersterStartUeberhaupt) segmente.push({ art: 'namenseingabe' })
  if (tag === 1) segmente.push({ art: 'ankommen' })
  segmente.push({ art: 'ansage' })

  const spiele = spieleDesTages(vereinId, tag, e)

  spiele.forEach((spielId, i) => {
    const s = fuerSpiel(e, spielId)
    segmente.push({ art: 'spiel', spielId, dauerSek: s.dauerSek, stufe: s.stufe })
    segmente.push({ art: 'selbsteinschaetzung' })
    segmente.push({ art: 'lob' })
    // Keine Pause nach dem letzten Spiel — die Einheit soll im Erfolg enden,
    // nicht mit Warten vor dem Fragebogen.
    if (i < spiele.length - 1) {
      segmente.push({ art: 'pause', dauerSek: e.pauseDauerSek, inhalt: e.pauseInhalt })
    }
  })

  segmente.push({ art: 'fragebogen' })
  return segmente
}

/**
 * Enthält der Plan überhaupt eine Übung?
 *
 * Kann `false` werden, wenn der Therapeut alle Spiele abgewählt hat. Eine Einheit ohne Übung
 * darf dann **nicht** starten — sonst liefe sie durch, meldete „fertig" und schöbe den
 * Fortschritt weiter, ohne dass Ben etwas getan hat.
 */
export const hatUebung = (segmente: Segment[]) => segmente.some((s) => s.art === 'spiel')

/** Für die Ansage (A5: ein Satz, keine Spieldetails). */
export function ansageText(segmente: Segment[]): string {
  const spiele = segmente.filter((s) => s.art === 'spiel').length
  const pausen = segmente.filter((s) => s.art === 'pause').length
  const minuten = Math.round(
    segmente.reduce((m, s) => m + (s.art === 'spiel' || s.art === 'pause' ? s.dauerSek : 0), 0) / 60,
  )
  return `Wir machen ${spiele} Übungen mit ${pausen} Pausen — das dauert etwa ${minuten} Minuten.`
}
