# Stadionführung (`stationentour`) — Spielkonzept

Stand: 13.11.2026 · Status: Konzept, nicht gebaut · Katalog: `apps/web/src/spiele/katalog.ts:68`,
`apps/api/Auswertung/Spielkatalog.cs:39`

## 1. Kurzfassung

Ben ist Stadionführer. An jeder Station sagt der Stadionsprecher einen echten Fakt über dieses
Stadion an, und auf der Anzeigetafel erscheint das **Schlüsselwort** des Fakts („1887", „RAUTE")
als gestrichelte Schablone. Ben **spurt die Schablone nach**; jeder geschaffte Strich leuchtet auf
der Tafel auf. Unten läuft eine Besuchergruppe mit, die auf sein **Tempo** reagiert: im Takt geht
sie dicht hinter seiner Fahne, zu schnell ruft sie „Warte!", zu langsam schaut sie sich um —
**sie geht nie weg** (C2). Gleichmäßiger Druck zeigt sich in der Strichbreite; maßgeblich
ausgewertet werden Tempo-Gleichmäßigkeit und Druckschwankung in C#, ohne dass der Server die
Schablone kennen muss.

Vorgeschlagener Katalogeintrag (ersetzt den bisherigen in `katalog.ts:68-73`):

```ts
stationentour: {
  titel: 'Stadionführung',
  anweisung: 'Fahre das Wort auf der Anzeigetafel ruhig und gleichmäßig nach.',
  rolle: 'normal',
  tags: ['schreiben', 'druckdosierung'],
},
```

Die bisherige Anweisung „Schreibe die Stadionfakten … ab" verspricht freies Abschreiben ganzer
Sätze — das lässt sich nicht bewerten (Handschrift ist nicht auslesbar) und ist für einen
Siebenjährigen zu lang. Rolle und Tags bleiben, `Spielkatalog.cs` braucht keine Änderung.

## 2. Spielidee und Ablauf

**Fußballhandlung (C1):** Stadionführung beim Probetraining-Verein — Ben zeigt Besuchern das
Stadion. Die Fakten sind die echten Fakten *dieses* Stadions (Leitidee), nicht austauschbare
Texte mit anderem Wappen.

**Die eine Regel, aus der alles folgt** (Kopfkommentar für `welt.ts`):

> **Die Schablone füllt sich nur dort, wo der Stift auf ihr liegt — das Tempo entscheidet nie
> darüber, ob es weitergeht, sondern nur, wie die Besucher mitgehen.**

Daraus folgt: jedes Wort wird fertig, egal wie schnell oder langsam (C2). Zu schnell kostet nichts
außer einem „Warte!", zu langsam nichts außer einem neugierigen Umschauen. Der Anreiz für
gleichmäßiges Tempo ist ausschließlich positiv: wer eine Station überwiegend im Takt führt,
bekommt einen neuen Besucher dazu. Die Gruppe wächst, sie schrumpft nie.

**Ablauf einer Station (≈ 15–25 s):**

