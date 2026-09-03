import { useCallback, useEffect, useState } from 'react'
import { api, type Geraet, type KlientDetail } from '../api'

/**
 * Gerätekopplung und Sperren.
 *
 * Der Code wird hier erzeugt und dem Kind vorgelesen oder gezeigt; das Tablet gibt ihn beim
 * ersten Start ein. Das passiert in der Praxis, bevor ein Leihgerät mitgegeben wird — zu Hause
 * gibt es bei einer Internetsperre keinen zweiten Versuch.
 *
 * Gesperrt statt gelöscht: ein Widerruf wirkt auch bei einem Tablet, das nie zurückkommt.
 */
export function Geraete({ klient }: { klient: KlientDetail }) {
  const [geraete, setGeraete] = useState<Geraet[] | null>(null)
  const [code, setCode] = useState<{ code: string; laeuftAbAm: string } | null>(null)

  const laden = useCallback(() => {
    void api.geraete(klient.id).then(setGeraete)
  }, [klient.id])

  useEffect(() => {
    setCode(null)
    setGeraete(null)
    laden()
  }, [laden])

  async function sperren(id: number) {
    if (!confirm('Dieses Gerät sperren? Das Tablet kann danach keine Daten mehr senden.')) return
    await api.geraetSperren(id)
    laden()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-3 text-lg font-bold text-slate-800">Neues Tablet koppeln</h3>

        {code ? (
          <div>
            <p className="mb-2 text-sm text-slate-600">
              Diesen Code auf dem Tablet eingeben. Gültig bis{' '}
              {new Date(code.laeuftAbAm).toLocaleTimeString('de-DE')}.
            </p>
            <p className="font-mono text-5xl font-bold tracking-[0.3em] text-slate-900">
              {code.code}
            </p>
          </div>
        ) : (
          <button
            onClick={async () => setCode(await api.kopplungscode(klient.id))}
            className="rounded-lg bg-slate-800 px-6 py-2 font-bold text-white"
          >
            Kopplungscode erzeugen
          </button>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold text-slate-800">Gekoppelte Geräte</h3>
        {geraete === null && <p className="text-slate-500">Wird geladen…</p>}
        {geraete?.length === 0 && (
          <p className="text-slate-500">Für dieses Kind ist noch kein Tablet gekoppelt.</p>
        )}
        <div className="space-y-2">
          {geraete?.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {g.bezeichnung}
                  {!g.aktiv && (
                    <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-sm text-red-800">
                      gesperrt
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  gekoppelt am {new Date(g.erstelltAm).toLocaleDateString('de-DE')}
                  {g.zuletztGesehen
                    ? ` · zuletzt aktiv ${new Date(g.zuletztGesehen).toLocaleString('de-DE')}`
                    : ' · noch nie verbunden'}
                </p>
              </div>
              {g.aktiv && (
                <button
                  onClick={() => sperren(g.id)}
                  className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
                >
                  Sperren
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
