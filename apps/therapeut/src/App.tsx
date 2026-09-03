import { useCallback, useEffect, useState } from 'react'
import { api, NichtAngemeldet, type Klient, type KlientDetail } from './api'
import { Anmeldung } from './screens/Anmeldung'
import { Einstellungen } from './screens/Einstellungen'
import { Verlauf } from './screens/Verlauf'
import { Bericht } from './screens/Bericht'
import { Geraete } from './screens/Geraete'

/**
 * D1: die zweite Ansicht. Eigene Anwendung, eigene Anmeldung — nicht mehr ein PIN-Bereich in
 * der Kind-App. Auf Bens Tablet liegt dadurch nie eine Klientenliste.
 *
 * Kein Router: die Anwendung hat eine Klientenauswahl und vier Reiter. Eine Liste im Zustand
 * ist dafür genug, und ein Router wäre eine Abhängigkeit, die niemand erklären müsste.
 */
const REITER = ['Einstellungen', 'Verlauf', 'Wochenbericht', 'Geräte'] as const
type Reiter = (typeof REITER)[number]

export default function App() {
  const [angemeldet, setAngemeldet] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [klienten, setKlienten] = useState<Klient[]>([])
  const [gewaehlt, setGewaehlt] = useState<KlientDetail | null>(null)
  const [reiter, setReiter] = useState<Reiter>('Einstellungen')

  const klientenLaden = useCallback(async () => {
    const liste = await api.klienten()
    setKlienten(liste)
    return liste
  }, [])

  const start = useCallback(async () => {
    try {
      const ich = await api.ich()
      setName(ich.name)
      const liste = await klientenLaden()
      // Genau ein Kind ist der Normalfall im ersten Ausbau — dann direkt öffnen, statt eine
      // Liste mit einem Eintrag anzuzeigen.
      if (liste.length === 1) setGewaehlt(await api.klient(liste[0].id))
      setAngemeldet(true)
    } catch (fehler) {
      if (fehler instanceof NichtAngemeldet) setAngemeldet(false)
      else throw fehler
    }
  }, [klientenLaden])

  useEffect(() => {
    void start()
  }, [start])

  if (angemeldet === null) return <p className="p-8 text-slate-500">Wird geladen…</p>
  if (!angemeldet) return <Anmeldung onAngemeldet={start} />

  async function waehlen(id: number) {
    setGewaehlt(await api.klient(id))
    setReiter('Einstellungen')
  }

  async function anlegen() {
    const vorname = prompt('Vorname des Kindes?')?.trim()
    if (!vorname) return
    const nachname = prompt('Nachname?')?.trim()
    if (!nachname) return
    const { id } = await api.klientAnlegen(vorname, nachname)
    await klientenLaden()
    await waehlen(id)
  }

  async function loeschen(klient: KlientDetail) {
    const bestaetigung = prompt(
      `Alle Daten von ${klient.vorname} ${klient.nachname} endgültig löschen?\n` +
        'Das lässt sich nicht rückgängig machen. Zum Bestätigen den Vornamen eingeben:',
    )
    if (bestaetigung?.trim() !== klient.vorname) return

    await api.klientLoeschen(klient.id)
    setGewaehlt(null)
    await klientenLaden()
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="kein-druck w-72 shrink-0 border-r border-slate-200 bg-white p-5">
        <h1 className="text-lg font-bold text-slate-800">TravelKickers</h1>
        <p className="mb-6 text-sm text-slate-500">{name}</p>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-slate-600 uppercase">Klienten</h2>
          <button onClick={anlegen} className="text-sm font-bold text-slate-600" title="Kind anlegen">
            +
          </button>
        </div>

        <nav className="space-y-1">
          {klienten.map((k) => (
            <button
              key={k.id}
              onClick={() => waehlen(k.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left ${
                gewaehlt?.id === k.id ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'
              }`}
            >
              <span className="font-semibold">
                {k.nachname}, {k.vorname}
              </span>
              {k.spielname && (
                <span
                  className={`block text-xs ${
                    gewaehlt?.id === k.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  spielt als „{k.spielname}"
                </span>
              )}
            </button>
          ))}
          {klienten.length === 0 && (
            <p className="text-sm text-slate-500">Noch kein Kind angelegt.</p>
          )}
        </nav>

        <button
          onClick={async () => {
            await api.abmelden()
            setAngemeldet(false)
            setGewaehlt(null)
          }}
          className="mt-8 text-sm text-slate-500 underline"
        >
          Abmelden
        </button>
      </aside>

      <main className="flex-1 p-8">
        {!gewaehlt ? (
          <p className="text-slate-500">Links ein Kind auswählen.</p>
        ) : (
          <>
            <header className="kein-druck mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {gewaehlt.vorname} {gewaehlt.nachname}
              </h2>
              <button
                onClick={() => loeschen(gewaehlt)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
              >
                Profil löschen (Art. 17 DSGVO)
              </button>
            </header>

            <nav className="kein-druck mb-6 flex gap-2 border-b border-slate-200">
              {REITER.map((r) => (
                <button
                  key={r}
                  onClick={() => setReiter(r)}
                  className={`-mb-px border-b-2 px-4 py-2 font-semibold ${
                    reiter === r
                      ? 'border-slate-800 text-slate-900'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </nav>

            {reiter === 'Einstellungen' && <Einstellungen klient={gewaehlt} />}
            {reiter === 'Verlauf' && <Verlauf klient={gewaehlt} />}
            {reiter === 'Wochenbericht' && <Bericht klient={gewaehlt} />}
            {reiter === 'Geräte' && <Geraete klient={gewaehlt} />}
          </>
        )}
      </main>
    </div>
  )
}
