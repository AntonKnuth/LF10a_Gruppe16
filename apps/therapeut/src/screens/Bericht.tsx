import { useEffect, useState } from 'react'
import { api, kategorieTitel, titel, type Kennzahl, type KlientDetail, type Wochenbericht } from '../api'

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
  // Der Bericht soll auf eine Seite passen (D3). Die Einzelübungen sind die Ausnahme für den
  // Fall, dass eine Auffälligkeit im Bereich geklärt werden muss — deshalb zugeklappt.
  const [einzeln, setEinzeln] = useState(false)
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

        <h3 className="mb-2 font-bold text-slate-800">Nach Fähigkeitsbereich</h3>
        <Messtabelle
          erste="Bereich"
          zeilen={bericht.proKategorie.map((z) => ({
            schluessel: z.kategorie,
            name: kategorieTitel(z.kategorie),
            anzahl: z.anzahl,
            zeit: z.uebungszeitMinuten,
            mittelwerte: z.mittelwerte,
          }))}
        />
        <p className="mt-1 mb-6 text-xs text-slate-500">
          Eine Übung kann zu mehreren Bereichen zählen — die Anzahlen summieren sich deshalb auf
          mehr als {bericht.proSpiel.reduce((n, z) => n + z.anzahl, 0)} Übungen.
        </p>

        {/* Absichtlich unauffällig und zugeklappt: der Bericht soll auf eine Seite passen (D3),
            und die Bereiche sind die Aussage. Die einzelnen Übungen sind der Blick dahinter. */}
        <button
          onClick={() => setEinzeln((e) => !e)}
          className="kein-druck mb-4 text-sm text-slate-500 underline"
        >
          {einzeln ? 'Einzelne Übungen ausblenden' : 'Einzelne Übungen anzeigen'}
        </button>

        {einzeln && (
          <div className="mb-6">
            <h3 className="mb-2 font-bold text-slate-800">Einzelne Übungen</h3>
            <Messtabelle
              erste="Übung"
              stufeZeigen
              zeilen={bericht.proSpiel.map((z) => ({
                schluessel: z.spielId,
                name: titel(z.spielId),
                anzahl: z.anzahl,
                stufe: z.stufe,
                zeit: z.uebungszeitMinuten,
                mittelwerte: z.mittelwerte,
              }))}
            />
          </div>
        )}

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

type Messzeile = {
  schluessel: string
  name: string
  anzahl: number
  stufe?: number
  zeit: number
  mittelwerte: Kennzahl | null
}

/** Dieselbe Tabelle für Bereiche und für Einzelübungen — nur die erste Spalte unterscheidet sie. */
function Messtabelle({
  erste,
  zeilen,
  stufeZeigen = false,
}: {
  erste: string
  zeilen: Messzeile[]
  stufeZeigen?: boolean
}) {
  const spalten = stufeZeigen ? 9 : 8

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-slate-300 text-left text-slate-600">
        <tr>
          <th className="py-2">{erste}</th>
          <th className="py-2">Anzahl</th>
          {stufeZeigen && <th className="py-2">Stufe</th>}
          <th className="py-2">Zeit</th>
          <th className="py-2">Tempo ⌀</th>
          <th className="py-2">Zittern</th>
          <th className="py-2">Druck ⌀</th>
          <th className="py-2">Druck-Streuung</th>
          <th className="py-2">Absetzer</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((z) => (
          <tr key={z.schluessel} className="border-b border-slate-100">
            <td className="py-2 font-semibold text-slate-700">{z.name}</td>
            <td className="py-2">{z.anzahl}</td>
            {stufeZeigen && <td className="py-2">{z.stufe}</td>}
            <td className="py-2">{z.zeit} min</td>
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
        {zeilen.length === 0 && (
          <tr>
            <td colSpan={spalten} className="py-4 text-slate-400">
              Keine Übungen in diesem Zeitraum.
            </td>
          </tr>
        )}
      </tbody>
    </table>
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
