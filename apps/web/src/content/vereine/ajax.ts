import type { Verein } from '../typen'

/** Zweiter Verein — zeigt, dass ein Verein nur eine Datei plus Bilderordner ist. */
export const ajax = {
  id: 'ajax',
  name: 'Ajax Amsterdam',
  stadt: 'Amsterdam',
  karte: { x: 40.8, y: 37.5 },
  farben: { primaer: '#d2122e', sekundaer: '#ffffff' },

  profi: {
    name: 'Sven',
    begruessung: {
      text: 'Hoi {name}! Ich bin Sven. Heute trainierst du bei uns in Amsterdam.',
    },
    lob: [
      { text: 'Netjes, {name}! Das heißt: ordentlich gemacht.' },
      { text: 'Klasse, {name}, genau so.' },
      { text: 'Du wirst immer sicherer, {name}.' },
    ],
    bestleistung: { text: 'Bestleistung, {name}! Besser als jedes Mal davor.' },
    abschied: {
      text: 'Tot ziens, {name}! Das heißt: bis bald. Das Probetraining bei Ajax hast du geschafft.',
    },
  },


  kader: [
    { nummer: 1, name: 'Remko Pasveer' },
    { nummer: 5, name: 'Owen Wijndal' },
    { nummer: 8, name: 'Kenneth Taylor' },
    { nummer: 9, name: 'Brian Brobbey' },
  ],

  fakten: [
    { text: 'Die Johan Cruyff Arena hat ein Dach, das sich schließen lässt.', wort: 'DACH' },
    { text: 'Ajax wurde 1900 gegründet.', wort: '1900' },
  ],

  // Werden im Spiel als Jubelrufe gezeigt — je mehr, desto weniger wiederholt es sich.
  sprueche: [
    { text: 'Wij zijn Ajax!', sprache: 'Niederländisch', uebersetzung: 'Wir sind Ajax!' },
    { text: 'Kom op, jongens!', sprache: 'Niederländisch', uebersetzung: 'Los, Jungs!' },
    { text: 'Goed zo!', sprache: 'Niederländisch', uebersetzung: 'Gut so!' },
    { text: 'Wat een bal!', sprache: 'Niederländisch', uebersetzung: 'Was für ein Ball!' },
    { text: 'Prachtig!', sprache: 'Niederländisch', uebersetzung: 'Wunderbar!' },
    { text: 'Doorgaan!', sprache: 'Niederländisch', uebersetzung: 'Weitermachen!' },
  ],

  urkunde: { text: 'Oorkonde', sprache: 'Niederländisch', uebersetzung: 'Urkunde' },
} satisfies Verein
