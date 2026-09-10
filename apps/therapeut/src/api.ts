/**
 * Aufrufe an den Server. Von Hand geschrieben, kein Codegenerator.
 *
 * Bei rund einem Dutzend Endpunkten ist diese Datei kürzer als die Werkzeugkette, die sie
 * erzeugen würde — und jede Zeile darin lässt sich in der Prüfung erklären.
 *
 * `credentials: 'include'` ist nötig, weil die Anmeldung über ein Cookie läuft. Da beide Apps
 * unter derselben Origin liegen, reicht das; CORS gibt es nicht zu konfigurieren.
 */

export type Klient = {
  id: number
  vorname: string
  nachname: string
  spielname: string | null
}

export type KlientDetail = Klient & {
  pausenDauerSek: number
  pausenInhalt: string
}

export type Rolle = 'aufwaermen' | 'normal' | 'sonder'

/**
 * Rolle je Spiel. Vergibt der Content, nicht der Therapeut — er sieht sie nur als Abschnitt.
 * Muss zu `apps/api/Auswertung/Spielkatalog.cs` passen; ein fehlender Eintrag gilt dort wie
 * hier als normale Übung.
 */
export const SPIEL_ROLLE: Record<string, Rolle> = {
  aufwaermen: 'aufwaermen',
  abschiedsgeschenk: 'sonder',
}

export const rolleVon = (spielId: string): Rolle => SPIEL_ROLLE[spielId] ?? 'normal'

export type Tagesform = {
  anzahlAufwaermen: number
  anzahlUebungen: number
  anzahlSonder: number
  spiele: Einstellung[]
}

export type Einstellung = {
  spielId: string
  stufe: number
  toleranz: number
  zielgeschwindigkeit: number
  mindesttrefferquote: number
  dauerSek: number
  aktiv: boolean
  reihenfolge: number
}

export type Kennzahl = {
  punkte: number
  dauerMs: number
  weglaenge: number
  tempoMittel: number
  tempoStreuung: number
  zittern: number
  druckMittel: number
  druckStreuung: number
  absetzer: number
}

export type VerlaufPunkt = {
  sessionId: string
  datum: string
  spielId: string
  stufe: number
  eingabegeraet: string
  synthetischerDruck: boolean
  abgebrochen: boolean
  selbsteinschaetzung: number | null
  kennzahlen: Kennzahl | null
}

export type SpielZeile = {
  spielId: string
  anzahl: number
  stufe: number
  uebungszeitMinuten: number
  mittelwerte: Kennzahl | null
  ohneRohdaten: number
}

export type KategorieZeile = {
  kategorie: string
  anzahl: number
  uebungszeitMinuten: number
  mittelwerte: Kennzahl | null
  ohneRohdaten: number
}

export type Wochenbericht = {
  von: string
  bis: string
  klient: string
  spielname: string | null
  einheiten: number
  abgebrochen: number
  uebungszeitMinuten: number
  proKategorie: KategorieZeile[]
  proSpiel: SpielZeile[]
  selbsteinschaetzungMittel: number | null
  hinweise: string[]
}

export type Geraet = {
  id: number
  bezeichnung: string
  aktiv: boolean
  erstelltAm: string
  zuletztGesehen: string | null
}

export class NichtAngemeldet extends Error {}

async function hole<T>(pfad: string, optionen: RequestInit = {}): Promise<T> {
  const antwort = await fetch(pfad, {
    credentials: 'include',
    headers: optionen.body ? { 'Content-Type': 'application/json' } : undefined,
    ...optionen,
  })

  // 401 ist kein Fehler im üblichen Sinn, sondern der Normalfall beim ersten Aufruf.
  // Die Oberfläche zeigt daraufhin die Anmeldung, statt eine Fehlermeldung.
  if (antwort.status === 401) throw new NichtAngemeldet()

  // Der Server lehnt eine ungültige Tagesform mit einer erklärenden Meldung ab. Die soll
  // Thomas lesen können — „400 Bad Request" hilft ihm nicht weiter.
  if (antwort.status === 400) throw new Error((await antwort.text()) || 'Ungültige Eingabe.')

  if (!antwort.ok) throw new Error(`${antwort.status} ${antwort.statusText}`)

  // Erst lesen, dann entscheiden — nicht am Statuscode festmachen. Ein 201 ohne Rumpf oder ein
  // 200 mit leerer Antwort ließe `antwort.json()` werfen, obwohl der Aufruf erfolgreich war.
  const rumpf = await antwort.text()
  return (rumpf ? JSON.parse(rumpf) : undefined) as T
}

