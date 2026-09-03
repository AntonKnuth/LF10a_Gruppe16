import type { ComponentType } from 'react'
import type { SpielErgebnis } from '../engine/segmente'
import type { Verein } from '../content/typen'
import { BallHochhalten } from './ballhochhalten'
import { Platzwart } from './rasenmaehen'
import { Platzhalter } from './Platzhalter'

/**
 * Fähigkeitsbereiche für die Auswertung. Ein Spiel kann mehrere tragen — ohne diese
 * Tags lassen sich unterschiedliche Spiele im Bericht nicht zusammenfassen.
 */
export type Kategorie =
  | 'gerade-striche'
  | 'wellen'
  | 'schreiben'
  | 'druckdosierung'
  | 'hand-auge'
  | 'pinzettengriff'
  | 'inhibition'

/**
 * Schnittstelle jedes Minispiels. Jedes Spiel ist eine eigene Datei in diesem Ordner und
 * hängt nur hieran — so kann jedes Gruppenmitglied sein Spiel isoliert bauen, ohne dass
 * zwei Leute in derselben Datei arbeiten.
 */
export type SpielProps = {
  stufe: number
  verein: Verein
  name: string
  /** Die geplante Spieldauer ist abgelaufen. Zeitbasierte Spiele beenden sich daraufhin;
   *  Spiele mit anderer Endbedingung (Wiederholungen, erschöpfter Inhalt) ignorieren es. */
  zeitAbgelaufen: boolean
  /** Das Spiel meldet selbst „fertig". */
  onFertig: (ergebnis: SpielErgebnis) => void
}

export type Minispiel = {
  titel: string
  /** Genau ein Satz (A5), wird vorgelesen. */
  anweisung: string
  tags: Kategorie[]
  Komponente: ComponentType<SpielProps>
}

/**
 * Noch nicht gebaute Spiele zeigen den Platzhalter. Titel, Anweisung und Tags sind schon
 * echt — sie gehören zum Tagesplan, nicht zur Umsetzung.
 */
export const SPIELE: Record<string, Minispiel> = {
  aufwaermen: {
    titel: 'Aufwärmen',
    anweisung: 'Fahre den Dribbel-Parcours fünfmal nach.',
    tags: ['wellen', 'hand-auge'],
    Komponente: Platzhalter,
  },
  linie: {
    titel: 'Linie malen',
    anweisung: 'Ziehe den Ball auf der Linie zum Tor.',
    tags: ['gerade-striche'],
    Komponente: Platzhalter,
  },
  autogramme: {
    titel: 'Autogrammstunde',
    anweisung: 'Schreibe dein Autogramm auf jedes Trikot.',
    tags: ['schreiben', 'pinzettengriff'],
    Komponente: Platzhalter,
  },
  rasenmaehen: {
    titel: 'Platzwart',
    anweisung: 'Mähe den Rasen — nicht zu fest und nicht zu leicht drücken.',
    tags: ['druckdosierung'],
    Komponente: Platzwart,
  },
  stationentour: {
    titel: 'Stadionführung',
    anweisung: 'Schreibe die Stadionfakten in gleichmäßigem Tempo ab.',
    tags: ['schreiben', 'druckdosierung'],
    Komponente: Platzhalter,
  },
  startelf: {
    titel: 'Startelf',
    anweisung: 'Schreibe Namen und Rückennummer der Spieler auf.',
    tags: ['schreiben'],
    Komponente: Platzhalter,
  },
  elfmeter: {
    titel: 'Elfmeter',
    anweisung: 'Schieße mit einem schnellen, gleichmäßigen Strich aufs Tor.',
    tags: ['hand-auge', 'druckdosierung'],
    Komponente: Platzhalter,
  },
  dribbeln: {
    titel: 'Dribbeln mit Pfiff',
    anweisung: 'Halte beim Pfiff an, aber hebe den Stift nicht ab.',
    tags: ['inhibition', 'wellen'],
    Komponente: Platzhalter,
  },
  ballhochhalten: {
    titel: 'Ball hochhalten',
    anweisung: 'Tippe den Ball an und drücke so fest auf, dass er im violetten Band umkehrt.',
    tags: ['hand-auge', 'druckdosierung'],
    Komponente: BallHochhalten,
  },
  abschiedsgeschenk: {
    titel: 'Abschiedsgeschenk',
    anweisung: 'Schreibe den Satz auf Papier und fotografiere ihn ab.',
    tags: ['schreiben'],
    Komponente: Platzhalter,
  },
}
