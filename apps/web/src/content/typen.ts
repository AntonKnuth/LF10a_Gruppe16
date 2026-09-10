/**
 * Content-Schema. Ein Verein ist ein reines Datenpaket — der Austausch echter Vereine
 * gegen fiktive darf keinen Code anfassen, nur Dateien in diesem Ordner.
 *
 * Die Prüfung macht TypeScript beim Bauen (`satisfies Verein`): ein fehlendes Feld gibt
 * einen Übersetzungsfehler statt eines leeren Bildschirms. Keine Laufzeit-Validierung,
 * solange der Content mit einkompiliert wird und nicht nachgeladen werden kann.
 */

/** Jeder Text wird vorgelesen (A5). Phase 1 per Web Speech API, `audio` später als MP3. */
export type Dialog = {
  /** `{name}` wird durch Bens Vornamen ersetzt (C5). */
  text: string
  audio?: string
}

export type Spruch = {
  text: string
  sprache: string
  /** Fremdsprachige Sprüche immer mit deutscher Übersetzung. */
  uebersetzung: string
}

export type Profi = {
  name: string
  begruessung: Dialog
  /** Zufällig gewähltes Lob nach einer Übung. */
  lob: Dialog[]
  /** Bei persönlicher Bestleistung. `{name}` und `{wert}` werden ersetzt. */
  bestleistung: Dialog
}

export type Verein = {
  id: string
  name: string
  stadt: string
  /** Position auf der Europakarte, 0–100 % der Kartenfläche. */
  karte: { x: number; y: number }
  farben: { primaer: string; sekundaer: string }
  profi: Profi
  // --- Vereinsspezifische Aufgabeninhalte ---
  // Der Kern des Konzepts: Ben soll den Eindruck haben, wirklich mit den Leuten
  // dort zu trainieren — nicht dieselbe Übung mit ausgetauschtem Wappen.
  /** Startelf: Namen und Rückennummern zum Schreiben. */
  kader: { nummer: number; name: string }[]
  /** Echte Fakten zu diesem Stadion, für die Stationentour. */
  fakten: string[]
  sprueche: Spruch[]
}
