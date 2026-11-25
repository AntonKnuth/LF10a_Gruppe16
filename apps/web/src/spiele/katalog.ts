/**
 * Die reinen Daten über jedes Minispiel: Titel, Anweisung, Rolle, Fähigkeitsbereiche.
 *
 * **Bewusst ohne React.** Der Tagesplan-Generator in `engine/tagesplan.ts` braucht Rollen und
 * Bereiche, um die Übungen des Tages zu würfeln — würde er `spiele/index.ts` importieren, zöge
 * er jede Spielkomponente und damit Canvas und WebAudio in die Engine und in deren Tests.
 * Hier stehen die Daten, dort die Komponenten.
 */

/**
 * Fähigkeitsbereiche für die Auswertung. Ein Spiel kann mehrere tragen — ohne diese
 * Tags lassen sich unterschiedliche Spiele im Bericht nicht zusammenfassen.
 *
 * Der Generator benutzt sie außerdem für die Abwechslung: zwei aufeinanderfolgende Übungen
 * sollen möglichst wenig gemeinsame Bereiche haben.
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
 * Wozu ein Spiel im Tagesablauf dient. Die Rolle vergibt der Content, **nicht** der Therapeut —
 * ob „Aufwärmen" ein Aufwärmspiel ist, ist eine Eigenschaft des Spiels und keine Einstellung.
 *
 * `sonder` ist das Abschiedsgeschenk am letzten Tag eines Vereins: es steht immer am Ende von
 * Tag 5 und wird nie dazwischengeschoben.
 */
export type Rolle = 'aufwaermen' | 'normal' | 'sonder'

export type Spieldaten = {
  titel: string
  /** Genau ein Satz (A5), wird vorgelesen. */
  anweisung: string
  rolle: Rolle
  tags: Kategorie[]
  /**
   * Noch nicht gebaut: kommt in keinem Tagesplan vor, sonst bekäme Ben den `Platzhalter`. Ist das
   * Spiel fertig, die Markierung hier **und** in `apps/api/Auswertung/Spielkatalog.cs` entfernen.
   */
  inArbeit?: true
}

export const KATALOG: Record<string, Spieldaten> = {
  aufwaermen: {
    titel: 'Aufwärmen',
    anweisung: 'Fahre den Dribbel-Parcours fünfmal nach.',
    rolle: 'aufwaermen',
    tags: ['wellen', 'hand-auge'],
  },
  linie: {
    titel: 'Linie malen',
    anweisung: 'Ziehe den Ball auf der Linie zum Tor.',
    rolle: 'normal',
    tags: ['gerade-striche'],
  },
  autogramme: {
    titel: 'Autogrammstunde',
    anweisung: 'Schreibe dein Autogramm auf jedes Trikot.',
    rolle: 'normal',
    tags: ['schreiben', 'pinzettengriff'],
  },
  rasenmaehen: {
    titel: 'Platzwart',
    anweisung: 'Mähe den Rasen — nicht zu fest und nicht zu leicht drücken.',
    rolle: 'normal',
    tags: ['druckdosierung'],
  },
  stationentour: {
    titel: 'Stadionführung',
    anweisung: 'Schreibe die Stadionfakten in gleichmäßigem Tempo ab.',
    rolle: 'normal',
    tags: ['schreiben', 'druckdosierung'],
    inArbeit: true,
  },
  startelf: {
    titel: 'Startelf',
    anweisung: 'Schreibe Namen und Rückennummer der Spieler auf.',
    rolle: 'normal',
    tags: ['schreiben'],
    inArbeit: true,
  },
  elfmeter: {
    titel: 'Elfmeter',
    anweisung: 'Schieße mit einem schnellen, gleichmäßigen Strich aufs Tor.',
    rolle: 'normal',
    tags: ['hand-auge', 'druckdosierung'],
    inArbeit: true,
  },
  dribbeln: {
    titel: 'Dribbeln mit Pfiff',
    anweisung: 'Halte beim Pfiff an, aber hebe den Stift nicht ab.',
    rolle: 'normal',
    tags: ['inhibition', 'wellen'],
    inArbeit: true,
  },
  brezelverkauf: {
    titel: 'Brezelverkauf',
    anweisung: 'Zeichne den Weg zu dem Zuschauer, der etwas bestellt hat.',
    rolle: 'normal',
    tags: ['gerade-striche', 'hand-auge'],
  },
  ballhochhalten: {
    titel: 'Ball hochhalten',
    anweisung: 'Tippe den Ball an und drücke so fest auf, dass er im violetten Band umkehrt.',
    rolle: 'normal',
    tags: ['hand-auge', 'druckdosierung'],
  },
  abschiedsgeschenk: {
    titel: 'Urkunde',
    anweisung: 'Unterschreibe deine Urkunde mit deinem Spielnamen.',
    rolle: 'sonder',
    tags: ['schreiben'],
  },
}

export const spielIds = Object.keys(KATALOG)

/** Die spielbaren Spiele einer Rolle — was noch in Arbeit ist, fehlt hier. */
export const spieleMitRolle = (rolle: Rolle) =>
  spielIds.filter((id) => KATALOG[id].rolle === rolle && !KATALOG[id].inArbeit)
