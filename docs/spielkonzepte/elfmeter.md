# Spielkonzept: Elfmeter

Stand: 13.11.2026 · Katalog-ID `elfmeter` · Bereiche `hand-auge` + `druckdosierung`
Quelle der Idee: Ideensammlung, „11 Meter (Hand-Auge): Schnelligkeit und gleichmäßiger Druck;
sonst hält der Torwart."

## 1. Kurzfassung

Ben setzt den Stift auf den Ball am Elfmeterpunkt und schießt mit **einem** zügigen Strich aufs
Tor. Der Strich ist der Schuss: seine Richtung bestimmt die Ecke, sein Tempo die Höhe, sein
Druckverlauf, ob der Ball sauber fliegt. Geübt wird der **flüssige, dosierte Einzelstrich** —
nicht „so schnell wie möglich": zu lasch fängt der Torwart, zu wild geht der Ball drüber. Der
Torwart ist der Vereinstorwart (Rückennummer 1 aus `kader`) und tritt als Trainingspartner auf:
er hält ohne Häme, rollt den Ball sofort zurück und sagt genau eine Sache, die beim nächsten
Schuss anders sein soll (C2). Endbedingung ist die Uhr des `SpielScreen`, gegliedert in Runden
zu fünf Bällen mit kurzem Lockerungsmoment (B3).

Vorgeschlagener Katalogeintrag (`apps/web/src/spiele/katalog.ts:80`, nur die Anweisung ändert sich):

```ts
elfmeter: {
  titel: 'Elfmeter',
  anweisung: 'Schieße mit einem schnellen, gleichmäßigen Strich auf den leuchtenden Kreis.',
  rolle: 'normal',
  tags: ['hand-auge', 'druckdosierung'],
},
```

Neue Anweisung, weil „aufs Tor" trivial erfüllt ist — anvisiert wird die Zielmarke (A5).

## 2. Spielidee und Ablauf

**Fußballhandlung (C1):** Elfmetertraining nach der Einheit — der Profi hat Feierabend, der
Vereinstorwart bleibt noch und lässt Ben auf sich schießen. Keine Elfmeterschießen-Situation
mit Gegner und Spielstand (siehe Abschnitt 5, C2).

**Die eine Regel, aus der alles folgt** (so in den Kopfkommentar von `welt.ts`):

> **Der Ball fliegt auf der Verlängerung des Strichs — so hoch, wie der Strich schnell war, und
> nur sauber, wenn der Druck gleich blieb.**

Daraus folgt ohne weitere Sonderregel:

| Strich | Folge im Spiel | Hinweis des Torwarts |
|---|---|---|
| Tempo im Fenster, Richtung im Tor, Druck gleichmäßig | **Tor**; Zielmarke getroffen = „Winkel!" | — |
| zu schnell (kürzer als `dauerMin`) | Ball fliegt über die Latte in die Fans | „Etwas ruhiger!" |
| Richtung neben die Pfosten | Ball streift den Pfosten, „Klong" | „Mehr zur Mitte!" |
| zu langsam (länger als `dauerMax`) | flacher Roller, Torwart fängt ihn | „Etwas schneller!" |
| Druck schwankt (Variationskoeffizient über Grenze) | Ball eiert, Torwart faustet ihn weg | „Gleichmäßig drücken!" |

Geprüft wird **in genau dieser Reihenfolge**, und es wird immer nur **eine** Ursache genannt
(A5). Das ist eine `if`-Kette in einer reinen Funktion `urteil()` — dieselbe Bauart wie
`urteil()` in `apps/web/src/spiele/rasenmaehen/welt.ts:99-104`.

**Was Ben sieht und tut — Ablauf eines Schusses:**

1. **Bereit** (beliebig lange): Ball liegt auf dem Punkt, ein gestrichelter **Schusskreis**
   (Radius 160) liegt um ihn, im Tor pulsiert die Zielmarke, der Torwart wippt leicht. Keine
   Uhr drängt — wie in `ballhochhalten/welt.ts:347-348`: „Ben bestimmt, wann es losgeht".
2. **Aufsetzen** auf den Ball (Reichweite Ballradius + 34, wie `REICHWEITE` in
   `ballhochhalten/welt.ts:45`). Daneben: kleiner Puff, sonst nichts.
3. **Anlauf = der Strich.** Die Spur erscheint im selben Bild, ihre Breite folgt dem Druck.
   Die Stoppuhr startet erst, wenn der Stift den Ball verlässt — Verweilen auf dem Ball zum
   Zielen zählt nicht als langsam.
4. **Schuss**, sobald der Strich den Schusskreis verlässt — nicht erst beim Abheben. Damit ist
   die gemessene Strecke immer gleich lang (136 px vom Ballrand bis zum Kreis) und der
   Tempowert von Schuss zu Schuss vergleichbar. Zeigt der Strich nicht nach oben, gibt es
   keinen Schuss, nur „Zieh Richtung Tor".
