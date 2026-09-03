import { useState } from 'react'
import { api } from '../api'

export function Anmeldung({ onAngemeldet }: { onAngemeldet: () => void }) {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [laeuft, setLaeuft] = useState(false)

  async function absenden(e: React.FormEvent) {
    e.preventDefault()
    setFehler('')
    setLaeuft(true)
    try {
      await api.anmelden(email, passwort)
      onAngemeldet()
    } catch {
      // Bewusst nicht „E-Mail unbekannt" oder „Passwort falsch": das verriete, welche
      // Konten es gibt.
      setFehler('Anmeldung fehlgeschlagen.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={absenden} className="w-96 rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">Therapeutenbereich</h1>
        <p className="mb-6 text-sm text-slate-500">TravelKickers</p>

        <label className="mb-1 block text-sm font-semibold text-slate-600">E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
        />

        <label className="mb-1 block text-sm font-semibold text-slate-600">Passwort</label>
        <input
          type="password"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          autoComplete="current-password"
          required
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
        />

        {fehler && <p className="mb-4 font-semibold text-red-600">{fehler}</p>}

        <button
          type="submit"
          disabled={laeuft}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          {laeuft ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
