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

export type Wochenbericht = {
  von: string
  bis: string
  klient: string
  spielname: string | null
  einheiten: number
  abgebrochen: number
  uebungszeitMinuten: number
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
  if (!antwort.ok) throw new Error(`${antwort.status} ${antwort.statusText}`)

  return antwort.status === 204 ? (undefined as T) : ((await antwort.json()) as T)
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

  einstellungen: (id: number) => hole<Einstellung[]>(`/api/klienten/${id}/einstellungen`),

  einstellungenSpeichern: (id: number, werte: Einstellung[]) =>
    hole<void>(`/api/klienten/${id}/einstellungen`, {
      method: 'PUT',
      body: JSON.stringify(werte),
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
  abschiedsgeschenk: 'Abschiedsgeschenk',
}

export const titel = (spielId: string) => SPIEL_TITEL[spielId] ?? spielId
