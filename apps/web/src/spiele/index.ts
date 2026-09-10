import type { ComponentType } from 'react'
import type { SpielErgebnis } from '../engine/segmente'
import type { Verein } from '../content/typen'
import { KATALOG, type Spieldaten } from './katalog'
import { Aufwaermen } from './aufwaermen'
import { Autogrammstunde } from './autogramme'
import { BallHochhalten } from './ballhochhalten'
import { LinieMalen } from './linie'
import { Platzwart } from './rasenmaehen'
import { Platzhalter } from './Platzhalter'

export type { Kategorie, Rolle } from './katalog'

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
  /**
   * Das Pausenmenü ist offen. Die Bildschleife muss dann **stehen bleiben**: sonst fällt der
   * Ball weiter, während Ben nicht hinsieht, und die gemessene Dauer enthält die Pausenzeit.
   * Weiterzeichnen ist richtig — nur `aktualisiere` darf nicht laufen.
   */
  angehalten: boolean
  /** Das Spiel meldet selbst „fertig". */
  onFertig: (ergebnis: SpielErgebnis) => void
}

export type Minispiel = Spieldaten & {
  Komponente: ComponentType<SpielProps>
}

/**
 * Titel, Anweisung, Rolle und Bereiche kommen aus `katalog.ts`; hier steht nur, welche
 * Komponente ein Spiel zeichnet. Noch nicht gebaute Spiele zeigen den `Platzhalter` —
 * ihre Daten sind trotzdem schon echt, sie gehören zum Tagesplan und nicht zur Umsetzung.
 *
 * Ein Spiel fertigstellen heißt: Datei danebenlegen und hier den Eintrag ergänzen.
 */
const KOMPONENTEN: Record<string, ComponentType<SpielProps>> = {
  aufwaermen: Aufwaermen,
  autogramme: Autogrammstunde,
  ballhochhalten: BallHochhalten,
  linie: LinieMalen,
  rasenmaehen: Platzwart,
}

export const SPIELE: Record<string, Minispiel> = Object.fromEntries(
  Object.entries(KATALOG).map(([id, daten]) => [
    id,
    { ...daten, Komponente: KOMPONENTEN[id] ?? Platzhalter },
  ]),
)