5. **Flug** 0,25–0,55 s (schneller Strich = kürzerer Flug), der Torwart springt im Moment des
   Schusses.
6. **Reaktion** 1,2 s: Tor mit Netz und Jubel, oder Torwart/Pfosten/Latte mit Hinweis.
7. **Nachlegen** 0,8 s: der nächste Ball rollt auf den Punkt, die nächste Zielmarke erscheint.

Hebt Ben vor dem Schusskreis ab, ist das ein **Ansatz ohne Schuss**: der Ball rollt ein Stück
zurück auf den Punkt, Hinweis „Zieh bis über den Kreis". Zählt für die Vollständigkeit.

**Runden:** fünf Bälle je Runde, unten links als Ballsack sichtbar. Nach dem fünften Ball
3 s „Ballsack wird aufgefüllt" mit dem Satz „Schüttel die Hand locker aus." (B3, Lockerung
zwischen schnellen Strichen). Der fünfte Ball jeder Runde ist der **Wappenschuss**: die
Zielmarke trägt das Vereinswappen (Abschnitt 5).

**Endbedingung: Zeit.** Wie „Ball hochhalten" (`ballhochhalten/index.tsx:133-138`) beendet die
Uhr des `SpielScreen` das Spiel. Läuft sie während eines Fluges ab, fliegt der Ball zu Ende,
dann Abpfiff (4 s, Jubel unabhängig vom Ergebnis — sonst Rückmeldung vor der
Selbsteinschätzung, C3; vgl. `ballhochhalten/welt.ts:530-543`).

**Taktung:** Bens Vorbereitung 2–4 s + Flug 0,4 + Reaktion 1,2 + Nachlegen 0,8 ≈ 5–6,5 s je
Schuss. Bei der Vorgabe von 210 s (`engine/tagesplan.ts:34`) sind das **30–40 Schüsse in 6–7
Runden** — viele Wiederholungen derselben Bewegung, was motorisches Lernen braucht, aber durch
Runden, Zielwechsel und Wappenschuss gegliedert.

## 3. Grafik

Bühne **900 × 640** wie alle Spiele, eingepasst über `berechneSicht`
(`ballhochhalten/zeichnen.ts:33-37`, kopieren). Blick von hinter dem Ball aufs Tor.

```
y   0 ┌────────────────────────────────────────────────────────────────┐
      │  Himmel · Tribüne hinter dem Tor, Fans in Vereinsfarben (ruhig) │
  120 │          ┌──────────────── Latte ────────────────┐              │
      │          │╳╳╳╳╳╳╳╳╳ Netz ╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳ ( ◎ ) │  ◎ Zielmarke │
      │          │╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳(1)╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳│              │
      │          │╳╳╳╳╳╳╳╳╳╳╳╳╳ /|\  Torwart ╳╳╳╳╳╳╳╳╳╳╳│              │
  330 │──────────┴ ⚽⚽⚽ (Tore bleiben im Netz liegen) ────┴──────────── │
      │                          · · · · · ·                            │
      │                     ·    Schusskreis    ·                       │
      │                    ·         ⚽          ·   Elfmeterpunkt       │
      │ [● ● ● ○ ○]         ·    (450 | 540)    ·                       │
  640 └────────────────────────────────────────────────────────────────┘
       Tor: x 230–670, y 150–330 · Torwart-Ruhelage (450 | 285)
```

**Vereinsfarben** aus `verein.farben`: Torwarttrikot und Zielmarkenring in `primaer`, Netz und
Linien weiß, Tribüne als abgedunkelte Abstufung wie `dekoAus` (`ballhochhalten/welt.ts:139-164`).
Die Mischfunktion (`mischeFarbe`, 10 Zeilen) wird kopiert, nicht importiert — Spiele hängen
nicht voneinander ab.

**Zeichenreihenfolge** in `zeichnen.ts`: (1) Himmel, Tribüne — Fans bewegen sich nur beim
Torjubel · (2) Rasen, Strafraumlinien, Elfmeterpunkt · (3) Netz-Rückwand, verbeult nach
`w.netz`, darin die Torbälle · (4) Pfosten, Latte · (5) Zielmarke, pulsierend; Wappenschuss mit
Kürzel im Schild wie die Kartennadel · (6) Torwart aus Kreis und Rundrechtecken, Nummer 1 ·
(7) Ball mit Schatten, im Flug kleiner (1 → 0,45) · (8) Strichspur (3–11 px nach Druck),
Schusskreis · (9) Partikel, Hinweisblase, Ballsack, Geisterstrich.

**Sofortfeedback unter 100 ms (A1):**
- Strichspur erscheint im nächsten Bild (≤ 16 ms); ihre schwankende Breite **zeigt** den
  Druckverlauf, bevor das Ergebnis da ist — Ben sieht ein ungleichmäßiges Band.
