import { useCallback, useEffect, useState } from 'react'
import { kindLaden, NichtGekoppelt, sessionHochladen, spielnameSetzen } from './api'
import type { KindVomServer } from './api'
import { vereine } from './content'
import { ladeToken } from './geraet'
import { aktuellesSegment, session, starteSession } from './engine/session'
import type { SessionAction, SessionState } from './engine/session'
import type { Einstellungen } from './engine/tagesplan'
import { ansageText, standardEinstellungen, tagesplan } from './engine/tagesplan'
import { gleicherTag, hole, merke, vergiss } from './persistenz'
import { ladeFortschritt, naechsteEinheit, speichereFortschritt } from './profil'
import { DialogScreen } from './screens/DialogScreen'
import { KopplungScreen } from './screens/KopplungScreen'
import { NameScreen } from './screens/NameScreen'
import { PauseScreen } from './screens/PauseScreen'
import { SmileyFrage } from './screens/SmileyFrage'
import { SpielScreen } from './screens/SpielScreen'
import { StartScreen } from './screens/StartScreen'
import { Abdunklung, AnhalteKnopf, PausenMenue } from './ui/PausenMenue'

type Stand = 'laedt' | 'ungekoppelt' | 'bereit'

export default function App() {
  const [stand, setStand] = useState<Stand>(ladeToken() ? 'laedt' : 'ungekoppelt')
  const [kind, setKind] = useState<KindVomServer | null>(null)
  const [fortschritt, setFortschritt] = useState(ladeFortschritt)
  const [lauf, setLauf] = useState<SessionState | null>(null)
  const [wiederaufnahme, setWiederaufnahme] = useState<SessionState | null>(null)
  const [menueOffen, setMenueOffen] = useState(false)

  const verein = vereine[fortschritt.vereinIndex]
  const name = kind?.spielname ?? 'Kicker'
  const mitName = (t: string) => t.replaceAll('{name}', name)
  const dispatch = (a: SessionAction) => setLauf((s) => (s ? session(s, a) : s))

  const einstellungen: Einstellungen = kind
    ? {
        pauseDauerSek: kind.pausenDauerSek,
        pauseInhalt: kind.pausenInhalt,
        spiele: Object.fromEntries(kind.einstellungen.map((e) => [e.spielId, e])),
      }
    : standardEinstellungen

  /**
   * Beim Start: Einstellungen holen und einen liegengebliebenen Schnappschuss abarbeiten.
   *
   * Reihenfolge ist wichtig — erst senden, dann vergessen. Schlägt der Upload fehl, bleibt der
   * Schnappschuss liegen und der nächste Start versucht es erneut. Ben sieht davon nichts:
   * ein Verbindungsfehler ist kein Grund, ein Kind mitten im Training zu stoppen.
   */
  const starten = useCallback(async () => {
    try {
      const geladen = await kindLaden()
      setKind(geladen)

      const alt = hole()
      if (alt && !alt.gesendet) {
        if (alt.lauf.status === 'laeuft' && gleicherTag(alt.gespeichertAm)) {
          // Am selben Tag darf Ben weitermachen, wo er aufgehört hat.
          setWiederaufnahme(alt.lauf)
        } else {
          // An einem anderen Tag beginnt der Tag neu — der angefangene wird als abgebrochen
          // protokolliert. Ein Abbruch nach 90 Sekunden ist für Thomas ein Befund, kein Müll.
          const zuSenden =
            alt.lauf.status === 'laeuft' ? session(alt.lauf, { art: 'abbrechen' }) : alt.lauf
          await sessionHochladen(zuSenden)
          vergiss()
        }
      }

      setStand('bereit')
    } catch (fehler) {
      if (fehler instanceof NichtGekoppelt) setStand('ungekoppelt')
      else setStand('bereit') // Server nicht erreichbar: mit Vorgaben spielen dürfen.
    }
  }, [])

  useEffect(() => {
    if (stand === 'laedt') void starten()
  }, [stand, starten])

  /** Nach jeder Zustandsänderung sichern. Gelöscht wird nur nach bestätigtem Upload. */
  useEffect(() => {
    if (lauf) merke(lauf)
  }, [lauf])

  async function beendeEinheit(fertigeEinheit: SessionState) {
    try {
      await sessionHochladen(fertigeEinheit)
      vergiss()
    } catch {
      // Bleibt liegen und geht beim nächsten Start raus.
    }

    const naechste = fertigeEinheit.status === 'fertig' ? naechsteEinheit(fortschritt) : fortschritt
    speichereFortschritt(naechste)
    setFortschritt(naechste)
    setLauf(null)
  }

  /** Der jeweilige Bildschirm des Ablaufs — ohne alles, was über ihm liegt. */
  function bildschirm() {
    if (stand === 'ungekoppelt') {
      return <KopplungScreen onGekoppelt={() => setStand('laedt')} />
    }

    if (stand === 'laedt') {
      return (
        <div className="flex h-full items-center justify-center bg-himmel-hell">
          <p className="text-3xl font-bold text-slate-600">Einen Moment…</p>
        </div>
      )
    }

    if (wiederaufnahme) {
      return (
        <DialogScreen
          verein={verein}
          text={mitName('Da war noch ein Training offen, {name}. Weitermachen?')}
          knopf="Weitermachen"
          onWeiter={() => {
            setLauf(wiederaufnahme)
            setWiederaufnahme(null)
          }}
        >
          <button
            onClick={() => {
              void beendeEinheit(session(wiederaufnahme, { art: 'abbrechen' }))
              setWiederaufnahme(null)
            }}
            className="taste bg-white text-slate-600 shadow active:scale-95"
          >
            Neu anfangen
          </button>
        </DialogScreen>
      )
    }

    if (!lauf) {
      return (
        <StartScreen
          aktiverVereinIndex={fortschritt.vereinIndex}
          onStart={() =>
            setLauf(
              starteSession(
                verein.id,
                fortschritt.tag,
                // Namensfrage nur, solange das Kind noch keinen Spielnamen gewählt hat.
                tagesplan(verein, fortschritt.tag, einstellungen, kind?.spielname == null),
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
          onWeiter={() => void beendeEinheit(lauf)}
        />
      )
    }

    switch (segment.art) {
      case 'namenseingabe':
        return (
          <NameScreen
            verein={verein}
            onFertig={(spielname) => {
              setKind((k) => (k ? { ...k, spielname } : k))
              // Fehlschlag ist verkraftbar: der Name steht im Zustand, der Server bekommt ihn
              // spätestens mit der nächsten Einheit. Ben soll hier nicht warten (A1).
              void spielnameSetzen(spielname).catch(() => {})
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
            angehalten={menueOffen}
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
            angehalten={menueOffen}
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

  return (
    // `relative`, damit Anhalte-Knopf, Menü und Schleier über dem jeweiligen Bildschirm liegen.
    <div className="relative h-full">
      {bildschirm()}

      {/* Der Anhalte-Knopf gehört zu keinem Segment, sondern zum Gerät: derselbe Knopf an
          derselben Stelle im Startbildschirm, im Spiel und in der Zwangspause. Deshalb liegt
          er hier und nicht in den einzelnen Bildschirmen. */}
      {stand === 'bereit' && !menueOffen && <AnhalteKnopf onOeffnen={() => setMenueOffen(true)} />}
      {menueOffen && <PausenMenue onWeiterspielen={() => setMenueOffen(false)} />}
      <Abdunklung />
    </div>
  )
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
