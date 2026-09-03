/**
 * Was Ben selbst am Gerät einstellen darf: Ton und Bildschirmhelligkeit.
 *
 * Eine Stelle für alles, was das Pausenmenü schaltet — vorher war der Ton an zwei Orten
 * halb umgesetzt: `tk.tonAus` steuerte nur das Vorlesen, die Spielgeräusche hatten eine
 * eigene Variable, die nie gesetzt wurde. **A4 („Ton nur funktional und abschaltbar") war
 * damit schlicht nicht erfüllt.**
 *
 * Kein React-Context: die Spielgeräusche laufen in einer Bildschleife außerhalb von React
 * und müssen den Wert synchron lesen können. Deshalb ein Modul mit Wert und Benachrichtigung.
 */

export type Bedienung = {
  tonAn: boolean
  /** 0 bis 1. */
  lautstaerke: number
  /**
   * 0 bis 0.6. Eine Web-App kann die Hintergrundbeleuchtung **nicht** steuern — dafür gibt es
   * keine Browser-Schnittstelle. Machbar ist ein abdunkelnder Schleier über dem Inhalt; für
   * ein Kind sieht das aus wie „dunkler". Der Schalter heißt deshalb „Abdunkeln" und nicht
   * „Helligkeit".
   */
  abdunkeln: number
}

const SCHLUESSEL = 'tk.bedienung'

const VORGABE: Bedienung = { tonAn: true, lautstaerke: 0.7, abdunkeln: 0 }

function lies(): Bedienung {
  try {
    const roh = localStorage.getItem(SCHLUESSEL)
    if (roh) return { ...VORGABE, ...(JSON.parse(roh) as Partial<Bedienung>) }
    // Übernahme des alten Schalters, damit ein bereits abgeschalteter Ton abgeschaltet bleibt.
    if (localStorage.getItem('tk.tonAus') === '1') return { ...VORGABE, tonAn: false }
  } catch {
    // Kaputter Eintrag darf den Start nicht blockieren.
  }
  return VORGABE
}

let wert = lies()
const hoerer = new Set<() => void>()

export const bedienung = () => wert

/** Für die Bildschleifen der Spiele: 0, wenn der Ton aus ist. */
export const tonLautstaerke = () => (wert.tonAn ? wert.lautstaerke : 0)

export function setzeBedienung(aenderung: Partial<Bedienung>) {
  wert = { ...wert, ...aenderung }
  localStorage.setItem(SCHLUESSEL, JSON.stringify(wert))
  hoerer.forEach((h) => h())
}

/** Meldet einen Hörer an; Rückgabe wieder abmelden (React-Cleanup). */
export function beiBedienungsAenderung(rueckruf: () => void) {
  hoerer.add(rueckruf)
  return () => {
    hoerer.delete(rueckruf)
  }
}
