import type { Verein } from '../content/typen'
import type { Segment } from './segmente'

/** Einstellungen des Therapeuten, die den Ablauf verändern (B1, A3). */
export type Einstellungen = {
  spielDauerSek: number
  pauseDauerSek: number
  pauseInhalt: string
  stufe: number
  /** Spiele, die Thomas für Ben weggelassen hat. */
  ausgelassen: string[]
}

export const standardEinstellungen: Einstellungen = {
  spielDauerSek: 210, // 3,5 Min — A3 verlangt 3–5 Min je Spiel
  pauseDauerSek: 10,
  pauseInhalt: '10 Hampelmänner',
  stufe: 3,
  ausgelassen: [],
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
  verein: Verein,
  tag: number,
  e: Einstellungen,
  ersterStartUeberhaupt: boolean,
): Segment[] {
  const segmente: Segment[] = []

  if (ersterStartUeberhaupt) segmente.push({ art: 'namenseingabe' })
  if (tag === 1) segmente.push({ art: 'ankommen' })
  segmente.push({ art: 'ansage' })

  const spiele = verein.tage[tag - 1].spiele.filter((id) => !e.ausgelassen.includes(id))

  spiele.forEach((spielId, i) => {
    segmente.push({ art: 'spiel', spielId, dauerSek: e.spielDauerSek, stufe: e.stufe })
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

/** Für die Ansage (A5: ein Satz, keine Spieldetails). */
export function ansageText(segmente: Segment[]): string {
  const spiele = segmente.filter((s) => s.art === 'spiel').length
  const pausen = segmente.filter((s) => s.art === 'pause').length
  const minuten = Math.round(
    segmente.reduce((m, s) => m + (s.art === 'spiel' || s.art === 'pause' ? s.dauerSek : 0), 0) / 60,
  )
  return `Wir machen ${spiele} Übungen mit ${pausen} Pausen — das dauert etwa ${minuten} Minuten.`
}
