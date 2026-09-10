import { useEffect, useState } from "react";
import { PausenFigur, uebungZu } from "../ui/PausenFigur";
import { useVorlesen } from "../ui/vorlesen";

/**
 * A3 / B3: Die Pause ist verpflichtend. Sie lässt sich **anhalten**, falls zu Hause etwas
 * dazwischenkommt, und läuft danach weiter — aber es gibt keinen Weg, sie zu überspringen.
 * Der „Weiter"-Knopf erscheint erst bei 0.
 */
export function PauseScreen({
  dauerSek,
  inhalt,
  angehalten,
  onWeiter,
}: {
  dauerSek: number;
  inhalt: string;
  /** Das Pausenmenü ist offen — dann steht auch der Countdown. */
  angehalten: boolean;
  onWeiter: () => void;
}) {
  const [rest, setRest] = useState(dauerSek);
  useVorlesen(`Kurze Pause. ${inhalt}.`);
  // Erkannt am Text des Therapeuten — siehe `ui/PausenFigur.tsx`. Passt nichts, bleibt es
  // beim Satz allein, genau wie vorher.
  const uebung = uebungZu(inhalt);

  useEffect(() => {
    if (angehalten) return;
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [angehalten]);

  const fertig = rest === 0;
  const anteil = dauerSek > 0 ? rest / dauerSek : 0;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-himmel-hell p-8">
      <p className="text-4xl font-bold text-slate-700">Kurze Pause</p>
      <p className="text-center text-5xl font-extrabold text-rasen-dunkel">
        {inhalt}
      </p>

      <div className="flex items-center gap-10">
        {/* Die Figur macht vor, was der Satz sagt: ein Siebenjähriger, der noch unsicher
            liest, versteht „Hampelmänner" aus der Bewegung und nicht aus dem Wort. */}
        {uebung && (
          <div className="h-64 w-52 shrink-0">
            <PausenFigur uebung={uebung} />
          </div>
        )}

        <div className="relative">
          <svg viewBox="-60 -60 120 120" className="h-56 w-56 -rotate-90">
            <circle r="50" fill="none" stroke="#fff" strokeWidth="12" />
            <circle
              r="50"
              fill="none"
              stroke="#4caf50"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 * (1 - anteil)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-slate-700">
            {rest}
          </span>
        </div>
      </div>

      {/* Nur ein Knopf, und erst bei 0. Anhalten geht über den Anhalte-Knopf oben rechts,
          der auf jedem Bildschirm derselbe ist — zwei Wege für dasselbe wären eine
          Bedienung zu viel (A2). Überspringen gibt es weiterhin nicht (A3). */}
      {fertig && (
        <button
          onClick={onWeiter}
          className="taste bg-rasen text-white shadow-lg active:scale-95"
        >
          Weiter
        </button>
      )}
    </div>
  );
}
