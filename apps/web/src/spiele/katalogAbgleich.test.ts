import { describe, expect, it } from 'vitest'
// `?raw` liefert den Dateiinhalt als Text. So braucht der Test weder Node-Typen noch einen
// Parser: die beiden anderen Spiellisten sind C# und eine andere App, importieren geht nicht.
import spielkatalogCs from '../../../api/Auswertung/Spielkatalog.cs?raw'
import therapeutApi from '../../../therapeut/src/api.ts?raw'
import { KATALOG, spielIds } from './katalog'

/**
 * Dieselben Spiele stehen an drei Stellen: `KATALOG` (Kind-App), `Spielkatalog.cs` (Server) und
 * `apps/therapeut/src/api.ts` (Titel, Rolle, Regler). Dieser Test liest die beiden anderen als
 * Text und vergleicht sie mit `KATALOG` — ein vergessener oder falsch abgeschriebener Eintrag
 * fällt hier auf statt erst im Wochenbericht oder in der Einstellungsmaske.
 */

/** Der Text zwischen `export const NAME` und der schließenden Klammer in Spalte 0. */
function block(text: string, name: string): string {
  // Unter Windows kann die Datei CRLF-Zeilenenden haben (git autocrlf).
  text = text.replace(/\r\n/g, '\n')
  const start = text.indexOf(`export const ${name}`)
  expect(start, `${name} steht in api.ts`).toBeGreaterThanOrEqual(0)
  return text.slice(start, text.indexOf('\n}\n', start))
}

/** Alle Treffer eines Ausdrucks mit den Gruppen 1 und 2 als `[Schlüssel, Wert]`. */
function paare(text: string, ausdruck: RegExp): [string, string][] {
  return [...text.matchAll(ausdruck)].map((m) => [m[1], m[2]])
}

// --- Server: ["id"] = new(Rolle.Normal, ["bereich", "bereich"]) -------------------------------
const server = new Map<string, { rolle: string; bereiche: string[] }>()
for (const [id, rest] of paare(spielkatalogCs, /\["(\w+)"\] = new\((Rolle\.\w+, \[[^\]]*\])/g)) {
  const rolle = rest.match(/Rolle\.(\w+)/)![1].toLowerCase() // Aufwaermen -> aufwaermen
  const bereiche = [...rest.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  server.set(id, { rolle, bereiche })
}

// --- Therapeuten-App ------------------------------------------------------------------------
// Zeilen wie `  linie: 'Linie malen',` — Kommentarzeilen beginnen mit `//` und passen nicht.
const titel = new Map(paare(block(therapeutApi, 'SPIEL_TITEL'), /^ {2}'?([\w-]+)'?: '([^']*)'/gm))
const rollen = new Map(paare(block(therapeutApi, 'SPIEL_ROLLE'), /^ {2}'?([\w-]+)'?: '([^']*)'/gm))
const regler = new Set(
  paare(block(therapeutApi, 'SPIEL_REGLER'), /^ {2}'?([\w-]+)'?: (\[)/gm).map(([id]) => id),
)

describe('Spiellisten: Kind-App, Server und Therapeuten-App', () => {
  it('der Server kennt genau die Spiele des Katalogs', () => {
    expect([...server.keys()].sort()).toEqual([...spielIds].sort())
  })

  it('die Therapeuten-App hat für jedes Spiel einen Titel und einen Reglereintrag', () => {
    expect([...titel.keys()].sort()).toEqual([...spielIds].sort())
    expect([...regler].sort()).toEqual([...spielIds].sort())
  })

  it('die Rollen stimmen überein (in der Therapeuten-App stehen nur Nicht-Normale)', () => {
    for (const id of spielIds) {
      expect([id, server.get(id)?.rolle]).toEqual([id, KATALOG[id].rolle])
      expect([id, rollen.get(id) ?? 'normal']).toEqual([id, KATALOG[id].rolle])
    }
    // Ein Eintrag für ein Spiel, das es nicht gibt, wäre ein Tippfehler.
    for (const id of rollen.keys()) expect(spielIds).toContain(id)
  })

  it('die Bereiche des Servers stimmen mit den Tags im Katalog überein', () => {
    for (const id of spielIds) {
      expect([id, server.get(id)?.bereiche]).toEqual([id, KATALOG[id].tags])
    }
  })

  it('die Titel der Therapeuten-App stimmen mit dem Katalog überein', () => {
    for (const id of spielIds) {
      expect([id, titel.get(id)]).toEqual([id, KATALOG[id].titel])
    }
  })
})