- Der Schuss wird **im `pointermove`-Handler** ausgelöst, nicht in der Bildschleife: Kick-Ton
  und Abflug starten mit dem Ereignis, nicht bis zu 16 ms später.
- Tor: Netz beult aus (Gitterpunkte um den Treffpunkt radial versetzt, Abklingen 0,6 s),
  Konfetti in Vereinsfarben (14 Teilchen; „Winkel!" 26 goldene), Netz-Wusch + Torschrei.
- Kein Bildschirmwackeln bei Nicht-Toren; `prefers-reduced-motion` schaltet Wackeln und
  Netzbeule ab (wie `ballhochhalten/index.tsx:38`).

**Torwart** springt beim Schuss: bei `gehalten`/`abgewehrt` zum Ball, sonst in die andere Ecke
(Mitte → links). Deterministisch, also testbar, kein `Math.random` im Urteil.

**Reizarm (A2):** keine Punktzahl, keine Anzeigetafel, keine Serienanzeige. Fortschritt ist
gegenständlich: jeder Torball bleibt im Netz liegen (ab 12 rutschen sie zu einem Haufen
zusammen). Bewegt sind in Ruhe nur Zielmarke und Torwart-Wippen.

**Ton (`klang.ts`, A4):** `schuss` (Plopp, Tonhöhe nach Tempo), `netz`, `tor`, `winkel`,
`gefangen` (Handschuh-Klatsch), `pfosten` (Klong), `drueber`, `abpfiff`. `ton()`/`rauschen()`
aus `ballhochhalten/klang.ts:27-72` kopieren; Lautstärke je Ton neu lesen.

## 4. Datenerfassung

**Die Strichdauer kommt aus `PointerEvent.timeStamp`, nicht aus der Bildschleife.**
`aktualisiere` tickt mit 16,7 ms — bei einem Fenster ab 60 ms wären das bis zu 28 % Messfehler.
`index.tsx` reicht `fein.timeStamp` für jedes Feinereignis (`eingabe.ts:53-56`) an `ziehe()`
weiter; im Test werden Millisekunden direkt übergeben.

**Druck-Variationskoeffizient** `cv = Streuung / Mittel` (beides aus `druckKennzahlen`,
`eingabe.ts:59-64`) nur über die Abtastungen **ab 30 % der Anlaufstrecke** bis zum Schusskreis.
Grund: das Aufsetzen ist immer ein Druckanstieg — mit ihm wäre jeder Strich „ungleichmäßig".
Das Abheben liegt ohnehin hinter dem Schusskreis.

**Kernfelder** (`engine/segmente.ts:39-72`):

| Feld | Wert | Begründung |
|---|---|---|
| `vollstaendigkeit` | Schüsse / Ansätze | Ein Ansatz ohne Schuss ist ein begonnener, nicht zu Ende geführter Strich — genau das, was Thomas als Zögern sehen will |
| `genauigkeit` | Mittel über Schüsse von `max(0, 1 − abstand(Treffpunkt, Ziel) / 220)`; ohne Schüsse 0 | Grob, **unmaßgeblich** (Kommentar wie `ballhochhalten/welt.ts:729-733`) |
| `druckMittel`, `druckStreuung` | über alle Abtastungen der gewerteten Strichabschnitte | wie die anderen Spiele |
| `synthetischerDruck` | `true`, sobald ein Wert synthetisch war | Ersatzdruck ist konstant → `cv = 0` → „gleichmäßig" wäre geschenkt |
| `stufe`, `abgebrochen`, `eingabegeraet` | wie gehabt | `stufe` bleibt im Spiel fest |

**`extra`-Schema:**

```ts
extra: {
  ansaetze: number, schuesse: number, tore: number, winkel: number, wappentreffer: number,
  hilfen: number,                       // wie oft der Geisterstrich gezeigt wurde
  massstab: number,                     // sicht.s — Bühnen-px je Bildschirm-px (Abschn. 9)
  fenster: { dauerMinMs: number, dauerMaxMs: number, cvGrenze: number, zielRadius: number },
  liste: Array<{
    nr: number,                         // 1, 2, 3 … in Schussreihenfolge
    ziel: 'links' | 'mitte' | 'rechts' | 'ol' | 'or' | 'ul' | 'ur',
    wappen: boolean, hilfe: boolean,    // Wappenschuss? Hilfe vorher gezeigt?
    dauerMs: number,                    // Anlaufstrecke Ballrand → Schusskreis
    richtungGrad: number, zielGrad: number,  // Strich- und Idealrichtung, 0 = senkrecht hoch
    treffX: number, treffY: number,     // Bühnenkoordinaten
    druckMittel: number, druckCv: number,
    urteil: 'tor' | 'drueber' | 'vorbei' | 'gehalten' | 'abgewehrt',
  }>,
}
```

Das sind **Messfakten** (Dauer, Winkel, Druckwerte), keine Bewertung — gleiches Muster wie
`extra.wuerfe` in „Ball hochhalten" (`ballhochhalten/welt.ts:214-224`, `:763`).

**Was C# rechnet.** Der Bericht nutzt heute nur `Kennzahlen.Berechne` über den ganzen Blob
(`apps/api/Endpunkte/Bericht.cs:91`, `:136`). Für Elfmeter liefern davon brauchbare Werte:
`TempoMittel`/`TempoStreuung`, `DruckStreuung`, `Zittern` (ein schneller gerader Strich sollte
fast keine Richtungswechsel haben — hier ist Zittern besonders aussagekräftig) und `Absetzer`
(≈ Ansätze plus Fehltipper). **Phase 1 braucht keine neue C#-Zeile.**

Vorschlag für danach, allgemein und nicht nur für Elfmeter: `Kennzahlen.Striche(byte[] blob)`
in `Kennzahlen.cs`, zerlegt die Punktfolge an `Druck <= 0` (dieselbe Bedingung wie
`Kennzahlen.cs:72`) und liefert je Strich mit ≥ 4 Abtastungen `Geradheit = Sehne / Weglänge`
(1 = gerade), `DruckCv = Streuung / Mittel` und `Strichdauer = T_letzte − T_erste`. Gemittelt
über Striche mit Weglänge über dem Median (filtert Fehltipper, ohne Spielgeometrie zu kennen). Die Zielgenauigkeit lässt sich **nicht** aus dem Blob
rechnen: er liegt in Bildschirmkoordinaten des `SpielScreen` (`SpielScreen.tsx:17-19`) und
kennt die Zielmarke nicht. Dafür ist `extra.liste` da: `Richtungsfehler = Mittel |richtungGrad
− zielGrad|` und `Tempokonstanz = Streuung(dauerMs) / Mittel(dauerMs)` über die Schüsse.

**Was Thomas liest** (Verlauf, mit Stufe eingefärbt): Tempo steigt und **streut weniger** =
flüssiger, automatisierter Strich. `DruckStreuung` und `Zittern` sinken = ruhigere
Kraftführung. `DruckMittel` steigt dauerhaft über ~0,8 = Verdacht auf Verkrampfung — das Spiel
belohnt Gleichmäßigkeit, nicht Kraft, ein Anstieg ist also ein Befund (B3).

**Fallstricke:**
- **Maus:** Mausstriche sind viel schneller und gerader als Stiftstriche. Tempowerte von Maus
  und Pencil nie in einer Kurve mitteln — `eingabegeraet` ist Pflicht.
- **Synthetischer Druck** (Maus, auch Finger — `eingabe.ts:44-47`): konstanter Ersatzwert →
  `abgewehrt` kommt nie vor; Druckkonstanz ist so weder übbar noch messbar.
- **Ausdünnung:** ein Schussstrich von 150 ms hat nach `rohdaten.ts:16` (60 Hz) nur ~9
  Abtastungen. Für Mittelwerte genug, für Geschwindigkeitsgipfel nicht (Abschnitt 9).
- **Browserbewertung ist unmaßgeblich** — `genauigkeit` und `urteil` erscheinen in keinem
  Bericht (`Bericht.cs:56-60`).

## 5. Spielspaß

**Warum ein 7-Jähriger mit ADHS dranbleibt:**
- **Kurzer Zyklus:** alle 5–6 s ein abgeschlossenes Ereignis mit klarem Ausgang. Für ADHS
  besser als lange Bahnen, bei denen die Belohnung am Ende liegt.
- **Spannungsbogen pro Schuss:** Zielen (Ruhe) → Strich (Aktion) → 0,4 s Flug, Torwart fliegt
  (Spannung) → Netz/Jubel (Auflösung). Bewusst **ohne Anlaufanimation und ohne Pfiff vor dem
  Schuss**: ein Anlauf vor dem Strich verzögert A1, und der Pfiff als Startsignal ist die
  Mechanik von „Dribbeln mit Pfiff" (`inhibition`).
- **Überraschung:** Torwart springt mal richtig, mal falsch; ein Ball über die Latte wird von
  einem jubelnden Fan gefangen — auch der Fehlschuss hat einen komischen Moment.
- **Steigerung in der Runde:** Ball 1–4 normale Ziele, Ball 5 Wappenschuss — Treffer gibt
  Konfettiregen in Vereinsfarben (46 Teilchen, wie der Wappenballon
  `ballhochhalten/welt.ts:709-715`) und einen Vereinsspruch mit Übersetzung.
- **Abwechslung (B3):** feste Zielfolge mit wechselnden Ecken; Runden-Lockerung nach 5 Bällen.
- **Vereinsbezug (Leitidee):** der Torwart ist der echte Torwart dieses Vereins (HSV:
  Nr. 1 aus `hsv.ts:30`, Ajax: `ajax.ts:26`), er stellt sich zu Beginn mit Vornamen vor; Jubel
  sind die `sprueche` des Vereins. Bei einem neuen Verein steht ein anderer Mann im Tor.
- **Lob des Profis (C5)** kommt im `lob`-Segment danach; als Bestleistungswert eignet sich
  `extra.tore` (siehe Abschnitt 9 — Bestleistung ist noch nirgends gebaut).

**C2 — verstößt die Idee selbst dagegen? Ja, in ihrer naheliegenden Form.** Ein Elfmeter ist
ein Duell mit Sieger. Ein Elfmeterschießen mit Spielstand „Ben 3 : Torwart 2", roten Kreuzen
für Fehlschüsse oder „Paraden" als Zähler wäre ein Verliererzustand im Kleinen, 30-mal pro
Einheit. Die Lösung:

1. **Kein Gegnerzähler.** Gezählt werden nur Bens Tore, und das gegenständlich (Bälle im Netz).
   Fehlschüsse hinterlassen keine Spur. Der Ballsack zeigt *geschossen*, nicht *getroffen*.
2. **Monoton:** Tore nehmen nie ab, nichts wird abgezogen — wie die Startbesetzung der Tribüne
   in `ballhochhalten/welt.ts:58-62`.
3. **Torwart als Trainer:** hält ohne Jubel, rollt den Ball zurück, Daumen hoch, und seine
   Sprechblase nennt **eine** Änderung („Etwas schneller!"). Kein „Daneben!", kein Tadel —
   sachlich wie „zu hoch / zu kurz" in `ballhochhalten/welt.ts:491-496`.
4. **Sofortiger Nachschuss**, unbegrenzt; es gibt keinen Zustand ohne Ball.
5. **Hilfe statt Abbruch:** nach **3 Schüssen ohne Tor in Folge** zeigt ein Geisterstrich vom
   Ball zur Zielmarke, ein Punkt läuft ihn in der Mitte des Tempofensters ab („so schnell"), der
   Torwart sagt den Satz vor (`vorlesen()`, `ui/vorlesen.ts:8`). Der nächste Schuss trägt
   `hilfe: true`. **Kein heimlich schwächerer Torwart:** die Anforderung bleibt die
   eingestellte, sonst lügt der Messwert und Ben merkt den geschenkten Erfolg.
6. **Großzügiges Tor:** die Pfosten stehen weit (±220 px), ein Tor braucht nur Tempo und
   Druck im Fenster. Die Zielmarke ist der Bonus („Winkel!"), nicht die Bedingung.

Erwartung: bei passend eingestellter Stufe sind 60–80 % der Schüsse Tore. Liegt die Quote
deutlich darunter, ist die Stufe zu hoch — das sieht Thomas an `extra.tore / extra.schuesse`.

**Bewusst ohne Serien-Multiplikator** (anders als `komboMulti` in `ballhochhalten/welt.ts:89`):
eine reißende Serie ist der kleine Bruder des Streaks, den CLAUDE.md streicht.

## 6. Schwierigkeit und Einstellungen (B1)

Alles hängt an `stufe` (1–5 in der Therapeuten-App, `Einstellungen.tsx:141`; Vorgabe 3) und
bleibt während des Spiels fest — eine selbstregelnde Stufe wäre im Verlauf nicht lesbar
(Begründung wie `ballhochhalten/welt.ts:50-53`). **Startwerte, kein Messwert — mit echtem
Pencil am Zielgerät nachziehen.**

```ts
export const dauerMin   = (s: number) => 40 + 20 * s        // ms, schneller = drüber
export const dauerMax   = (s: number) => 1000 - 120 * s     // ms, langsamer = gehalten
export const cvGrenze   = (s: number) => 0.40 - 0.06 * s    // Druckschwankung
export const zielRadius = (s: number) => 110 - 15 * s       // px, Bonusmarke
export const zielArt    = (s: number) => (s <= 2 ? 'streifen' : 'ecken')
```

| Stufe | Tempofenster (136 px) | ≈ mm/s am iPad 11" | Druck-cv max | Zielmarke | Ziele |
|---|---|---|---|---|---|
| **1** | 60–880 ms | 35–520 | 0,34 | r 95 | links / mitte / rechts als senkrechte Streifen, Höhe egal |
| **2** | 80–760 ms | 41–390 | 0,28 | r 80 | wie 1 |
| **3** | 100–640 ms | 48–310 | 0,22 | r 65 | 4 Ecken + Mitte; unten = langsamer, oben = schneller im Fenster |
| 4 | 120–520 ms | 60–260 | 0,16 | r 50 | wie 3 |
| 5 | 140–400 ms | 78–220 | 0,10 | r 35 | wie 3 |

(1 Bühnen-px ≈ 0,23 mm bei einem 11"-iPad mit Maßstab ≈ 1,19; 136 px ≈ 31 mm.)

**Höhe aus Tempo:** `hoehe = (dauerMax − dauer) / (dauerMax − dauerMin)` → 0 = flach auf dem
Rasen, 1 = unter die Latte. Ab Stufe 3 heißt eine untere Ecke also „zügig, aber nicht zu
schnell", eine obere „schnell, aber noch kontrolliert". **Tempo wird damit dosiert, nicht
maximiert** — das ist der therapeutische Kern (Abschnitt 9).

**Feste Zielfolge** statt Zufall, aus demselben Grund wie `VERSATZ` in `linie/welt.ts:38-45`:
zwei Sitzungen müssen vergleichbar sein. Streifen: `['links','rechts','mitte','rechts','links']`;
Ecken: `['ul','or','ur','ol','mitte', 'or','ul','ol','ur','mitte']`, Ball 5 jeder Runde mit Wappen.

**Toleranz, Zielgeschwindigkeit, Mindesttrefferquote** stehen zwar in der Datenbank
(`apps/api/Daten/Entitaeten.cs:127-130`), werden aber an kein Spiel weitergereicht — das
`spiel`-Segment trägt nur `stufe` (`engine/tagesplan.ts:196`). Elfmeter ist der natürlichste
Abnehmer für `zielgeschwindigkeit` (Faktor auf beide Fenstergrenzen). Das erfordert aber eine
Änderung an `Segment`, `SpielProps` und `SpielScreen` — gemeinsame Dateien, also Absprache.
**Empfehlung: erst mit `stufe` allein bauen**, wie alle vier fertigen Spiele.

## 7. Content-Bedarf

**Keine neuen Pflichtfelder in `content/typen.ts`.** Was das Spiel braucht, ist schon da:

| Bedarf | Quelle | Rückfall |
|---|---|---|
| Torwart (Name, Nummer) | `verein.kader.find(k => k.nummer === 1)`, Vorname = erstes Wort | `{ nummer: 1, name: 'Torwart' }` |
| Trikot- und Markenfarbe | `verein.farben.primaer` / `sekundaer` | `#2f6ea8` / `#ffffff` |
| Wappen auf der Wappenmarke | Kürzel aus `verein.id` (wie `dekoAus`) | `TK` |
| Jubel bei Tor/Winkel | `verein.sprueche` (fremdsprachig mit Übersetzung) + allgemeine Rufe | allgemeine Rufe |

Die Welt bekommt nur einen kleinen `Deko`-Auszug (wie `ballhochhalten/welt.ts:98-101`), damit
`welt.test.ts` ohne Content-Paket läuft. Eigene Torwartsätze wären später ein optionales
`torwart?: { begruessung: Dialog }` an `Profi` — für Phase 1 unnötig.

**Beispiel HSV** (ohne Änderung an `hsv.ts`): Im Tor steht Daniel mit der 1 im HSV-Blau
`#0a3a82`. Begrüßungsblase: „Ich bin Daniel. Schieß auf den Kreis!" Tor in die Wappenmarke:
Konfetti blau-weiß, Ruf „Dat löppt!" mit Untertitel „Das läuft!".

## 8. Umsetzung

**Dateien** (`apps/web/src/spiele/elfmeter/`), grob:

| Datei | Zeilen | Inhalt | Vorlage |
|---|---|---|---|
| `welt.ts` | ~320 | Konstanten, Stufe, `Deko`, `neueWelt`, `aufsetzen`, `ziehe`, `abheben`, `urteil`, `aktualisiere`, `beginneAbpfiff`, `ergebnis` | Gerüst `ballhochhalten/welt.ts`; `urteil` wie `rasenmaehen/welt.ts:99` |
| `zeichnen.ts` | ~300 | Kulisse, Tor+Netz, Torwart, Ball, Spur, Partikel, Blase, Geisterstrich | `berechneSicht`, `kreis`, `rundRect` aus `ballhochhalten/zeichnen.ts` |
| `index.tsx` | ~140 | Canvas, Zeiger, Bildschleife, `angehalten`, `zeitAbgelaufen` | `ballhochhalten/index.tsx` fast 1:1 |
| `klang.ts` | ~100 | acht Töne | `ballhochhalten/klang.ts` |
| `welt.test.ts` | ~220 | siehe unten | Stil von `ballhochhalten/welt.test.ts` |

Summe ≈ 1.080 Zeilen, etwa die Hälfte von „Ball hochhalten" (2.193).

**Zustand:** ein Feld `phase` (`bereit | zieht | flug | reaktion | nachlegen | lockern | abpfiff`) und eine Uhr `phaseUhr` statt mehrerer Flags.

**Signaturen:**

```ts
aufsetzen(w, x, y, d: Druck, geraet: Eingabegeraet, tMs: number): boolean
ziehe(w, x, y, d: Druck, tMs: number): void   // löst beim Verlassen des Schusskreises den Schuss aus
abheben(w): void                               // vor dem Kreis: Ansatz ohne Schuss
urteil(stufe, dauerMs, richtungGrad, cv): Urteil   // rein, ohne Welt
```

`index.tsx` ruft für jedes Feinereignis `ziehe(w, q.x, q.y, druckVon(fein), fein.timeStamp)`.

**Eintragungen:** `apps/web/src/spiele/index.ts:46-51` — `elfmeter: Elfmeter` in `KOMPONENTEN`
(+ Import). `katalog.ts:80-85` — nur die Anweisung. `Spielkatalog.cs:41` und
`apps/therapeut/src/api.ts:207` stehen bereits.

**Testfälle `welt.test.ts`:**

1. `urteil`: Fenster + 0° + cv 0,05 → `tor`; zu kurz → `drueber`; zu lang → `gehalten`;
   cv über Grenze bei perfektem Tempo → `abgewehrt`; Treffpunkt außerhalb ±220 px → `vorbei`.
2. Zu schnell **und** schräg → genau ein Urteil, `drueber` (Reihenfolge).
3. Schnellerer Strich im Fenster → höherer Treffpunkt; Strich auf die Marke zu → Abstand < `zielRadius`.
4. Stufe: `dauerMax(5) < dauerMax(1)`, `cvGrenze(5) < cvGrenze(1)`; nach 20 Schüssen unverändert.
5. Aufsetzen neben dem Ball → `false`, kein Ansatz; Strich nach unten über den Kreis → kein Schuss.
6. 2 s Verweilen auf dem Ball, dann zügiger Strich → Dauer misst nur den Anlauf ab Ballrand.
7. Druckanstieg im ersten Drittel geht nicht in `druckCv` ein.
8. Abheben vor dem Schusskreis → Ansatz ohne Schuss; mit einem Schuss danach `vollstaendigkeit` 0,5.
9. C2: nach `gehalten` liegt nach Reaktion + Nachlegen wieder ein Ball bereit; `tore` sinkt nie.
10. Hilfe nach 3 Nicht-Toren in Folge, nicht nach 2; Tor setzt zurück; Schuss trägt `hilfe`.
11. Zielfolge gleich in zwei Welten gleicher Stufe; Ball 5 ist Wappen; danach Phase `lockern`.
12. `beginneAbpfiff` im `flug` wartet die Landung ab, dann 4 s bis `fertig`.
13. Synthetischer Druck markiert; ohne Schüsse `genauigkeit` 0 ohne NaN; ohne Nr. 1 Rückfall „Torwart".

## 9. Risiken und offene Fragen

**Therapeutisch**
- **Was heißt „schnell"?** In der Schreibmotorik gilt ein automatisierter Strich als
  *ballistisch*: eine Beschleunigung, ein Abbremsen, ohne Nachkorrektur unterwegs. Kinder mit
  feinmotorischer Störung schreiben oft langsam und mit vielen Geschwindigkeitsumkehrungen, weil
  sie jede Teilstrecke visuell nachsteuern (Messgröße dafür in der Handschriftanalyse: Anzahl
  der Geschwindigkeitsumkehrungen je Strich, NIV). „Schnell" ist hier deshalb als **flüssig**
  gemeint, und genau dafür steht die Untergrenze („gehalten"). Die Obergrenze („drüber") gibt
  es, weil bei ADHS „schnell" leicht zu einem ungezielten Wischen wird. **Mit Thomas klären:**
  ob er Tempo als Zielgröße will oder ob ihm Flüssigkeit (NIV) wichtiger ist.
- **Zielkonflikt Tempo gegen Genauigkeit:** wer zielt, wird langsamer. Das ist gewollt, aber ab
  Stufe 3 (Höhe aus Tempo) kann es zu viel auf einmal sein. Stufe 1–2 entkoppeln das bewusst.
- **Verkrampfung:** schnelle Striche gehen oft mit festem Griff einher. Das Spiel belohnt
  Gleichmäßigkeit, nicht Kraft; Lockerung nach jeder Runde. Ob 3 s reichen, entscheidet Thomas.
- **Unterschied zu „Ball hochhalten"** (gleiche Tags): dort wird der Druck **im Stillstand**
  dosiert (Andruck beim Loslassen bestimmt die Höhe, `ballhochhalten/welt.ts:5-9`) und das Ziel
  bewegt sich (wanderndes Band). Hier wird der Druck **während einer schnellen Bewegung
  konstant gehalten**, und das Ziel steht. Isometrische gegen dynamische Kraftdosierung.
- **Unterschied zu „Linie malen":** dort langsam, nachgesteuert, Rückmeldung während des
  Strichs (Korridor, `linie/welt.ts:7-10`). Hier schnell, ohne Korridor, Rückmeldung erst nach
  dem Strich — offener statt geschlossener Regelkreis.

**Technisch**
- **Abtastung:** 150-ms-Striche bei 60 Hz Ausdünnung (`rohdaten.ts:16`) = ~9 Punkte. NIV ist
  damit nicht verlässlich rechenbar. Falls Thomas NIV will: Ausdünnung für dieses Spiel
  aussetzen — Änderung am gemeinsamen `rohdaten.ts`, nur mit Absprache.
- **Gerätegröße:** das Tempofenster ist in Bühnen-px. Auf einem 13"-iPad ist dieselbe
  Handbewegung weniger Bühnen-px als auf einem 11". Toleranz bleibt laut CLAUDE.md
  einheitenlos; Thomas sollte das Gerät nicht wechseln. `extra.massstab` erlaubt später ein
  Umrechnen.
- **`getCoalescedEvents`** auf iPadOS-Safari vor der Vorführung prüfen; ohne sie ist die
  Strichdauer nur auf ~8 ms genau (Fallback in `eingabe.ts:53-56` funktioniert trotzdem).
- **Gleiche Tags wie „Ball hochhalten":** der Tagesplan stellt beide nie direkt hintereinander
  (maximale Überschneidung) — gut. Im Wochenbericht landen beide aber im selben Bereich. Offen:
  wäre `['gerade-striche', 'druckdosierung']` ehrlicher? Der Schuss *ist* ein gerader Strich.
  Entscheidung der Gruppe; zu ändern in `katalog.ts` **und** `Spielkatalog.cs`.

**Konflikte mit CLAUDE.md / bestehendem Code**
- **C5:** der `bestleistung`-Dialog existiert (`content/typen.ts:29-30`), wird aber nirgends
  benutzt. Elfmeter liefert mit `extra.tore` einen Wert, gebaut ist die Benennung noch nicht.
- **B1:** Zielgeschwindigkeit und Mindesttrefferquote kommen in keinem Spiel an (Abschnitt 6).
  Betrifft alle Spiele, nicht nur dieses — für den Bericht relevant.
- **A2/Serien:** „Ball hochhalten" zeigt Punktzahl und Serie (`ballhochhalten/zeichnen.ts:346-355`).
  Elfmeter verzichtet bewusst auf beides; die Gruppe sollte die Spiele angleichen.
- **Persönlichkeitsrechte:** der Torwart ist ein echter Spieler mit Namen — wie alle
  Vereinsassets Platzhalter, der Austausch bleibt reine Content-Arbeit.
- **`klang.ts` wird zum dritten Mal kopiert** (Ball hochhalten, Aufwärmen, Elfmeter). Ein
  gemeinsames `spiele/klang.ts` wäre jetzt ein konkreter Anlass — aber erst nach dem Merge, um
  nicht in fremden Dateien zu arbeiten.

## 10. Anforderungs-Check

| ID | Status | Wie / Risiko |
|---|---|---|
| A1 | erfüllt | Spur im nächsten Bild, Schuss + Ton im Ereignis-Handler; Ergebnis nach 0,25–0,55 s Flug ist Ausgang, nicht Teilbewegung |
| A2 | erfüllt | keine Zahlen, keine Serie; Fortschritt = Bälle im Netz; außer Spielfläche nur Ballsack |
| A3 | erfüllt | Timer im `SpielScreen`; Spiel endet über `zeitAbgelaufen`; `angehalten` stoppt `aktualisiere` |
| A4 | erfüllt | nur funktionale Töne, `tonLautstaerke()` je Ton, keine Musik |
| A5 | erfüllt | eine Anweisung, vorgelesen; Torwart-Hinweis nennt immer nur eine Ursache |
| B1 | betroffen | fünf Stufen mit Tempofenster, cv-Grenze, Zielgröße; `zielgeschwindigkeit` ungenutzt (Abschn. 6) |
| B2 | erfüllt | fünftes fertiges Spiel; Hand-Auge (Zielen) + Kraftdosierung (Druckkonstanz) |
| B3 | erfüllt | Lockerung nach jeder Runde, wechselnde Ziele, Gleichmäßigkeit statt Kraft belohnt; Risiko Griffverkrampfung |
| B4 | erfüllt | Rohdaten über `SpielScreen`; Strichdauer aus `timeStamp`; `extra.liste` mit Messfakten je Schuss |
| C1 | erfüllt | Elfmetertraining mit dem Vereinstorwart |
| C2 | Risiko → gelöst | Duell-Idee entschärft: kein Gegnerzähler, monotone Tore, Torwart als Trainer, Nachschuss, Geisterstrich-Hilfe |
| C3 | erfüllt | Abpfiff-Jubel unabhängig vom Ergebnis, kein Ergebnis vor der Smiley-Frage |
| C4 | erfüllt | im Spiel nur gegenständlicher Fortschritt; Prozentwerte nur bei Thomas |
| C5 | betroffen | Lob im `lob`-Segment; Bestleistung (`extra.tore`) ist projektweit noch nicht gebaut |
| C6 | nicht betroffen | Ortswechsel bringt automatisch neuen Torwart, Farben und Sprüche |
| D2 | erfüllt | Aufzeichnung unsichtbar, Ansätze ohne Schuss werden mitgezählt |
| D4 | erfüllt | keine neuen personenbezogenen Daten; Torwartname ist Vereins-Content |
