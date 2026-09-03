import { useEffect, useState } from 'react'
import { api, titel, type Einstellung, type KlientDetail } from '../api'

/**
 * B1: Toleranz, Zielgeschwindigkeit und Mindesttrefferquote je Übungstyp.
 * B3: Pausendauer und -inhalt.
 *
 * Ein Spiel lässt sich hier auch weglassen (`aktiv`) und in der Reihenfolge verschieben — das
 * sind die Stellschrauben, die CLAUDE.md für den Therapeutenmodus nennt.
 */
export function Einstellungen({ klient }: { klient: KlientDetail }) {
  const [zeilen, setZeilen] = useState<Einstellung[] | null>(null)
  const [pauseDauer, setPauseDauer] = useState(klient.pausenDauerSek)
  const [pauseInhalt, setPauseInhalt] = useState(klient.pausenInhalt)
  const [gespeichert, setGespeichert] = useState(false)

  useEffect(() => {
    setGespeichert(false)
    setPauseDauer(klient.pausenDauerSek)
    setPauseInhalt(klient.pausenInhalt)
    void api.einstellungen(klient.id).then(setZeilen)
  }, [klient])

  function aendern(spielId: string, feld: keyof Einstellung, wert: number | boolean) {
    setGespeichert(false)
    setZeilen((z) => z?.map((e) => (e.spielId === spielId ? { ...e, [feld]: wert } : e)) ?? null)
  }

  async function speichern() {
    if (!zeilen) return
    await api.einstellungenSpeichern(klient.id, zeilen)
    await api.pauseSpeichern(klient.id, pauseDauer, pauseInhalt)
    setGespeichert(true)
  }

  if (!zeilen) return <p className="text-slate-500">Wird geladen…</p>

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-lg font-bold text-slate-800">Übungen</h3>
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
              {zeilen
                .slice()
                .sort((a, b) => a.reihenfolge - b.reihenfolge)
                .map((e) => (
                  <tr key={e.spielId} className="border-t border-slate-100">
                    <td className="p-3 font-semibold text-slate-700">{titel(e.spielId)}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={e.aktiv}
                        onChange={(x) => aendern(e.spielId, 'aktiv', x.target.checked)}
                        className="size-5"
                      />
                    </td>
                    <td className="p-3">
                      <Zahl wert={e.stufe} min={1} max={5} schritt={1}
                        onAendern={(v) => aendern(e.spielId, 'stufe', v)} />
                    </td>
                    <td className="p-3">
                      <Zahl wert={e.toleranz} min={0.1} max={3} schritt={0.1}
                        onAendern={(v) => aendern(e.spielId, 'toleranz', v)} />
                    </td>
                    <td className="p-3">
                      <Zahl wert={e.zielgeschwindigkeit} min={0.1} max={3} schritt={0.1}
                        onAendern={(v) => aendern(e.spielId, 'zielgeschwindigkeit', v)} />
                    </td>
                    <td className="p-3">
                      <Zahl wert={e.mindesttrefferquote} min={0} max={1} schritt={0.05}
                        onAendern={(v) => aendern(e.spielId, 'mindesttrefferquote', v)} />
                    </td>
                    <td className="p-3">
                      <Zahl wert={e.dauerSek} min={30} max={600} schritt={10}
                        onAendern={(v) => aendern(e.spielId, 'dauerSek', v)} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Die Toleranz ist einheitenlos — sie ist bewusst nicht in Millimetern kalibriert.
        </p>
      </section>

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

      <div className="flex items-center gap-4">
        <button
          onClick={speichern}
          className="rounded-lg bg-slate-800 px-6 py-2 font-bold text-white"
        >
          Speichern
        </button>
        {gespeichert && <span className="font-semibold text-green-700">Gespeichert.</span>}
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
