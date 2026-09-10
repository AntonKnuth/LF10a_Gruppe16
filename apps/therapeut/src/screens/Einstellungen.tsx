import { useEffect, useState } from 'react'
import { api, rolleVon, titel, type Einstellung, type KlientDetail, type Rolle, type Tagesform } from '../api'

/**
 * B1: Toleranz, Zielgeschwindigkeit und Mindesttrefferquote je Übungstyp.
 * B3: Pausendauer und -inhalt.
 *
 * Der Tagesplan wird aus den aktiven Spielen gewürfelt — es gibt keine feste Liste mehr, welche
 * Übung an welchem Tag drankommt. Thomas stellt deshalb zweierlei ein: **wie viele** Übungen
 * welcher Art eine Einheit hat, und **welche Spiele** dafür in Frage kommen.
 *
 * Drei Abschnitte, weil Aufwärmen und Sonderspiel etwas anderes sind als eine Übung — und weil
 * die Speichersperre so sofort verständlich ist: fehlt etwas, sieht man in welchem Abschnitt.
 */
const ABSCHNITTE: { rolle: Rolle; titel: string; feld: keyof Tagesform; hinweis?: string }[] = [
  {
    rolle: 'aufwaermen',
    titel: 'Aufwärmen',
    feld: 'anzahlAufwaermen',
    hinweis: 'Gehört zur Verkrampfungsprävention (B3). Auf 0 zu stellen ist möglich, aber selten sinnvoll.',
  },
  { rolle: 'normal', titel: 'Übungen', feld: 'anzahlUebungen' },
  {
    rolle: 'sonder',
    titel: 'Sonderspiele',
    feld: 'anzahlSonder',
    hinweis: 'Steht immer als letzte Übung am 5. Tag eines Vereins.',
  },
]