export const api = {
  anmelden: (email: string, passwort: string) =>
    hole<{ id: number; vorname: string; nachname: string }>('/api/anmeldung', {
      method: 'POST',
      body: JSON.stringify({ email, passwort }),
    }),

  abmelden: () => hole<void>('/api/abmeldung', { method: 'POST' }),

  ich: () => hole<{ id: number; name: string }>('/api/ich'),

  klienten: () => hole<Klient[]>('/api/klienten'),

  klient: (id: number) => hole<KlientDetail>(`/api/klienten/${id}`),

  klientAnlegen: (vorname: string, nachname: string) =>
    hole<{ id: number }>('/api/klienten', {
      method: 'POST',
      body: JSON.stringify({ vorname, nachname }),
    }),

  klientLoeschen: (id: number) => hole<void>(`/api/klienten/${id}`, { method: 'DELETE' }),

  einstellungen: (id: number) => hole<Tagesform>(`/api/klienten/${id}/einstellungen`),

  einstellungenSpeichern: (id: number, form: Tagesform) =>
    hole<void>(`/api/klienten/${id}/einstellungen`, {
      method: 'PUT',
      body: JSON.stringify(form),
    }),

  pauseSpeichern: (id: number, pausenDauerSek: number, pausenInhalt: string) =>
    hole<void>(`/api/klienten/${id}/pause`, {
      method: 'PUT',
      body: JSON.stringify({ pausenDauerSek, pausenInhalt }),
    }),

  verlauf: (id: number) => hole<VerlaufPunkt[]>(`/api/klienten/${id}/verlauf`),

  wochenbericht: (id: number, von?: string) =>
    hole<Wochenbericht>(
      `/api/klienten/${id}/wochenbericht${von ? `?von=${von}` : ''}`,
    ),

  geraete: (id: number) => hole<Geraet[]>(`/api/klienten/${id}/geraete`),

  kopplungscode: (id: number) =>
    hole<{ code: string; laeuftAbAm: string }>(`/api/klienten/${id}/kopplungscode`, {
      method: 'POST',
    }),

  geraetSperren: (geraetId: number) =>
    hole<void>(`/api/geraete/${geraetId}/sperren`, { method: 'POST' }),
}

/** Titel der Minispiele. Bewusst hier und nicht in der Datenbank: der Content gehört zur
 *  Kind-App, der Server kennt nur die IDs. */
export const SPIEL_TITEL: Record<string, string> = {
  aufwaermen: 'Aufwärmen',
  linie: 'Linie malen',
  autogramme: 'Autogrammstunde',
  rasenmaehen: 'Platzwart',
  stationentour: 'Stadionführung',
  startelf: 'Startelf',
  elfmeter: 'Elfmeter',
  dribbeln: 'Dribbeln mit Pfiff',
  ballhochhalten: 'Ball hochhalten',
  brezelverkauf: 'Brezelverkauf',
  abschiedsgeschenk: 'Abschiedsgeschenk',
}

export const titel = (spielId: string) => SPIEL_TITEL[spielId] ?? spielId

/**
 * Anzeigenamen der Fähigkeitsbereiche. Die Zuordnung Spiel → Bereich macht der Server
 * (`Auswertung/Kategorien.cs`) — hier stehen nur die Beschriftungen.
 */
export const KATEGORIE_TITEL: Record<string, string> = {
  'gerade-striche': 'Gerade Striche',
  wellen: 'Wellen und Bögen',
  schreiben: 'Schreibübungen',
  druckdosierung: 'Druckdosierung',
  'hand-auge': 'Hand-Auge-Koordination',
  pinzettengriff: 'Pinzettengriff',
  inhibition: 'Impulskontrolle',
  'ohne-zuordnung': 'Ohne Zuordnung',
}

export const kategorieTitel = (id: string) => KATEGORIE_TITEL[id] ?? id
