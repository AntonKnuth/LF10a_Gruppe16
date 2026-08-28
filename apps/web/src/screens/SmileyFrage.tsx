import type { Smiley } from '../engine/segmente'
import { useVorlesen } from '../ui/vorlesen'

const AUSWAHL: { wert: Smiley; farbe: string; mund: string; label: string }[] = [
  { wert: 1, farbe: '#ef8a5a', mund: 'M-16 12 a16 12 0 0 1 32 0', label: 'Ging schwer' },
  { wert: 2, farbe: '#f6c93c', mund: 'M-16 8 h32', label: 'Ging so' },
  { wert: 3, farbe: '#7bc043', mund: 'M-16 4 a16 12 0 0 0 32 0', label: 'Ging gut' },
]

/**
 * C3: Drei Stufen, nicht fünf. Die Antwort wird **nie** korrigiert oder kommentiert —
 * kein „Das war doch super!". Das entwertete Bens Wahrnehmung und verstieße gegen C2.
 * Es gibt hier deshalb bewusst keine Rückmeldung nach der Auswahl.
 */
export function SmileyFrage({
  frage,
  onAntwort,
}: {
  frage: string
  onAntwort: (wert: Smiley) => void
}) {
  useVorlesen(frage)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 bg-himmel-hell p-8">
      <p className="text-center text-5xl font-bold text-slate-800">{frage}</p>
      <div className="flex gap-10">
        {AUSWAHL.map((a) => (
          <button
            key={a.wert}
            onClick={() => onAntwort(a.wert)}
            aria-label={a.label}
            className="rounded-full p-2 transition-transform active:scale-90"
          >
            <svg viewBox="-60 -60 120 120" className="h-40 w-40 drop-shadow-lg">
              <circle r="52" fill={a.farbe} stroke="#fff" strokeWidth="5" />
              <circle cx="-18" cy="-14" r="6" fill="#3b3b3b" />
              <circle cx="18" cy="-14" r="6" fill="#3b3b3b" />
              <path d={a.mund} stroke="#3b3b3b" strokeWidth="6" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
