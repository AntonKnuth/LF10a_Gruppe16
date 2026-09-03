import type { SessionState } from './engine/session'
import { ladeToken, speichereToken, vergissToken } from './geraet'

/**
 * Aufrufe an den Server. Von Hand geschrieben, kein Codegenerator — bei fünf Aufrufen ist
 * diese Datei kürzer als die Werkzeugkette, die sie erzeugen würde.
 *
 * Das Netz wird ausschließlich **zwischen** Segmenten angefasst, nie während eines Spiels:
 * A1 verlangt Feedback unter 100 ms, und zwischen Stiftereignis und Strich darf kein `await`
 * stehen.
 */

export class NichtGekoppelt extends Error {}

async function ruf<T>(pfad: string, optionen: RequestInit = {}): Promise<T> {
  const token = ladeToken()

  const antwort = await fetch(pfad, {
    ...optionen,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(optionen.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  // 401 heißt hier: das Token ist weg oder wurde gesperrt. Dann muss das Gerät neu gekoppelt
  // werden — das Token wegzuwerfen führt genau dorthin.
  if (antwort.status === 401) {
    vergissToken()
    throw new NichtGekoppelt()
  }
  if (!antwort.ok) throw new Error(`${antwort.status} ${antwort.statusText}`)

  // Erst lesen, dann entscheiden — nicht am Statuscode festmachen. `PUT /api/sessions/{id}`
  // antwortet beim ersten Mal mit 201 und leerem Rumpf; `await antwort.json()` wirft darauf.
  // Der Upload wäre dann durch, der Aufrufer sähe trotzdem einen Fehler und der Schnappschuss
  // bliebe für immer liegen.
  const rumpf = await antwort.text()
  return (rumpf ? JSON.parse(rumpf) : undefined) as T
}

export type SpielEinstellungVomServer = {
  spielId: string
  stufe: number
  toleranz: number
  zielgeschwindigkeit: number
  mindesttrefferquote: number
  dauerSek: number
  aktiv: boolean
  reihenfolge: number
}

export type KindVomServer = {
  spielname: string | null
  pausenDauerSek: number
  pausenInhalt: string
  einstellungen: SpielEinstellungVomServer[]
}

/** Einmalcode einlösen. Läuft ohne Token — das gibt es an dieser Stelle noch nicht. */
export async function koppeln(code: string, bezeichnung: string) {
  const antwort = await fetch('/api/kopplung', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim().toUpperCase(), bezeichnung }),
  })

  if (antwort.status === 404) throw new Error('Diesen Code gibt es nicht.')
  if (antwort.status === 410) throw new Error('Der Code ist abgelaufen oder schon benutzt.')
  if (!antwort.ok) throw new Error('Kopplung fehlgeschlagen.')

  const { token } = (await antwort.json()) as { token: string }
  speichereToken(token)
}

export const kindLaden = () => ruf<KindVomServer>('/api/kind')

export const spielnameSetzen = (spielname: string) =>
  ruf<void>('/api/kind/spielname', { method: 'POST', body: JSON.stringify({ spielname }) })

/**
 * Die ganze Einheit in einem Aufruf. Alle Schlüssel kommen von hier, deshalb ist ein
 * Wiederholversuch nach einem Verbindungsabbruch ein Upsert und kein Duplikat.
 */
export const sessionHochladen = (lauf: SessionState) =>
  ruf<void>(`/api/sessions/${lauf.sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(nutzlast(lauf)),
  })

function nutzlast(s: SessionState) {
  return {
    vereinId: s.vereinId,
    tag: s.tag,
    begonnenAmMs: s.events[0]?.t ?? Date.now(),
    beendetAmMs: s.status === 'laeuft' ? null : (s.events.at(-1)?.t ?? Date.now()),
    status: s.status,

    // Die Folgenummer ist der Index im append-only Protokoll. Zusammen mit der SessionId ist
    // sie der Schlüssel auf dem Server — ein zweites Mal hochgeladen, überschreibt sich
    // dieselbe Zeile, statt eine neue anzulegen.
    ereignisse: s.events.map((e, folgenummer) => {
      const { t, art, ...rest } = e
      return {
        folgenummer,
        art,
        zeitMs: t,
        nutzlast: Object.keys(rest).length ? JSON.stringify(rest) : null,
      }
    }),

    ergebnisse: s.ergebnisse.map((e, i) => ({
      id: e.id,
      spielId: e.spielId,
      dauerMs: e.dauerMs,
      vollstaendigkeit: e.vollstaendigkeit,
      genauigkeit: e.genauigkeit,
      druckMittel: e.druckMittel,
      druckStreuung: e.druckStreuung,
      eingabegeraet: e.eingabegeraet,
      synthetischerDruck: e.synthetischerDruck,
      stufe: e.stufe,
      abgebrochen: e.abgebrochen,
      // C3: die Selbsteinschätzung steht in derselben Reihenfolge wie die Ergebnisse.
      selbsteinschaetzung: s.einschaetzungen[i] ?? null,
      extra: JSON.stringify(e.extra),
      rohdaten: e.rohdaten ?? null,
    })),
  }
}
