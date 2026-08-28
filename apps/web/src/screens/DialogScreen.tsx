import { ProfiFigur } from '../ui/Figuren'
import { useVorlesen } from '../ui/vorlesen'
import type { Verein } from '../content/typen'

/**
 * A5: eine Aufgabe, ein Satz — und der Satz wird vorgelesen.
 * Für Ankommen, Ansage und Lob; der Profi ist immer der Sprecher (C5).
 */
export function DialogScreen({
  verein,
  text,
  knopf = 'Weiter',
  onWeiter,
  children,
}: {
  verein: Verein
  text: string
  knopf?: string
  onWeiter: () => void
  /** Beim Lob steht hier das Ergebnis — erst nach dem Lob, nie davor (C3, C5). */
  children?: React.ReactNode
}) {
  useVorlesen(text)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-himmel-hell p-8">
      <div className="flex max-w-4xl items-center gap-6">
        <div className="h-56 w-48 shrink-0">
          <ProfiFigur farben={verein.farben} />
        </div>
        <div className="relative rounded-3xl bg-white px-10 py-8 shadow-lg">
          <div
            className="absolute top-1/2 -left-4 h-8 w-8 -translate-y-1/2 rotate-45 bg-white"
            aria-hidden="true"
          />
          <p className="text-4xl leading-snug font-bold text-slate-800">{text}</p>
        </div>
      </div>

      {children}

      <button
        onClick={onWeiter}
        className="taste bg-rasen text-white shadow-lg active:scale-95"
        autoFocus
      >
        {knopf}
      </button>
    </div>
  )
}
