/**
 * Die drei Regler, die Thomas je Übung einstellt (B1). Jedes Minispiel bekommt sie als Prop.
 *
 * Was ein Spiel damit macht, steht in dessen `welt.ts`. Nutzt es einen Regler nicht, weil er dort
 * fachlich keinen Sinn hat, wird er in der Therapeuten-App für dieses Spiel ausgeblendet —
 * `SPIEL_REGLER` in `apps/therapeut/src/api.ts`.
 */
export type Regler = {
  /** Faktor auf die Toleranz der Stufe. Größer ist leichter. */
  toleranz: number
  /** Faktor auf das Tempo, das das Spiel vorgibt. */
  zielgeschwindigkeit: number
  /** Anteil 0–1. Wirkt erst über der Vorgabe, siehe `musterNochmal`. */
  mindesttrefferquote: number
}

/** Bei diesen Werten verhält sich jedes Spiel so, wie es die Stufe allein vorgibt. */
export const VORGABE_REGLER: Regler = {
  toleranz: 1,
  zielgeschwindigkeit: 1,
  mindesttrefferquote: 0.5,
}

/**
 * Lag die Runde unter der Mindesttrefferquote? Dann legt das Spiel dasselbe Muster **einmal**
 * noch aus und hilft dabei. Danach geht es in jedem Fall weiter: gezählt und bejubelt wird jede
 * Runde, es gibt nichts zu verlieren (C2), und die Muster wechseln weiter (B3).
 *
 * Bis zur Vorgabe von 0,5 gilt jede Runde — so war es, bevor der Regler etwas bewirkt hat.
 */
export const musterNochmal = (r: Regler, treffer: number, gesamt: number) =>
  r.mindesttrefferquote > VORGABE_REGLER.mindesttrefferquote &&
  treffer < gesamt * r.mindesttrefferquote
