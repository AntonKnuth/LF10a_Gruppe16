import { useState } from 'react'
import { vereine } from './content'
import { aktuellesSegment, session, starteSession } from './engine/session'
import type { SessionAction, SessionState } from './engine/session'
import { ansageText, standardEinstellungen, tagesplan } from './engine/tagesplan'
import {
  ladeFortschritt,
  ladeProfil,
  naechsteEinheit,
  speichereFortschritt,
  speichereProfil,
} from './profil'
import { DialogScreen } from './screens/DialogScreen'
import { NameScreen } from './screens/NameScreen'
import { PauseScreen } from './screens/PauseScreen'
import { SmileyFrage } from './screens/SmileyFrage'
import { SpielScreen } from './screens/SpielScreen'
import { StartScreen } from './screens/StartScreen'
import { TherapeutScreen } from './screens/TherapeutScreen'

export default function App() {
  const [profil, setProfil] = useState(ladeProfil)
  const [fortschritt, setFortschritt] = useState(ladeFortschritt)
  const [lauf, setLauf] = useState<SessionState | null>(null)
  const [therapeut, setTherapeut] = useState(false)

  const verein = vereine[fortschritt.vereinIndex]
  const name = profil?.vorname ?? 'Kicker'
  const mitName = (t: string) => t.replaceAll('{name}', name)
  const dispatch = (a: SessionAction) => setLauf((s) => (s ? session(s, a) : s))

  if (therapeut) return <TherapeutScreen onZurueck={() => setTherapeut(false)} />

  if (!lauf) {
    return (
      <StartScreen
        aktiverVereinIndex={fortschritt.vereinIndex}
        onTherapeut={() => setTherapeut(true)}
        onStart={() =>
          setLauf(
            starteSession(
              verein.id,
              fortschritt.tag,
              // Namensabfrage nur beim allerersten Start überhaupt, nicht bei jedem Verein.
              tagesplan(verein, fortschritt.tag, standardEinstellungen, profil === null),
            ),
          )
        }
      />
    )
  }

  const segment = aktuellesSegment(lauf)

  if (!segment) {
    // Einheit vorbei. C2: kein Verliererzustand, es geht immer weiter.
    return (
      <DialogScreen
        verein={verein}
        text={mitName(`Das war's für heute, {name}. Bis zum nächsten Mal!`)}
        knopf="Fertig"
        onWeiter={() => {
          const naechste =
            lauf.status === 'fertig' ? naechsteEinheit(fortschritt) : fortschritt
          speichereFortschritt(naechste)
          setFortschritt(naechste)
          setLauf(null)
        }}
      />
    )
  }

  switch (segment.art) {
    case 'namenseingabe':
      return (
        <NameScreen
          verein={verein}
          onFertig={(vorname, bild) => {
            const p = { vorname, nameBild: bild }
            speichereProfil(p)
            setProfil(p)
            dispatch({ art: 'weiter' })
          }}
        />
      )

    case 'ankommen':
      return (
        <DialogScreen
          verein={verein}
          text={mitName(verein.profi.begruessung.text)}
          onWeiter={() => dispatch({ art: 'weiter' })}
        />
      )

    case 'ansage':
      return (
        <DialogScreen
          verein={verein}
          text={ansageText(lauf.segmente)}
          knopf="Los geht's"
          onWeiter={() => dispatch({ art: 'weiter' })}
        />
      )

    case 'spiel':
      return (
        <SpielScreen
          key={lauf.index}
          spielId={segment.spielId}
          dauerSek={segment.dauerSek}
          stufe={segment.stufe}
          verein={verein}
          name={name}
          onFertig={(ergebnis) => dispatch({ art: 'spiel_fertig', ergebnis })}
        />
      )

    case 'selbsteinschaetzung':
      // C3: kommt vor Lob und Ergebnis. Die Antwort wird nie kommentiert.
      return (
        <SmileyFrage
          frage="Wie ist dir die Übung gelungen?"
          onAntwort={(wert) => dispatch({ art: 'selbsteinschaetzung', wert })}
        />
      )

    case 'lob': {
      const lob = verein.profi.lob[(lauf.ergebnisse.length - 1) % verein.profi.lob.length]
      const sterne = Math.max(1, Math.round((lauf.ergebnisse.at(-1)?.genauigkeit ?? 0) * 3))
      return (
        <DialogScreen
          verein={verein}
          text={mitName(lob.text)}
          onWeiter={() => dispatch({ art: 'weiter' })}
        >
          <div className="flex gap-3" aria-label={`${sterne} von 3 Sternen`}>
            {[1, 2, 3].map((i) => (
              <Stern key={i} an={i <= sterne} />
            ))}
          </div>
        </DialogScreen>
      )
    }

    case 'pause':
      return (
        <PauseScreen
          key={lauf.index}
          dauerSek={segment.dauerSek}
          inhalt={segment.inhalt}
          onWeiter={() => dispatch({ art: 'weiter' })}
        />
      )

    case 'fragebogen':
      return (
        <SmileyFrage
          frage="Wie war das Training heute?"
          onAntwort={(wert) => dispatch({ art: 'selbsteinschaetzung', wert })}
        />
      )
  }
}

function Stern({ an }: { an: boolean }) {
  return (
    <svg viewBox="-12 -12 24 24" className="h-14 w-14">
      <path
        d="M0 -11 L3.2 -3.6 11 -3.4 4.9 1.4 7.1 8.9 0 4.6 -7.1 8.9 -4.9 1.4 -11 -3.4 -3.2 -3.6 Z"
        fill={an ? '#f6b81c' : '#e2e8f0'}
        stroke={an ? '#c98f0a' : '#cbd5e1'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
