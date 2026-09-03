import { useEffect, useState } from 'react'
import { api, titel, type KlientDetail, type Wochenbericht } from '../api'

/**
 * D3: Wochenbericht auf einer Seite, druckbar.
 *
 * Ausdrücklich Gesprächsgrundlage für den Therapeuten — **nicht** für die Eltern. Es gibt in
 * dieser Software keinen Elternbereich (D1); was die Eltern erfahren, entscheidet der Therapeut
 * im Gespräch.
 *
 * Gedruckt wird mit `@media print` (siehe index.css), nicht mit einer PDF-Bibliothek: der
 * Browser kann das, und eine Abhängigkeit weniger ist eine Erklärung weniger.
 */
export function Bericht({ klient }: { klient: KlientDetail }) {
  const [bericht, setBericht] = useState<Wochenbericht | null>(null)
  const [von, setVon] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })

  useEffect(() => {
    setBericht(null)
    void api.wochenbericht(klient.id, von).then(setBericht)
  }, [klient, von])

  if (!bericht) return <p className="text-slate-500">Wird geladen…</p>

  return (
    <div className="space-y-4">
      <div className="kein-druck flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-slate-600">Woche ab</span>
          <input
            type="date"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-800 px-6 py-2 font-bold text-white"
        >
          Drucken
        </button>
      </div>

      <div className="druckbogen rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-6 flex items-baseline justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Wochenbericht</h2>
            <p className="text-slate-600">
              {bericht.klient}
              {bericht.spielname && <span className="text-slate-400"> („{bericht.spielname}")</span>}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {new Date(bericht.von).toLocaleDateString('de-DE')} –{' '}
            {new Date(bericht.bis).toLocaleDateString('de-DE')}
          </p>
        </header>

        <div className="mb-6 grid grid-cols-4 gap-4">
          <Kachel titel="Einheiten" wert={String(bericht.einheiten)} />
          <Kachel titel="davon abgebrochen" wert={String(bericht.abgebrochen)} />
          <Kachel titel="Übungszeit" wert={`${bericht.uebungszeitMinuten} min`} />
          <Kachel
            titel="Selbsteinschätzung ⌀"
            wert={bericht.selbsteinschaetzungMittel?.toFixed(1) ?? '–'}
          />
        </div>

        <table className="mb-6 w-full text-sm">
          <thead className="border-b border-slate-300 text-left text-slate-600">
            <tr>
              <th className="py-2">Übung</th>
              <th className="py-2">Anzahl</th>
              <th className="py-2">Stufe</th>
              <th className="py-2">Zeit</th>
              <th className="py-2">Tempo ⌀</th>
              <th className="py-2">Zittern</th>
              <th className="py-2">Druck ⌀</th>
              <th className="py-2">Druck-Streuung</th>
              <th className="py-2">Absetzer</th>
            </tr>
          </thead>
          <tbody>
            {bericht.proSpiel.map((z) => (
              <tr key={z.spielId} className="border-b border-slate-100">
                <td className="py-2 font-semibold text-slate-700">{titel(z.spielId)}</td>
                <td className="py-2">{z.anzahl}</td>
                <td className="py-2">{z.stufe}</td>
                <td className="py-2">{z.uebungszeitMinuten} min</td>
                {z.mittelwerte ? (
                  <>
                    <td className="py-2">{z.mittelwerte.tempoMittel.toFixed(1)}</td>
                    <td className="py-2">{z.mittelwerte.zittern.toFixed(1)}°</td>
                    <td className="py-2">{z.mittelwerte.druckMittel.toFixed(2)}</td>
                    <td className="py-2">{z.mittelwerte.druckStreuung.toFixed(2)}</td>
                    <td className="py-2">{z.mittelwerte.absetzer}</td>
                  </>
                ) : (
                  <td colSpan={5} className="py-2 text-slate-400">keine Rohdaten</td>
                )}
              </tr>
            ))}
            {bericht.proSpiel.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-slate-400">Keine Übungen in diesem Zeitraum.</td>
              </tr>
            )}
          </tbody>
        </table>

        {bericht.hinweise.length > 0 && (
          <section>
            <h3 className="mb-2 font-bold text-slate-800">Hinweise</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {bericht.hinweise.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-500">
          Alle Messwerte stammen aus der Auswertung der aufgezeichneten Stiftbewegung. Der Bericht
          ist eine Gesprächsgrundlage und ersetzt keine Diagnose.
        </footer>
      </div>
    </div>
  )
}

function Kachel({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{titel}</p>
      <p className="text-2xl font-bold text-slate-800">{wert}</p>
    </div>
  )
}
