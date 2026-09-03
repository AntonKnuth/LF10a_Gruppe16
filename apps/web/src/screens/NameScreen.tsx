import { useRef, useState } from 'react'
import type { Verein } from '../content/typen'
import { ProfiFigur } from '../ui/Figuren'
import { useVorlesen } from '../ui/vorlesen'

const BREITE = 1200
const HOEHE = 340

/**
 * Erstlauf: Ben wählt seinen Spielnamen und schreibt ihn mit dem Stift.
 *
 * Der bürgerliche Name kommt vom Therapeuten und taucht im Kindmodus nie auf; angesprochen
 * wird ausschließlich dieser selbstgewählte Name (C5). Das Getippte ist nötig, weil sich die
 * Handschrift eines Siebenjährigen nicht auslesen lässt — das Schreiben ist die Übung.
 *
 * Die Zeichnung wird bewusst **nicht** gespeichert: es gäbe niemanden, der sie liest, und ein
 * abgelegtes Handschriftbild eines Kindes ohne Zweck verstößt gegen D4. Sobald der Upload der
 * Arbeitsproben gebaut ist, bekommt sie einen Empfänger und kann mitgehen.
 *
 * Zugleich die Referenz für Pointer-Events: `getCoalescedEvents()` liefert alle
 * Zwischenpunkte, die der Browser seit dem letzten Frame gesammelt hat — beim Apple
 * Pencil sind das 120 Hz statt der ~60 Hz der Ereignisschleife.
 */
export function NameScreen({
  verein,
  onFertig,
}: {
  verein: Verein
  onFertig: (spielname: string) => void
}) {
  const frage = 'Wie sollen wir dich nennen? Schreib es mit dem Stift.'
  useVorlesen(frage)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zeichnet = useRef(false)
  const [leer, setLeer] = useState(true)
  const [spielname, setSpielname] = useState('')

  const ctx = () => canvasRef.current?.getContext('2d') ?? null

  /** Bildschirm- in Canvas-Koordinaten, unabhängig davon, wie das Canvas skaliert wird. */
  function punkt(e: React.PointerEvent<HTMLCanvasElement>, r: DOMRect) {
    return {
      x: (e.clientX - r.left) * (BREITE / r.width),
      y: (e.clientY - r.top) * (HOEHE / r.height),
    }
  }

  function runter(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    zeichnet.current = true
    const c = ctx()
    if (!c) return
    const p = punkt(e, e.currentTarget.getBoundingClientRect())
    c.beginPath()
    c.moveTo(p.x, p.y)
    setLeer(false)
  }

  function bewegt(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnet.current) return
    const c = ctx()
    if (!c) return
    const r = e.currentTarget.getBoundingClientRect()
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.strokeStyle = '#1f3a5f'
    for (const roh of e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) {
      const p = punkt(roh as unknown as React.PointerEvent<HTMLCanvasElement>, r)
      // Stiftandruck steuert die Strichstärke — sichtbares Feedback unter 100 ms (A1).
      c.lineWidth = 4 + (roh.pressure || 0.5) * 12
      c.lineTo(p.x, p.y)
      c.stroke()
      c.beginPath()
      c.moveTo(p.x, p.y)
    }
  }

  const hoch = () => {
    zeichnet.current = false
  }

  function nochmal() {
    ctx()?.clearRect(0, 0, BREITE, HOEHE)
    setLeer(true)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-himmel-hell p-6">
      <div className="flex items-center gap-4">
        <div className="h-28 w-24 shrink-0">
          <ProfiFigur farben={verein.farben} />
        </div>
        <p className="text-4xl font-bold text-slate-800">{frage}</p>
      </div>

      <canvas
        ref={canvasRef}
        width={BREITE}
        height={HOEHE}
        onPointerDown={runter}
        onPointerMove={bewegt}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        className="w-full max-w-5xl touch-none rounded-3xl border-4 border-dashed border-slate-300 bg-white shadow-inner"
      />

      <input
        value={spielname}
        onChange={(e) => setSpielname(e.target.value)}
        placeholder="Namen tippen"
        aria-label="Spielname"
        className="taste w-80 border-2 border-slate-300 bg-white text-center text-slate-800"
      />

      <div className="flex gap-4">
        <button onClick={nochmal} className="taste bg-white text-slate-600 shadow active:scale-95">
          Nochmal
        </button>
        <button
          disabled={leer || spielname.trim() === ''}
          onClick={() => onFertig(spielname.trim())}
          className="taste bg-rasen text-white shadow-lg active:scale-95 disabled:opacity-40"
        >
          Fertig
        </button>
      </div>
    </div>
  )
}