1. Gruppe läuft ins Bild (1,8 s, `WECHSEL_SEK`), Stadionsprecher liest den Fakt vor
   („Wusstest du? Der HSV wurde 1887 gegründet.").
2. Auf der Tafel steht das Schlüsselwort gestrichelt, der **erste Strich des ersten Zeichens** ist
   hervorgehoben, ein grüner Startpunkt mit kleinem Pfeil zeigt Ort und Richtung.
3. Ben spurt nach. Strich fertig → Strich leuchtet, nächster Startpunkt erscheint. Zeichen fertig
   → „Pling", das Zeichen leuchtet ganz. Absetzen ist erlaubt; weiter geht es **an derselben
   Stelle**, nicht von vorn.
4. Wort fertig → Tafel leuchtet auf, kurzer Applaus. Bei Taktanteil ≥ Mindestanteil kommt ein
   Fan mit Schal zur Gruppe. Dann nächste Station.

**Endbedingung: Zeit** (`zeitAbgelaufen`, wie Autogrammstunde, `autogramme/index.tsx:339-342`).
Erschöpfter Inhalt taugt nicht: drei HSV-Fakten à 20 s wären nach einer Minute vorbei, A3 verlangt
3–5 Minuten. Nach dem letzten Fakt beginnt die Tour von vorn mit einer **neuen Gruppe**
(„Die nächste Gruppe wartet schon!") — feste Reihenfolge, damit zwei Sitzungen vergleichbar
bleiben (gleiche Begründung wie `linie/welt.ts:43-45`). Bei 210 s ≈ 8–12 Stationen; deshalb
braucht jeder Verein **mindestens 5 Fakten** (Abschnitt 7).

**Hilfe statt Abbruch (C2):** 6 s ohne Aufsetzen → Startpunkt pulsiert, einmalig vorgelesen
„Setz den Stift am grünen Punkt an." Aufsetzen fern vom offenen Strichende bewirkt nichts außer
dem Pulsieren.

## 3. Grafik

Bühne **900 × 640** wie alle Spiele, Sicht/Skalierung aus `autogramme/zeichnen.ts:31-36`
übernehmen. Farben aus `verein.farben` (`content/typen.ts:39`).

```
0  ┌──────────────────────────────────────────────────────────────────┐ 900
   │ Himmel                                                           │
40 │  ┌──────────────── Anzeigetafel (Rahmen: farben.primaer) ──────┐ │
   │  │  dunkle Tafelfläche, LED-Raster angedeutet                  │ │
   │  │                                                             │ │
   │  │    ╎ ●→       ┌─┐    ┌─┐    ┌──                             │ │
   │  │    ╎  ╲       │ │    │ │      ╱      Schablone gestrichelt  │ │
   │  │    ╎          └─┘    └─┘     ╱       aktiver Strich hell    │ │
   │  │    ╎          ┌─┐    ┌─┐    ╱        geschafft = leuchtend   │ │
   │  │    ╎          └─┘    └─┘   ╱                                 │ │
   │  └─────────────────────────────────────────────────────────────┘ │
380│ ▓▓▓▓▓▓▓▓ Tribüne, flächig in primaer/sekundaer ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
470│ ═══════════ Laufweg ═══════════════════════════════════════════  │
   │   ⚑ Fahne   ☺ ☺ ☺ ☺ ☺   Besuchergruppe („Warte!" als Blase)    │
640└──────────────────────────────────────────────────────────────────┘
```

- **Tafel** `TAFEL = { x: 50, y: 40, b: 800, h: 330 }`. Schriftfeld innen 720 px breit.
- **Glyphen**: Höhe je Stufe (Abschnitt 6), Breite 0,6 × Höhe, Abstand 0,3 × Höhe. Passt das
  Wort nicht, wird die Höhe verkleinert: `h = Math.min(hoeheStufe, 720 / (n * 0.9))` (6 Zeichen
  auf Stufe 1 → 133 px).
- **Besucher**: 4 zu Beginn, höchstens 10; Kreis-Kopf + Rumpf, Schal abwechselnd in primaer und
  sekundaer. Die Gruppe steht unten bei `y = 520`; ihre x-Position folgt dem Wortfortschritt
  (`80 + fortschritt * 740`), mit begrenzter Laufgeschwindigkeit — daraus entsteht die sichtbare
  Lücke bei zu schnellem Tempo ganz von selbst.

**Zeichenreihenfolge** (`zeichnen.ts`): Hintergrund in Canvas-Koordinaten (Himmel/Rasen wie
`autogramme/zeichnen.ts:54-61`) → Tribüne → Tafel → Schablone (offen: grau gestrichelt; aktiver
Strich: weiß gestrichelt + Startpunkt) → geschaffte Strichstücke (leuchtend, primaer aufgehellt;
im Takt *und* Druck im Band: volle Leuchtkraft, sonst 50 %) → Bens Tintenspur → Fahne an der
Stiftspitze → Besucher + Sprechblase → Jubel/Wechsel-Überblendung.

**Sofortfeedback < 100 ms (A1)**, alles im nächsten Bild (≤ 17 ms):

| Kanal | Reaktion | Latenz |
|---|---|---|
| Tinte | Strich unter dem Stift, **Breite 3 + 7 × Druck** (Bühnen-px) — ungleichmäßiger Druck ist als ungleichmäßige Linie sichtbar, ohne Extra-Anzeige | 1 Bild |
| Schablone | Strichstück leuchtet auf, sobald es nachgespurt ist | 1 Bild |
| Fahne | Neigung kontinuierlich aus der Momentangeschwindigkeit (weht nach hinten bei schnell) — schwellenlos, darum sofort | 1 Bild |
| Ton | „Pling" je fertigem Zeichen, Tonhöhe steigt im Wort; Applaus (gefiltertes Rauschen, 0,8 s) am Wortende | < 30 ms |
| Partikel | 8–12 Funken in primaer nur beim fertigen Zeichen, 0,4 s Lebensdauer | 1 Bild |
| Besucher | Zustand im Takt / zu schnell / zu langsam | **bewusst gedämpft**, ~250–600 ms |

Die Besucher sind eine **zusammenfassende** Rückmeldung über ein Zeitfenster und werden absichtlich
geglättet: ein Zustand, der bei jeder Ecke eines Buchstabens umspringt, flackert (gegen A2) und
bestraft das natürliche Abbremsen an Ecken. Die A1-Rückmeldung je Teilbewegung leisten Tinte,
Schablone und Fahne. Diesen Satz so in den Bericht übernehmen, sonst wirkt die Dämpfung wie ein
A1-Verstoß.

**Reizarm (A2):** keine Zahl, kein Balken, keine Stationsnummer. Außerhalb der Schablone wird die
Tinte **grau**, nicht rot — rot ist ein Fehlersignal (C2). Kein Knopf im Canvas (siehe
Abschnitt 9: jeder Tipp landet in den Rohdaten).

## 4. Datenerfassung

**Kernfelder** (`engine/segmente.ts:39-72`), alle im Browser **unmaßgeblich**:

| Feld | Berechnung in `welt.ts` |
|---|---|
| `vollstaendigkeit` | `(stationenFertig + anteilLaufendesWort) / stationenBegonnen` — Muster aus `autogramme/welt.ts:214-221` |
| `genauigkeit` | Anteil der Stiftproben im Korridor der aktiven Schablone (Pfadtreue, vergleichbar mit Linie/Aufwärmen). Treibt die Sterne im Lob (`App.tsx:257`) |
| `druckMittel` / `druckStreuung` | `druckKennzahlen(w.druckWerte)` (`eingabe.ts:59`) |
| `eingabegeraet`, `synthetischerDruck` | wie alle Spiele über `geraetVon`/`druckVon` (`eingabe.ts:44-50`) |
| `stufe` | fest aus den Props, nie nachgeregelt |
| `abgebrochen` | `false` bei Zeitende; Abbruch setzt die Engine |

**`extra`-JSON:**

```json
{
  "woerter": ["1887", "RAUTE", "57000"],
  "stationenFertig": 7,
  "stationenBegonnen": 8,
  "gespurteStriche": 41,
  "anteilImTakt": 0.62,
  "anteilZuSchnell": 0.25,
  "anteilZuLangsam": 0.13,
  "anteilDruckImBand": 0.81,
  "besucher": 9,
  "verkrampfungsHinweise": 1,
  "vorgaben": { "toleranz": 22, "zielTempo": 110, "tempoBand": 0.3,
                "druckBand": 0.10, "mindestTakt": 0.7, "glyphHoehe": 110 }
}
```

`woerter` sagt Thomas, *was* Ben gespurt hat (der Verein wechselt den Content). `vorgaben` friert
die tatsächlich wirksamen Werte ein — wichtig, sobald B1-Werte über die Stufe hinaus wirken
(Abschnitt 6). Die Anteile sind Zeitanteile der Stift-unten-Zeit ohne Anlaufphase.

**Was C# rechnet.** Die Schablone kennt der Server nicht, und die Rohdaten liegen in
Bildschirmkoordinaten des `SpielScreen` (`screens/SpielScreen.tsx:17-19`) — Pfadtreue ist dort
also **nicht** maßgeblich berechenbar. Das ist hier kein Verlust: Kern dieses Spiels sind Tempo
und Druck, und beides steht vollständig in `t`/`druck` der Punktfolge.

Bestehende Kennzahlen (`Kennzahlen.cs:11-20`) taugen nur eingeschränkt: `TempoStreuung` ist die
Standardabweichung von **Einzelabtastungs-Geschwindigkeiten** (`Kennzahlen.cs:85`) — bei 60 Hz
dominiert Abtastrauschen, und der Wert hat die Einheit px/s des jeweiligen Bildschirms. Ein iPad
und ein Laptop sind damit nicht vergleichbar, ein schnelleres Kind hat automatisch mehr Streuung.

Vorschlag: zwei neue Felder in `Kennzahl`, für **alle** Spiele (reine Funktion der Rohdaten):

**`TempoVk` — Variationskoeffizient des Tempos, einheitenlos.**

```
Striche  = Punktfolge, getrennt an Druck = 0 (das ist schon die Absetzer-Logik, Kennzahlen.cs:72)
je Strich: verwerfe die ersten 150 ms (Anlauf); Strich kürzer als 300 ms → überspringen
           teile in Fenster zu 100 ms; v_f = Weglänge im Fenster / Fensterdauer
TempoVk  = Streuung(alle v_f) / Mittel(alle v_f)
```

Fenster statt Einzelabtastung glättet das Rauschen; Division durch das Mittel macht den Wert
unabhängig von Bildschirmgröße und Grundtempo. Richtwert ohne Validierung: < 0,3 gleichmäßig,
> 0,6 sprunghaft — Thomas' Maßstab ist Bens eigener Verlauf, keine Norm.

**`DruckSchwankung` — mittlere Streuung des Drucks *innerhalb* eines Strichs.**

```
je Strich mit ≥ 12 Abtastungen (≈ 200 ms): verwerfe je 6 Abtastungen am Anfang und Ende
           (An- und Abschwellen beim Aufsetzen/Abheben); σ_s = Streuung(druck)
DruckSchwankung = Σ(σ_s · n_s) / Σ n_s
```

Die bestehende `DruckStreuung` mischt Unterschiede *zwischen* Strichen und die Aufsetzrampen hinein;
„gleichmäßig drücken" heißt aber: innerhalb eines Strichs konstant. Bei `SynthetischerDruck` ist
der Wert 0 und bedeutungslos — die Therapeuten-App blendet ihn dann aus, wie sie es für die
Druckspalten schon tut (`apps/therapeut/src/screens/Verlauf.tsx:87`).

Weil `Kennzahlen.Berechne` beim **Lesen** läuft (`Endpunkte/Bericht.cs:91`, `:136`), gelten beide
Kennzahlen sofort auch für alle alten Sessions — **keine EF-Migration nötig**. Anpassen:
`Kennzahl`-Record, `Mitteln` (`Bericht.cs:229`), Typ `Kennzahl` in `apps/therapeut/src/api.ts:55`,
zwei Spalten in `Verlauf.tsx` und im Bericht.

Optional später: **Zusatzabsetzer** = `Absetzer − extra.gespurteStriche` (Abheben mitten im Strich;
`gespurteStriche` ist eine Inhaltszahl, keine Messung, darf also aus dem Browser kommen).

**Was Thomas liest:** im Verlauf, gefiltert auf „Stadionführung", sinkt `TempoVk` → Ben führt
gleichmäßiger; sinkt `DruckSchwankung` → stabilerer Druck; `DruckMittel` hoch und
`verkrampfungsHinweise` > 0 → Hinweis auf Verkrampfung (B3). Im Wochenbericht fließt das Spiel in
die Kategorien `schreiben` und `druckdosierung` ein. Mit C3: Smiley „ging gut" bei hohem `TempoVk`
ist ein Gesprächsanlass.

**Fallstricke**
- **Maus-Fallback:** Tastaturdruck ist konstant → Druck ist immer „im Band", das Spiel wird trivial.
  `synthetischerDruck` ist Pflicht; Mauswerte nie mit Pencil-Werten vergleichen (`eingabegeraet`).
- **Stufe und Vorgaben mitspeichern** (Kern bzw. `extra.vorgaben`), sonst sieht ein engeres
  Tempoband wie eine Verschlechterung aus.
- **Browser-Anteile sind unmaßgeblich** — `anteilImTakt` steuert nur Besucher; Kommentar wie
  `autogramme/welt.ts:206-210`.
- **Wortabhängigkeit:** Ecken bremsen natürlich; „MEHR" hat mehr Ecken als „SOS". Vergleichbar
  ist nur dieselbe Wortfolge — deshalb feste Reihenfolge der Fakten.

## 5. Spielspaß

- **Rhythmus:** eine Station dauert 15–25 s — kurz genug für die Aufmerksamkeitsspanne, jedes Wort
  ist ein abgeschlossenes Erfolgserlebnis. Zwischen Stationen 1,8 s Wechsel = Mikropause (B3).
- **Belohnung:** leuchtende Tafel (das Wort „gehört" Ben), Pling-Leiter im Wort, Applaus, eine
  **wachsende Gruppe** — sichtbarer Fortschritt im Spiel ohne Zahl (A2, C4-Geist).
- **Überraschung:** jede neue Tourrunde bringt eine andere Gruppe (Schulklasse, Familie mit Hund,
  Fans mit Fahnen — drei Varianten in `zeichnen.ts`, gleiche Mechanik).
- **Steigerung im Spiel:** bewusst **keine** — die Stufe bleibt fest (gleicher Grundsatz wie
  `rasenmaehen/welt.ts:81-84`). Steigerung kommt aus Wortlänge und Formenvielfalt der Fakten.
- **Abwechslung (B3):** Wörter mischen Geraden (`1`, `H`, `T`) und Bögen (`O`, `8`, `S`).
- **Vereinsbezug (Leitidee):** echte Stadionfakten, Vereinsfarben an Tafel und Schals; beim HSV
  Raute, Dino Hermann, Volkspark.
- **Lob (C5):** das Lob nach dem Spiel macht der Profi über das bestehende `lob`-Segment. Im Spiel
  spricht nur der Stadionsprecher (Fakten) — eine zweite lobende Stimme im Spiel wäre zu viel Reiz.

**Kein Game Over (C2) — kritische Prüfung.** Die Ursprungsidee „zu schnell oder zu langsam, und die
Besucher gehen" **verstößt gegen C2**: weglaufende Besucher sind ein Verliererzustand und zudem
sozialer Liebesentzug — für ein Kind mit ADHS, das Ablehnung oft erlebt, genau die falsche
Botschaft. Entschärfung:

1. Besucher **gehen nie**. Zu schnell: Gruppe bleibt zurück, eine Blase „Warte!", sie holt auf,
   sobald Ben langsamer wird. Zu langsam: die Besucher schauen sich neugierig um (zeigen auf die
   Tribüne) — neutral, eher niedlich.
2. Tempo **blockiert nie den Fortschritt** (die eine Regel). Jedes Wort wird fertig.
3. Belohnung nur additiv: ein neuer Fan bei ausreichendem Taktanteil, die Gruppe schrumpft nie.
4. Keine Fehlertöne, keine rote Tinte.

Restrisiko: ein Kind, das nie den Mindestanteil schafft, sieht nie einen neuen Fan. Deshalb ist
Stufe 1 breit (±60 %, Mindestanteil 50 %); trotzdem nach dem ersten echten Test prüfen.

## 6. Schwierigkeit und Einstellungen (B1)

Alle Werte sind **Startwerte, keine Messwerte** — mit echtem Pencil auf dem Zielgerät nachziehen.

| Parameter (`welt.ts`) | Formel | Stufe 1 | Stufe 2 | Stufe 3 |
|---|---|---|---|---|
| Glyphenhöhe (Bühnen-px) | `max(90, 170 - 20*s)` | 150 | 130 | 110 |
| Toleranz, halbe Korridorbreite | `max(12, 40 - 6*s)` | 34 | 28 | 22 |
| Zieltempo (Bühnen-px/s) | `110 * zielgeschwindigkeit` | 110 | 110 | 110 |
| Tempoband (± relativ) | `max(0.25, 0.75 - 0.15*s)` | ±60 % | ±45 % | ±30 % |
| Druckband (± um eigenes gleitendes Mittel) | `max(0.08, 0.25 - 0.05*s)` | ±0,20 | ±0,15 | ±0,10 |
| Mindest-Taktanteil für neuen Fan | `min(0.8, 0.4 + 0.1*s)` | 50 % | 60 % | 70 % |

Feste Konstanten: `SPRUNG = 30` px (größere Sprünge auf der Schablone werden nicht angenommen —
kein Abkürzen), `GREIF = 1.5 * toleranz` (Aufsetzen am offenen Strichende), `ENDE = 0.97`
(Strich fertig), `FENSTER_MS = 250` (Tempomessung), `ANLAUF_MS = 250` (nach dem Aufsetzen neutral),
`ZU_SCHNELL_MS = 150`, `ZU_LANGSAM_MS = 600` (Haltezeiten bis der Besucherzustand umspringt —
asymmetrisch, weil Abbremsen an Ecken richtig ist, impulsives Hetzen der therapeutisch relevante
Befund), `VERKRAMPFT = 0.85` für 1,5 s (Hinweis „Ganz locker halten", höchstens einmal je Station).

Stufe 3 = 110 px ≈ 2,3 cm auf einem 11-Zoll-iPad — nahe an der Schreibgröße der 1./2. Klasse.
Das Zieltempo ändert sich bewusst nicht mit der Stufe: höher heißt *gleichmäßiger*, nicht
*schneller*.

**Druckband relativ zum eigenen Mittel:** gemessen wird Konstanz, nicht Höhe. Die absolute Höhe ist
die Aufgabe von „Platzwart" (`rasenmaehen/welt.ts:52-63`); so überschneiden sich die beiden
Druckspiele nicht. Gleitendes Mittel: exponentiell, τ = 1 s, beim Aufsetzen neu gestartet.

**Befund zu B1, projektweit:** `Toleranz`, `Zielgeschwindigkeit` und `Mindesttrefferquote` stehen
in der DB (`Daten/Entitaeten.cs:127-130`) und kommen bis in `SpielEinstellung`
(`engine/tagesplan.ts:11-20`), aber das Spielsegment trägt nur `stufe` (`tagesplan.ts:196`) und
`SpielProps` auch (`spiele/index.ts:18-33`). **Kein Spiel wertet sie heute aus** — Thomas stellt sie
ein, und nichts passiert. Dieses Spiel ist der natürliche Ort für alle drei:
Toleranz → Korridorfaktor, Zielgeschwindigkeit → Faktor auf 110 px/s, Mindesttrefferquote →
Mindest-Taktanteil. Vorschlag in zwei Schritten: (a) Spiel nur mit `stufe` bauen (keine fremden
Dateien); (b) separater kleiner PR: `Segment 'spiel'` und `SpielProps` um
`vorgaben?: { toleranz; zielgeschwindigkeit; mindesttrefferquote }` erweitern, `welt.ts` multipliziert
die Stufenwerte damit. Die wirksamen Werte stehen dann in `extra.vorgaben`.

## 7. Content-Bedarf

`fakten: string[]` (`content/typen.ts:47`) reicht nicht — das Spiel braucht das Schlüsselwort.
Neues Format, **bewusst brechend**, damit jeder Verein beim Bauen auffällt statt mit leerem Wort zu
laufen (Prinzip aus `typen.ts:1-7`):

```ts
/** Ein Stadionfakt für die Stadionführung. Wird vorgelesen (A5). */
export type Fakt = {
  /** Höchstens 10 Wörter, kindgerecht. Das `wort` kommt darin vor. */
  text: string
  /** Was Ben nachspurt: 2–6 Zeichen, nur A–Z und 0–9 (keine Umlaute, kein Punkt). */
  wort: string
  audio?: string
}
// in Verein:
fakten: Fakt[]
```

Regeln, geprüft per vitest (nicht per Typ, weil Strings): jedes Zeichen jedes `wort` hat eine Glyphe;
Länge 2–6; mindestens 5 Fakten je Verein. „57.000" wird `57000` — ein Punkt wäre ein Tupfer und
erzeugt nur einen Absetzer.

**Beispiel HSV** (alle Fakten vor der Abgabe gegenprüfen):

```ts
fakten: [
  { text: 'Der HSV wurde 1887 gegründet.', wort: '1887' },
  { text: 'Das Wappen des HSV ist eine Raute.', wort: 'RAUTE' },
  { text: 'Das Volksparkstadion fasst 57000 Zuschauer.', wort: '57000' },
  { text: 'Das Maskottchen ist Dino Hermann.', wort: 'DINO' },
  { text: 'Hier wurde 2006 bei der WM gespielt.', wort: '2006' },
  { text: 'Der HSV gewann 1983 den Europapokal.', wort: '1983' },
],
```

Den bisherigen Fakt zur Stadionuhr („zählt seit 2001 die Jahre in der Bundesliga", `hsv.ts:41`)
**prüfen**: die Bundesliga-Uhr lief nur bis zum Abstieg 2018 und ist nach meinem Kenntnisstand
umgestellt bzw. abgebaut — so ist der Satz vermutlich falsch.

Mitzuziehen: `ajax.ts:32` (nur 2 Fakten, braucht 3 mehr, z. B. `DACH`, `1900`) und **`koeln.ts` auf
dem Branch `origin/aufwaermen-parcours`** (4 Fakten als Strings) — Merge-Konflikt absehbar, mit dem
Besitzer des Branches absprechen.

**Glyphen ohne Bibliothek** (`spiele/stationentour/buchstaben.ts`): eine selbst geschriebene
**Einstrich-Schrift** (Mittellinien, keine Umrisse — `fillText` liefert nur Umrisse und taugt zum
Nachspuren nicht). Je Zeichen eine Liste von Strichen in **Schreibreihenfolge und
Schreibrichtung**, Punkte im Kasten 0–0,6 × 0–1, y nach unten; Bögen per Helfer:

```ts
type Strich = Punkt[]
const bogen = (cx: number, cy: number, rx: number, ry: number, von: number, bis: number): Strich =>
  Array.from({ length: 13 }, (_, i) => {
    const a = ((von + ((bis - von) * i) / 12) * Math.PI) / 180
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }
  })
const L = (...z: number[]): Strich => z.flatMap((_, i) => (i % 2 ? [] : [{ x: z[i], y: z[i + 1] }]))

export const GLYPHEN: Record<string, Strich[]> = {
  '1': [L(0.1, 0.3, 0.4, 0, 0.4, 1)],
  '0': [bogen(0.3, 0.5, 0.3, 0.5, -90, -450)],        // oben beginnen, gegen den Uhrzeigersinn
  H: [L(0, 0, 0, 1), L(0.6, 0, 0.6, 1), L(0, 0.5, 0.6, 0.5)],
  T: [L(0, 0, 0.6, 0), L(0.3, 0, 0.3, 1)],
  // … A–Z, 0–9: 36 Zeichen, ≈ 1–3 Zeilen je Zeichen
}
```

Falle: mit y nach unten läuft ein steigender Winkel im Uhrzeigersinn — daher `-90 → -450`.

## 8. Umsetzung

| Datei | Inhalt | Zeilen ca. | Vorbild |
|---|---|---|---|
| `spiele/stationentour/buchstaben.ts` | Einstrich-Glyphen A–Z, 0–9, `bogen`, `L`, `legeWortAus(wort, hoehe)` → Striche in Bühnenkoordinaten | 130 | — |
| `spiele/stationentour/welt.ts` | Zustand, Nachspuren, Tempo-/Druckzustand, Besucher, Stationen, `ergebnis` | 320 | `aufwaermen/welt.ts` (`aufBahn`, `punktAuf` für Polylinien), `autogramme/welt.ts` (Ergebnis) |
| `spiele/stationentour/zeichnen.ts` | Tafel, Schablone, Tinte, Fahne, Besucher, Tribüne | 260 | `autogramme/zeichnen.ts` (Sicht, `rundRect`, Hintergrund) |
| `spiele/stationentour/index.tsx` | Canvas, Eingabe, Bildschleife, Vorlesen der Fakten | 160 | `autogramme/index.tsx` fast 1:1 |
| `spiele/stationentour/klang.ts` | Pling, Applaus | 60 | `ballhochhalten/klang.ts` (`ton`, `weckeKlang`) |
| `spiele/stationentour/welt.test.ts` | s. u. | 260 | `autogramme/welt.test.ts` |
| `spiele/index.ts:46` | `stationentour: Stadionfuehrung` | +2 | |
| `content/typen.ts`, `vereine/*.ts` | `Fakt`-Typ, Content | +10 / je ~10 | |
| `api/Auswertung/Kennzahlen.cs` (+ Tests) | `TempoVk`, `DruckSchwankung` | +60 / +70 | `KennzahlenTests.cs` |

**Ein Unterschied zu den bestehenden Spielen:** `schreibe(w, x, y, druck, tMs)` bekommt den
**Zeitstempel des Ereignisses** (`PointerEvent.timeStamp` je `feinEreignis`). `zeitGesamt` aus
`aktualisiere` hat nur Bildauflösung — alle gebündelten Pencil-Ereignisse eines Bildes hätten
dieselbe Zeit, und die Geschwindigkeit wäre Unsinn. Im Test werden Zeiten einfach mitgegeben.

**Nachspuren (Kern von `welt.ts`):** aktiver Strich als Polylinie; `aufBahn` liefert `t` und
`abstand`. Angenommen wird ein Punkt, wenn `abstand ≤ toleranz` **und**
`(t − fortschritt) · strichLaenge ≤ SPRUNG`; dann `fortschritt = max(fortschritt, t)` (monoton wie
`linie/welt.ts:12-13`). Aufsetzen gilt nur innerhalb `GREIF` um `punktAuf(strich, fortschritt)`.
Bei `fortschritt ≥ ENDE` nächster Strich; liegt dessen Start innerhalb `GREIF`, geht es ohne
Abheben weiter.

**Tempo:** Ringpuffer der Stift-unten-Proben der letzten `FENSTER_MS`; `v = Weg / Zeit`. Zustand
`anlauf | imTakt | zuSchnell | zuLangsam` mit den Haltezeiten aus Abschnitt 6. Zeitanteile je
Zustand werden aufsummiert (für `extra` und den Fan-Bonus).

**`index.tsx`, Vorlesen:** `vorlesen()` bricht laufende Sprache ab (`ui/vorlesen.ts:10`). Der
erste Fakt darf also erst sprechen, wenn die Anweisung des `SpielScreen` fertig ist — erst wenn
`!speechSynthesis.speaking`, spätestens nach 5 s. Ben darf währenddessen schon spuren (Warten ist
für ADHS das Schwerste).

**Testfälle `welt.test.ts`:**

1. Content: jedes Zeichen jedes `fakt.wort` aller Vereine hat eine Glyphe; Wortlänge 2–6; ≥ 5 Fakten.
2. Glyphen: alle Punkte im Kasten 0–0,6 × 0–1; jeder Strich ≥ 2 Punkte; „0" beginnt oben.
3. Auslegen: ein 6-Zeichen-Wort passt auf Stufe 1 in die Tafel.
4. Fortschritt wächst nur im Korridor; Proben außerhalb zählen in die Genauigkeit, nicht in den Fortschritt.
5. Kein Abkürzen: ein Sprung > `SPRUNG` entlang des Strichs wird nicht angenommen.
6. Aufsetzen fern vom offenen Strichende startet nichts.
7. Absetzen mitten im Strich, wieder aufsetzen → es geht an derselben Stelle weiter (C2).
8. Strich → Zeichen → Wort fertig → nach `WECHSEL_SEK` nächste Station; nach dem letzten Fakt wieder der erste (Endlos).
9. Tempo: konstant 110 px/s → `imTakt`; 330 px/s → `zuSchnell` erst nach 150 ms; Stillstand → `zuLangsam` erst nach 600 ms; erste 250 ms → `anlauf`.
10. **C2:** ein Wort, durchgehend zu schnell gespurt, wird trotzdem fertig.
11. Druck: konstant 0,5 → im Band; Sprung auf 0,9 → außer Band; > 0,85 für 1,5 s → genau ein Hinweis je Station.
12. Besucher: Taktanteil ≥ Mindestanteil → +1; darunter → unverändert, **nie weniger**; Obergrenze 10.
13. Synthetischer Druck setzt `synthetischerDruck`.
14. Ergebnis: Kernfelder in 0–1, `extra.woerter` in Reihenfolge, `stufe` unverändert.

**C#-Tests (`KennzahlenTests.cs`):** konstantes Tempo → `TempoVk ≈ 0`; abwechselnd 100 ms langsam /
schnell → `TempoVk > 0,4`; derselbe Strich doppelt so schnell → **gleicher** `TempoVk`
(Einheitenfreiheit); konstanter Druck mit An-/Abschwellrampe → `DruckSchwankung ≈ 0`;
Druck 0 trennt Striche.

**Arbeitsteilung:** Spielordner allein; `typen.ts` + Vereine, `Kennzahlen.cs` und der B1-PR sind
jeweils eigene Commits mit Absprache (Content-Besitzer, Server-Besitzer). Keine EF-Migration.

## 9. Risiken und offene Fragen

**Technisch**
- **Handschrift ist nicht auslesbar** — gelöst durch Nachspuren einer bekannten Schablone; bewertet
  wird Geometrie (Korridor) und Bewegung (Tempo, Druck), nie „welcher Buchstabe ist das".
- **Selbstgebaute Schrift:** 36 Glyphen von Hand sind Fleißarbeit, Fehler in der Strichrichtung
  fallen nur im Test oder beim Spielen auf. Eine Druckseite aller Glyphen mit Startpunkten erzeugen
  und Thomas einmal abnehmen lassen.
- **Tipps im Canvas landen in den Rohdaten** (`SpielScreen.tsx:115-126` zeichnet jedes Zeigerereignis
  auf, Abheben = Druck 0) und erhöhen `Absetzer`. Deshalb kein Wiederholen-Knopf im Spiel.
- **Vorlesen kollidiert** mit der Anweisung (s. o.).
- **Tempo in Bühnen-px/s** hängt von der Bildschirmgröße ab — für die Spielmechanik akzeptiert
  (Toleranz bleibt laut CLAUDE.md einheitenlos), für die Auswertung durch `TempoVk` umgangen.
- `Kennzahl` erweitern ändert den handgeschriebenen Vertrag in `apps/therapeut/src/api.ts`.

**Therapeutisch (mit Thomas klären)**
- **Nachspuren ≠ freies Schreiben.** Es trainiert Formführung, Strichrichtung, Tempo- und
  Druckkontrolle, nicht den Abruf der Buchstabenform. Das freie Schreiben bleibt bei
  „Autogrammstunde"/„Startelf".
- **Welche Schrift?** Großbuchstaben (Blockschrift) sind am einfachsten zu bauen; Ben lernt in der
  Schule evtl. Grundschrift mit Kleinbuchstaben. Falsche Strichfolge übt falsche Gewohnheiten ein.
- **Zieltempo 110 px/s** (≈ 2–2,5 cm/s) ist geschätzt; ggf. aus den ersten Sitzungen ableiten.
- Asymmetrische Haltezeiten (zu schnell 150 ms, zu langsam 600 ms) bewerten Hetzen strenger als
  Trödeln — therapeutisch gewollt? Thomas fragen.

**Konflikte mit CLAUDE.md**
- Ideensammlung „Fakten nachschreiben … und die Besucher gehen": **beides geändert** — nur das
  Schlüsselwort, nachgespurt; Besucher gehen nie (C2). Im Bericht begründen.
- Katalog-Anweisung `katalog.ts:70` passt nicht mehr (s. Abschnitt 1).
- Content-Format `fakten` ändert sich (Leitidee erlaubt das ausdrücklich: „Das Content-Format muss
  das tragen"), bricht aber `koeln.ts` auf einem offenen Branch.
- B1-Parameter werden projektweit nicht ausgewertet (Abschnitt 6) — kein Konflikt dieses Spiels,
  aber eine Lücke gegenüber LN1, die hier sichtbar wird.

## 10. Anforderungs-Check

| ID | Status | Begründung |
|---|---|---|
| A1 | erfüllt | Tinte, Schablone, Fahne, Pling im nächsten Bild; Besucher bewusst gedämpft (Begründung Abschnitt 3) |
| A2 | erfüllt | keine Zahl/Balken, eine Tafel, eine Gruppe; Besucherzustand geglättet gegen Flackern |
| A3 | erfüllt | zeitbasiert über den Timer des `SpielScreen`; Inhalt wiederholt sich endlos |
| A4 | erfüllt | nur Pling und Applaus, über `tonLautstaerke()`; keine Fehlertöne |
| A5 | betroffen | eine Anweisung + Fakt je Station vorgelesen; Fakt ist Inhalt, nicht zweite Aufgabe — Fakttext ≤ 10 Wörter, nicht dauerhaft eingeblendet |
| B1 | Risiko | Stufe wirkt; Toleranz/Zielgeschwindigkeit/Mindesttrefferquote erst mit dem Schnittstellen-PR (projektweite Lücke) |
| B2 | erfüllt | 5. Minispiel: Grafomotorik (`schreiben`) + Kraftdosierung (`druckdosierung`) |
| B3 | erfüllt | Mikropause je Station, wechselnde Formen, Verkrampfungshinweis bei > 0,85 Druck |
| B4 | erfüllt | Aufzeichnung durch `SpielScreen`; neue Kennzahlen `TempoVk`, `DruckSchwankung` aus der Punktfolge |
| C1 | erfüllt | Stadionführung mit Besuchern |
| C2 | betroffen → gelöst | Ursprungsidee verstieß („Besucher gehen"); jetzt: kein Verlust, Tempo blockiert nie, Bonus nur additiv |
| C3 | erfüllt | unverändert; Taktanteil vs. Smiley als Gesprächsgrundlage für Thomas |
| C4 | erfüllt | wachsende Gruppe/leuchtende Tafel im Spiel, keine Prozente im Kindmodus |
| C5 | erfüllt | Lob über das bestehende Segment; im Spiel nur Stadionsprecher |
| C6 | erfüllt | Fakten wechseln mit dem Verein |
| D2 | erfüllt | Tracking unsichtbar; Ben sieht nur Besucher und Tafel |
| D4 | erfüllt | nur Content-Wörter in `extra`, keine Bilder, keine Personendaten |
