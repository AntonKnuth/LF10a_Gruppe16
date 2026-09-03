import { useEffect, useState } from 'react'
import { api, titel, type KlientDetail, type VerlaufPunkt } from '../api'

/**
 * C4 (Fortschritt) und C3 (Abgleich Selbsteinschätzung gegen Messwert).
 *
 * Alle Zahlen kommen aus der C#-Auswertung der Rohdaten. Die im Browser gerechneten Werte aus
 * `SpielErgebnis` sind unmaßgeblich und tauchen hier bewusst nicht auf.
 *
 * Eingabegerät und Stufe stehen an jedem Punkt: eine vom Therapeuten erhöhte Anforderung sieht
 * sonst wie eine Verschlechterung aus, und Tastaturdruck mischt sich mit echten Pencil-Kurven.
 */
export function Verlauf({ klient }: { klient: KlientDetail }) {
  const [punkte, setPunkte] = useState<VerlaufPunkt[] | null>(null)
  const [spielId, setSpielId] = useState<string>('alle')

  useEffect(() => {
    setPunkte(null)
    void api.verlauf(klient.id).then(setPunkte)
  }, [klient])

  if (!punkte) return <p className="text-slate-500">Wird geladen…</p>
  if (punkte.length === 0)
    return <p className="text-slate-500">Für dieses Kind liegen noch keine Übungsdaten vor.</p>

  const spiele = [...new Set(punkte.map((p) => p.spielId))]
  const gefiltert = spielId === 'alle' ? punkte : punkte.filter((p) => p.spielId === spielId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">Übung</label>
        <select
          value={spielId}
          onChange={(e) => setSpielId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="alle">Alle</option>
          {spiele.map((s) => (
            <option key={s} value={s}>{titel(s)}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Datum</th>
              <th className="p-3">Übung</th>
              <th className="p-3">Stufe</th>
              <th className="p-3">Tempo</th>
              <th className="p-3">Tempo-Streuung</th>
              <th className="p-3">Zittern</th>
              <th className="p-3">Druck ⌀</th>
              <th className="p-3">Druck-Streuung</th>
              <th className="p-3">Absetzer</th>
              <th className="p-3">Selbsteinschätzung</th>
              <th className="p-3">Gerät</th>
            </tr>
          </thead>
          <tbody>
            {gefiltert.map((p, i) => (
              <tr key={`${p.sessionId}-${i}`} className="border-t border-slate-100">
                <td className="p-3">{new Date(p.datum).toLocaleDateString('de-DE')}</td>
                <td className="p-3 font-semibold text-slate-700">{titel(p.spielId)}</td>
                <td className="p-3">
                  <span className="rounded bg-slate-200 px-2 py-0.5 font-semibold">{p.stufe}</span>
                </td>
                {p.kennzahlen ? (
                  <>
                    <td className="p-3">{p.kennzahlen.tempoMittel.toFixed(1)}</td>
                    <td className="p-3">{p.kennzahlen.tempoStreuung.toFixed(1)}</td>
                    <td className="p-3">{p.kennzahlen.zittern.toFixed(1)}°</td>
                    <td className="p-3">{p.kennzahlen.druckMittel.toFixed(2)}</td>
                    <td className="p-3">{p.kennzahlen.druckStreuung.toFixed(2)}</td>
                    <td className="p-3">{p.kennzahlen.absetzer}</td>
                  </>
                ) : (
                  <td colSpan={6} className="p-3 text-slate-400">keine Rohdaten</td>
                )}
                <td className="p-3">
                  {p.selbsteinschaetzung ? '🙂'.repeat(p.selbsteinschaetzung) : '–'}
                </td>
                <td className="p-3 text-slate-500">
                  {p.eingabegeraet}
                  {p.synthetischerDruck && (
                    <span
                      title="Druck per Tastatur ersetzt — nicht mit Pencil-Werten vergleichbar"
                      className="ml-1 rounded bg-amber-100 px-1 text-amber-800"
                    >
                      synth.
                    </span>
                  )}
                  {p.abgebrochen && (
                    <span className="ml-1 rounded bg-red-100 px-1 text-red-800">abgebrochen</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Zittern ist die mittlere Richtungsänderung zwischen zwei Abtastungen — je kleiner, desto
        ruhiger die Linie. Alle Werte stammen aus der Auswertung der Rohdaten, nicht aus der
        Sofortbewertung im Spiel.
      </p>
    </div>
  )
}