export function Einstellungen({ klient }: { klient: KlientDetail }) {
  const [form, setForm] = useState<Tagesform | null>(null)
  const [pauseDauer, setPauseDauer] = useState(klient.pausenDauerSek)
  const [pauseInhalt, setPauseInhalt] = useState(klient.pausenInhalt)
  const [gespeichert, setGespeichert] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    setGespeichert(false)
    setFehler('')
    setPauseDauer(klient.pausenDauerSek)
    setPauseInhalt(klient.pausenInhalt)
    void api.einstellungen(klient.id).then(setForm)
  }, [klient])

  function aendernSpiel(spielId: string, feld: keyof Einstellung, wert: number | boolean) {
    setGespeichert(false)
    setFehler('')
    setForm((f) =>
      f
        ? { ...f, spiele: f.spiele.map((e) => (e.spielId === spielId ? { ...e, [feld]: wert } : e)) }
        : null,
    )
  }

  function aendernAnzahl(feld: keyof Tagesform, wert: number) {
    setGespeichert(false)
    setFehler('')
    setForm((f) => (f ? { ...f, [feld]: wert } : null))
  }

  async function speichern() {
    if (!form) return
    setFehler('')
    try {
      await api.einstellungenSpeichern(klient.id, form)
      await api.pauseSpeichern(klient.id, pauseDauer, pauseInhalt)
      setGespeichert(true)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    }
  }

  if (!form) return <p className="text-slate-500">Wird geladen…</p>

  const gesamt = form.anzahlAufwaermen + form.anzahlUebungen + form.anzahlSonder

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Eine Einheit hat <strong>{gesamt} Übungen</strong>. Welche davon drankommen, wird für jeden
        Tag neu ausgewählt — mit möglichst wechselnden Fähigkeitsbereichen. Es genügt also, den
        Topf zu bestimmen; die Reihenfolge macht die App.
      </p>

      {ABSCHNITTE.map((a) => {
        const zeilen = form.spiele.filter((e) => rolleVon(e.spielId) === a.rolle)
        const aktiv = zeilen.filter((e) => e.aktiv).length
        const plaetze = form[a.feld] as number
        const zuWenig = aktiv < plaetze

        return (
          <section key={a.rolle}>
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800">{a.titel}</h3>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-slate-600">pro Einheit</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={plaetze}
                  onChange={(e) => aendernAnzahl(a.feld, Number(e.target.value))}
                  className={`w-20 rounded-lg border px-3 py-1 ${
                    zuWenig ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
              </label>
              <span className={`text-sm ${zuWenig ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
                {aktiv} von {zeilen.length} aktiv
                {zuWenig && ' — zu wenige für die eingestellten Plätze'}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="p-3">Übung</th>
                    <th className="p-3">Aktiv</th>
                    <th className="p-3">Stufe</th>
                    <th className="p-3">Toleranz</th>
                    <th className="p-3">Zieltempo</th>
                    <th className="p-3">Mind. Treffer</th>
                    <th className="p-3">Dauer (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {zeilen.map((e) => (
                    <tr key={e.spielId} className="border-t border-slate-100">
                      <td className="p-3 font-semibold text-slate-700">{titel(e.spielId)}</td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={e.aktiv}
                          onChange={(x) => aendernSpiel(e.spielId, 'aktiv', x.target.checked)}
                          className="size-5"
                        />
                      </td>
                      <td className="p-3">
                        <Zahl wert={e.stufe} min={1} max={5} schritt={1}
                          onAendern={(v) => aendernSpiel(e.spielId, 'stufe', v)} />
                      </td>
                      <td className="p-3">
                        <Zahl wert={e.toleranz} min={0.1} max={3} schritt={0.1}
                          onAendern={(v) => aendernSpiel(e.spielId, 'toleranz', v)} />
                      </td>
                      <td className="p-3">
                        <Zahl wert={e.zielgeschwindigkeit} min={0.1} max={3} schritt={0.1}
                          onAendern={(v) => aendernSpiel(e.spielId, 'zielgeschwindigkeit', v)} />
                      </td>
                      <td className="p-3">
                        <Zahl wert={e.mindesttrefferquote} min={0} max={1} schritt={0.05}
                          onAendern={(v) => aendernSpiel(e.spielId, 'mindesttrefferquote', v)} />
                      </td>
                      <td className="p-3">
                        <Zahl wert={e.dauerSek} min={10} max={600} schritt={10}
                          onAendern={(v) => aendernSpiel(e.spielId, 'dauerSek', v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.hinweis && <p className="mt-2 text-xs text-slate-500">{a.hinweis}</p>}
          </section>
        )
      })}

      <p className="text-xs text-slate-500">
        Die Toleranz ist einheitenlos — sie ist bewusst nicht in Millimetern kalibriert.
      </p>

      <section>
        <h3 className="mb-3 text-lg font-bold text-slate-800">Pause</h3>
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Dauer (Sekunden)</span>
            <input
              type="number"
              value={pauseDauer}
              min={5}
              max={600}
              onChange={(e) => {
                setGespeichert(false)
                setPauseDauer(Number(e.target.value))
              }}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Inhalt</span>
            <input
              value={pauseInhalt}
              onChange={(e) => {
                setGespeichert(false)
                setPauseInhalt(e.target.value)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Die Pause kann von Ben angehalten, aber nicht übersprungen werden (A3).
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={speichern}
          className="rounded-lg bg-slate-800 px-6 py-2 font-bold text-white"
        >
          Speichern
        </button>
        {gespeichert && (
          <span className="font-semibold text-green-700">
            Gespeichert — gilt ab dem nächsten Training.
          </span>
        )}
        {fehler && <span className="font-semibold text-red-700">{fehler}</span>}
      </div>
    </div>
  )
}

function Zahl({
  wert, min, max, schritt, onAendern,
}: {
  wert: number
  min: number
  max: number
  schritt: number
  onAendern: (wert: number) => void
}) {
  return (
    <input
      type="number"
      value={wert}
      min={min}
      max={max}
      step={schritt}
      onChange={(e) => onAendern(Number(e.target.value))}
      className="w-24 rounded-lg border border-slate-300 px-2 py-1"
    />
  )
}
