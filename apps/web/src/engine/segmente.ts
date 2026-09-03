import type { Aufzeichnung } from '../rohdaten'

/**
 * Ein Trainingstag ist eine lineare Liste von Segmenten — kein Zustandsautomat
 * und kein Router. Die Reihenfolge in der Liste *ist* die Ablaufregel.
 */

export type Segment =
  /** Nur beim allerersten Start überhaupt: Ben schreibt seinen Namen mit dem Stift. */
  | { art: 'namenseingabe' }
  /** Nur an Tag 1 eines Vereins: der Profi begrüßt. */
  | { art: 'ankommen' }
  /** Ansage des groben Plans: Dauer, Anzahl Übungen und Pausen (A5: ein Satz). */
  | { art: 'ansage' }
  | { art: 'spiel'; spielId: string; dauerSek: number; stufe: number }
  /**
   * C3: Die Frage steht **vor** Lob und Ergebnis. Andersherum misst man nicht die
   * Selbsteinschätzung, sondern die Fähigkeit, ein Ergebnis abzulesen.
   */
  | { art: 'selbsteinschaetzung' }
  /** Lob des Profis, danach das Ergebnis (C5). */
  | { art: 'lob' }
  /** A3: anhaltbar, aber nicht überspringbar. */
  | { art: 'pause'; dauerSek: number; inhalt: string }
  | { art: 'fragebogen' }

export type SegmentArt = Segment['art']

/** Drei Stufen, nicht fünf. 1 = ging schlecht, 3 = ging gut. */
export type Smiley = 1 | 2 | 3

/**
 * Rückgabe jedes Minispiels: fester Kern + freies Extra.
 *
 * ACHTUNG — die Zahlen hier sind **unmaßgeblich**. Sie entstehen im Browser für das
 * Sofortfeedback aus A1 (Strich, Sound, Partikel, Sterne) und dürfen nie in einem
 * Bericht landen. Die maßgeblichen Kennzahlen rechnet C# aus der Rohdaten-Punktfolge.
 */
export type SpielErgebnis = {
  /**
   * Vom Gerät vergeben, erst beim Abschluss durch den `SpielScreen`. Dadurch ist ein
   * wiederholter Upload nach einem Verbindungsabbruch ein Upsert statt eines Duplikats.
   * Die Minispiele setzen das Feld nicht selbst.
   */
  id?: string
  spielId: string
  dauerMs: number
  /** 0–1, wie viel der Aufgabe bearbeitet wurde. */
  vollstaendigkeit: number
  /** 0–1, grobe Trefferschätzung. Siehe Warnung oben. */
  genauigkeit: number
  druckMittel: number
  druckStreuung: number
  eingabegeraet: 'pen' | 'mouse' | 'touch'
  /**
   * Druck per Tastatur simuliert (Maus-Fallback). Ohne diese Markierung mischen sich
   * echte Pencil-Druckkurven mit Tastaturwerten und die Verlaufskurve lügt.
   */
  synthetischerDruck: boolean
  /** Eingestellte Schwierigkeitsstufe. Muss mit, sonst sieht eine vom Therapeuten
   *  erhöhte Anforderung im Verlauf wie eine Verschlechterung aus. */
  stufe: number
  abgebrochen: boolean
  /** Spielspezifisch, geht nicht in den Verlaufsgraphen. */
  extra: Record<string, unknown>
  /**
   * B4: die aufgezeichnete Punktfolge. Wird vom `SpielScreen` angehängt, nicht vom Spiel —
   * dadurch zeichnet jedes Minispiel auf, ohne eine Zeile dafür zu enthalten.
   * Aus diesen Werten rechnet C# die maßgeblichen Kennzahlen.
   */
  rohdaten?: Aufzeichnung
}
