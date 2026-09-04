import type { Verein } from '../content/typen'
import type { Segment } from './segmente'

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
  /** Der Therapeut kann ein Spiel aus dem Tagesplan nehmen. */
  aktiv: boolean
  reihenfolge: number
}

export type Einstellungen = {
  pauseDauerSek: number
  pauseInhalt: string
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
  spiele: {},
}

/** Vorgabe für ein Spiel, über das der Server nichts gesagt hat. */
export const fuerSpiel = (e: Einstellungen, spielId: string): SpielEinstellung =>
  e.spiele[spielId] ?? VORGABE

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
  verein: Verein,
  tag: number,
  e: Einstellungen,
  ersterStartUeberhaupt: boolean,
): Segment[] {
  const segmente: Segment[] = []

  if (ersterStartUeberhaupt) segmente.push({ art: 'namenseingabe' })
  if (tag === 1) segmente.push({ art: 'ankommen' })
  segmente.push({ art: 'ansage' })

  const spiele = verein.tage[tag - 1].spiele.filter((id) => fuerSpiel(e, id).aktiv)

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
 * Kann `false` werden, weil `tagesplan` die feste Spieleliste des Vereinstages gegen die
 * Einstellungen filtert: hat der Therapeut die Spiele dieses Tages alle abgewählt, bleibt nichts
 * übrig. Eine Einheit ohne Übung darf dann **nicht** starten — sonst liefe sie durch, meldete
 * „fertig" und schöbe den Fortschritt weiter, ohne dass Ben etwas getan hat.
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
