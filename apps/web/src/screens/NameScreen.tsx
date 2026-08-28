import { useRef, useState } from 'react'
import type { Verein } from '../content/typen'
import { ProfiFigur } from '../ui/Figuren'
import { useVorlesen } from '../ui/vorlesen'

const BREITE = 1200
const HOEHE = 340

/**
 * Erstlauf: Ben schreibt seinen Namen mit dem Stift (Phase 1, Punkt 2).
 * Das Bild wird gespeichert, der getippte Vorname daneben dient dazu, Begrüßung und
 * Lob später persönlich zu adressieren (C5). D4: nur der Vorname, sonst nichts.
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
  onFertig: (vorname: string, bild: string) => void
}) {
  const frage = 'Schreib deinen Namen mit dem Stift.'
  useVorlesen(frage)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zeichnet = useRef(false)
  const [leer, setLeer] = useState(true)
  const [vorname, setVorname] = useState('')

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
        value={vorname}
        onChange={(e) => setVorname(e.target.value)}
        placeholder="Vorname tippen"
        aria-label="Vorname"
        className="taste w-80 border-2 border-slate-300 bg-white text-center text-slate-800"
      />

      <div className="flex gap-4">
        <button onClick={nochmal} className="taste bg-white text-slate-600 shadow active:scale-95">
          Nochmal
        </button>
        <button
          disabled={leer || vorname.trim() === ''}
          onClick={() =>
            onFertig(vorname.trim(), canvasRef.current?.toDataURL('image/png') ?? '')
          }
          className="taste bg-rasen text-white shadow-lg active:scale-95 disabled:opacity-40"
        >
          Fertig
        </button>
      </div>
    </div>
  )
}
