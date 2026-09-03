/**
 * Aufzeichnung der Stiftbewegung (B4).
 *
 * <b>Format, verbindlich für Browser und Server:</b> vier `Float32` je Abtastung in dieser
 * Reihenfolge — `t` (Millisekunden seit Segmentstart), `x`, `y`, `druck` (0 bis 1).
 * Little-endian, ohne Kopf. Genauso liest es `apps/api/Auswertung/Kennzahlen.cs`.
 *
 * Der Nullpunkt ist der Segmentstart und nicht der Sitzungsstart: dadurch bleibt jede
 * Aufzeichnung für sich auswertbar, auch wenn die Einheit unterbrochen wurde.
 *
 * Als Blob und nicht als JSON-Objekte, weil ein vierminütiges Spiel bei 60 Hz sonst rund
 * 14.000 Objekte wären — als Blob sind es 230 KB am Stück.
 */

/** CLAUDE.md: auf ~60 Hz ausdünnen. Der Pencil liefert bis zu 120. */
const HZ = 60
const MINDESTABSTAND_MS = 1000 / HZ

export type Aufzeichnung = { werte: string; abtastrateHz: number; anzahl: number }

export type Aufzeichner = {
  punkt: (tMs: number, x: number, y: number, druck: number) => void
  fertig: () => Aufzeichnung | undefined
}

export function neueAufzeichnung(): Aufzeichner {
  const werte: number[] = []
  let letzteMs = Number.NEGATIVE_INFINITY

  return {
    punkt(tMs, x, y, druck) {
      // Ausdünnen. Ein Absetzen (Druck 0) wird immer aufgenommen — sonst geht die
      // Absetzhäufigkeit verloren, und die ist eine der interessanten Kennzahlen.
      if (druck > 0 && tMs - letzteMs < MINDESTABSTAND_MS) return
      letzteMs = tMs
      werte.push(tMs, x, y, druck)
    },

    fertig() {
      // Unter zwei Abtastungen lässt sich nichts rechnen. Dann lieber nichts schicken als
      // eine Aufzeichnung, aus der der Server keine Kennzahl gewinnen kann.
      if (werte.length < 8) return undefined

      const bytes = new Uint8Array(new Float32Array(werte).buffer)

      // In Blöcken, weil `String.fromCharCode(...)` mit zehntausenden Argumenten den
      // Aufrufstapel sprengt.
      let roh = ''
      for (let i = 0; i < bytes.length; i += 8192) {
        roh += String.fromCharCode(...bytes.subarray(i, i + 8192))
      }

      return { werte: btoa(roh), abtastrateHz: HZ, anzahl: werte.length / 4 }
    },
  }
}
