import type { Verein } from '../typen'

/**
 * Platzhalter mit echten Bezügen. Wappen sind Marken, Spielernamen Persönlichkeits-
 * rechte — vor einer Veröffentlichung durch einen fiktiven Verein ersetzen. Weil ein
 * Verein nur Daten ist, kostet der Austausch keine Codeänderung.
 */
export const hsv = {
  id: 'hsv',
  name: 'Hamburger SV',
  stadt: 'Hamburg',
  karte: { x: 53, y: 24 },
  farben: { primaer: '#0a3a82', sekundaer: '#ffffff' },

  profi: {
    name: 'Jonas',
    begruessung: {
      text: 'Hallo {name}, schön dass du da bist! Ich bin Jonas und trainiere heute mit dir.',
    },
    lob: [
      { text: 'Stark gemacht, {name}!' },
      { text: 'Das sah richtig gut aus, {name}.' },
      { text: 'Weiter so, {name} — du bleibst dran.' },
    ],
    bestleistung: { text: '{name}, das war deine beste Runde bisher!' },
  },

  // Tag 1 beginnt mit Ankommen, Tag 5 endet mit dem Abschiedsgeschenk.
  tage: [
    { spiele: ['aufwaermen', 'linie', 'autogramme'] },
    { spiele: ['aufwaermen', 'linie', 'rasenmaehen'] },
    { spiele: ['aufwaermen', 'stationentour', 'linie'] },
    { spiele: ['aufwaermen', 'startelf', 'elfmeter'] },
    { spiele: ['aufwaermen', 'linie', 'abschiedsgeschenk'] },
  ],

  kader: [
    { nummer: 1, name: 'Daniel Heuer Fernandes' },
    { nummer: 4, name: 'Sebastian Schonlau' },
    { nummer: 6, name: 'Jonas Meffert' },
    { nummer: 7, name: 'Immanuel Pherai' },
    { nummer: 10, name: 'Ludovit Reis' },
    { nummer: 14, name: 'Robert Glatzel' },
  ],

  fakten: [
    'Das Volksparkstadion fasst 57.000 Zuschauer.',
    'Der HSV wurde 1887 gegründet.',
    'Die Stadionuhr zählt seit 2001 die Jahre in der Bundesliga.',
  ],

  sprueche: [
    { text: 'Nur der HSV!', sprache: 'Deutsch', uebersetzung: 'Nur der HSV!' },
    { text: 'Hamburg mein Perle', sprache: 'Plattdeutsch', uebersetzung: 'Hamburg, meine Perle' },
  ],
} satisfies Verein
