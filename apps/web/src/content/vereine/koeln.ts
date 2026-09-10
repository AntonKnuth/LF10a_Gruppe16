import type { Verein } from '../typen'

/**
 * Erster Verein der Reise.
 *
 * Platzhalter mit echten Bezügen, wie die anderen beiden: Wappen sind Marken, Spielernamen
 * Persönlichkeitsrechte — vor einer Veröffentlichung durch einen fiktiven Verein ersetzen.
 * Weil ein Verein nur Daten ist, kostet der Austausch keine Codeänderung.
 *
 * Köln trägt die Leitidee besonders gut: die Sprüche sind **Kölsch mit Übersetzung**, also
 * genau das, was das Content-Schema für fremdsprachige Sprüche vorsieht — und ein Kind hört
 * sofort, dass es woanders ist, ohne dass ein einziges Bild ausgetauscht wird.
 */
export const koeln = {
  id: 'koeln',
  name: '1. FC Köln',
  stadt: 'Köln',
  // Köln liegt südwestlich von Hamburg und südlich von Amsterdam — die Nadel muss auf der
  // Karte in dieser Beziehung zu den beiden anderen stehen, sonst stimmt die Reise nicht.
  karte: { x: 45.8, y: 32.8 },
  farben: { primaer: '#ed1c24', sekundaer: '#ffffff' },

  profi: {
    name: 'Toni',
    begruessung: {
      text: 'Tach {name}! Ich bin Toni. Heute trainierst du mit uns in Köln.',
    },
    lob: [
      // Ein Mundartwort mit Übersetzung im selben Satz — dieselbe Machart wie beim
      // niederländischen Lob in Amsterdam. Vorgelesen wird es trotzdem verständlich.
      { text: 'Prima jemaht, {name}! Das heißt: prima gemacht.' },
      { text: 'Stark, {name} — genau so bleiben.' },
      { text: 'Du wirst immer sicherer, {name}.' },
    ],
    bestleistung: { text: '{name}, das war deine beste Runde bisher!' },
  },

  kader: [
    { nummer: 1, name: 'Marvin Schwäbe' },
    { nummer: 4, name: 'Timo Hübers' },
    { nummer: 6, name: 'Eric Martel' },
    { nummer: 30, name: 'Linton Maina' },
  ],

  fakten: [
    'Das RheinEnergieStadion fasst rund 50.000 Zuschauer.',
    'Der 1. FC Köln wurde 1948 gegründet.',
    'An den vier Ecken des Stadions stehen große Flutlichttürme.',
    'Das Maskottchen ist ein echter Geißbock und heißt Hennes.',
  ],

  // Werden im Spiel als Jubelrufe gezeigt — je mehr, desto weniger wiederholt es sich.
  // Zwei davon stehen im „Kölschen Grundgesetz" und passen zufällig genau zu C2:
  // es geht immer weiter, und jeder ist anders.
  sprueche: [
    { text: 'Mer stonn zo dir, FC Kölle!', sprache: 'Kölsch', uebersetzung: 'Wir stehen zu dir, FC Köln!' },
    { text: 'Loss jonn!', sprache: 'Kölsch', uebersetzung: 'Los geht’s!' },
    { text: 'Dat wor jot!', sprache: 'Kölsch', uebersetzung: 'Das war gut!' },
    { text: 'Et hätt noch immer jot jejange.', sprache: 'Kölsch', uebersetzung: 'Es ist noch immer gut gegangen.' },
    { text: 'Jede Jeck es anders.', sprache: 'Kölsch', uebersetzung: 'Jeder Mensch ist anders.' },
    { text: 'Prima jemaht!', sprache: 'Kölsch', uebersetzung: 'Prima gemacht!' },
  ],
} satisfies Verein
