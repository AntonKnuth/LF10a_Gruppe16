# Spielkonzept: Abschiedsgeschenk — die Urkunde (`abschiedsgeschenk`)

Stand: 13.11.2026 · Rolle `sonder` · Tag `schreiben` · heute: `Platzhalter`

> **Festgelegt vom User (13.11.2026):**
> - Das Abschiedsgeschenk ist eine **Urkunde**.
> - Ben unterschreibt sie **auf dem Tablet** mit seinem **Spielnamen**.
> - **Thomas druckt sie** in der Therapeuten-App aus.
>
> Diese Datei ersetzt den früheren Entwurf (Fan-Plakat auf Papier, Foto-Upload).

## 1. Kurzfassung

Am letzten Tag bei einem Verein überreicht der Profi Ben eine **Urkunde „Probetraining
bestanden"** in den Vereinsfarben. Ben unterschreibt sie mit dem Stift auf der
Unterschriftslinie, mit seinem Spielnamen („Benno"). Nach der Smiley-Frage unterschreibt der
Profi daneben und drückt den Vereinsstempel darauf. Die Unterschrift wird wie jede Übung als
Rohdaten-Punktfolge aufgezeichnet.

- **Thomas** bekommt alle fünf Trainingstage eine Schreibprobe unter **immer derselben
  Aufgabe**. Er kann die Urkunde in der Therapeuten-App drucken; Bens Unterschrift wird dabei
  aus den Rohdaten gezeichnet.
- **Ben** bekommt etwas zum Anfassen, das er sammeln kann: je Verein eine Urkunde.

Dafür braucht es **keine Kamera, keinen Bild-Upload, keine Migration und keine neue Tabelle.**
Damit entfällt der Konflikt mit „Bild-Upload der Arbeitsproben — nicht bauen" (CLAUDE.md).

Vorgeschlagener Katalogeintrag (`apps/web/src/spiele/katalog.ts:98-103`):

```ts
abschiedsgeschenk: {
  titel: 'Urkunde',
  anweisung: 'Unterschreibe deine Urkunde mit deinem Spielnamen.',
  rolle: 'sonder',
  tags: ['schreiben'],
},
```

Die ID bleibt `abschiedsgeschenk`. Sie steht schon in `Spielkatalog.cs:44`, in
`SpielkatalogTests.cs` und in den Einstellungen; eine Umbenennung brächte nichts.

## 2. Spielidee und Ablauf

**Fußballhandlung (C1):** Nach einem Probetraining bekommt man im Verein eine Bescheinigung. Für
Ben ist das der Abschluss der fünf Tage. Der Profi, mit dem er trainiert hat, übergibt sie, und
beide unterschreiben, Spieler und Trainer.

**Abgrenzung zur Autogrammstunde:** Auch dort schreibt Ben seinen Namen. Die Unterschiede:

| | Autogrammstunde (`autogramme/welt.ts:5-9`) | Urkunde |
|---|---|---|
| Wie oft | viele Trikots hintereinander, auf Menge | **eine** Unterschrift, auf Sorgfalt |
| Wo | Feld mitten auf dem Trikot, kein Linienbezug | auf einer **Schreiblinie mit Lineatur** wie im Schulheft |
| Wann | in jeder Einheit möglich | einmal je Verein, also alle 5 Tage |
| Aussage für Thomas | Feinführung in kleinem Feld (Pinzettengriff) | **Längsschnitt**: dieselbe Aufgabe unter denselben Bedingungen, Verein für Verein |

Gerade weil die Aufgabe immer gleich bleibt, ist sie für Thomas so wertvoll. Die anderen Spiele
wechseln ihre Muster (B3). Die Urkunde ist die eine feste Messstelle im Ablauf.

**Die eine Regel, aus der alles folgt:**
> *Eine Unterschrift, immer gleich gestellt. Bewertet wird nichts, was Ben sieht; Thomas liest
> sie aus den Rohdaten.*

Daraus folgt:
- Es gibt keine Korrektur und kein „lesbar/unlesbar". Handschrift lässt sich nicht auslesen,
  und das ist hier auch nicht nötig.
- Ben sieht keine Sterne und keine Note.
- Thomas bekommt Größe, Grundlinientreue, Tempo, Druck und Absetzer.

**Endbedingung:** Das Spiel endet, wenn der Inhalt erschöpft ist, also nach einer Unterschrift.
`zeitAbgelaufen` wird ignoriert (`spiele/index.ts:22-24`).

**Ablauf.** Der Zustand steht in `welt.ts` als `schritt`:

| Schritt | Was Ben sieht | Was Ben tut | Weiter mit |
|---|---|---|---|
| `uebergabe` | Der Profi hält die eingerollte Urkunde. Sie rollt sich auf und wächst auf Bildschirmgröße (0,8 s) | nichts | automatisch |
| `unterschreiben` | Urkunde mit der leuchtenden Unterschriftslinie „Spieler". Die Linie des Profis daneben ist noch leer | schreibt seinen Spielnamen | erster Strich fertig und 1,2 s Ruhe → die Knöpfe erscheinen |
| `pruefen` | die Urkunde mit Bens Unterschrift, groß der Knopf **„Fertig"**, klein „Nochmal" | tippt auf einen der beiden | „Fertig" → `abgabe`. „Nochmal" leert das Band und führt zurück zu `unterschreiben`, höchstens 2-mal |
| `abgabe` | Die Urkunde rollt sich ein und liegt beim Profi (0,6 s) | nichts | `onFertig` |

Danach geht es weiter wie in der normalen Segmentkette (`engine/tagesplan.ts`):
1. **Selbsteinschätzung (C3)**: „Wie gut ist deine Unterschrift geworden?" Die Frage kommt
   vor jedem Jubel.
2. **Lob, als Abschied gestaltet**: Die Urkunde liegt wieder offen. Der Profi unterschreibt
   seine Linie, das dauert 1,5 s und läuft von links nach rechts. Dann kommt der Stempel mit dem
   Wappen in Vereinsfarbe (0,3 s, mit einem dumpfen Ton). Dazu sagt der Profi
   `profi.abschied`.
3. **Fragebogen.** Das Sonderspiel steht ganz am Ende (`tagesplan.ts:161-163`), also endet
   der Verein mit der Urkunde.

**Warum Profi-Unterschrift und Stempel erst im Lob kommen:** Kämen sie vor der Smiley-Frage,
läse Ben die Feier als Urteil über seine Unterschrift, und die Selbsteinschätzung wäre verfälscht
(C3, CLAUDE.md „Frage → Lob → Ergebnis"). Im Spiel selbst bleibt die Urkunde deshalb neutral.

## 3. Grafik

Canvas 2D wie in den anderen Spielen: die Bühne ist 900×640 und wird mit `berechneSicht`
skaliert (Vorlage `autogramme/zeichnen.ts:33`). Ein Canvas ist hier richtig, weil Bens Strich
unter 100 ms erscheinen muss (A1).

```
SpielScreen-Kopf: [ Unterschreibe deine Urkunde mit deinem Spielnamen. ]   [▓▓▓░░] 3:12
┌──────────────────────────────────────────────────────────────────────────┐
│ ╔══════════════════════════════════════════════════════════════════╗     │
│ ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Band in Vereinsfarbe primär ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║ ___ │
│ ║                         U R K U N D E                            ║(o o)│
│ ║                                                                  ║/|#|\│
│ ║             Probetraining beim Hamburger SV                      ║ / \ │
│ ║                    5 Trainingstage geschafft                     ║Profi│
│ ║  ┌ Wappen ┐                                                      ║     │
│ ║  └───────┘   ··································   ______________  ║     │
│ ║              ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄                 ║     │
│ ║              ══════════════════════════════════   (Profi, leer)  ║     │
│ ║              Spieler                               Trainer       ║     │
│ ╚══════════════════════════════════════════════════════════════════╝     │
│                                 [   Fertig   ]       nochmal              │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Urkunde:** cremeweißer Grund (`#fffdf5`), doppelter Rahmen in `verein.farben.primaer`, oben
  ein Band in der Primärfarbe. Die Schrift ist dunkelgrau. Titel „URKUNDE" mit
  `tracking-widest`, darunter Vereinsname und „5 Trainingstage geschafft". Es gibt weder ein
  Datum noch Bens bürgerlichen Namen auf dem Tablet (D4).
- **Wappen:** ein Schild in Vereinsfarben, aus Pfaden gezeichnet. Vereinsassets sind Content
  (CLAUDE.md). Gibt es später ein Wappenbild im Vereinspaket, wird es nur hier eingesetzt.
- **Unterschriftsband (Spieler):** Breite 460 Bühnen-px, die Höhe hängt von der Stufe ab
  (Abschnitt 6). Die Lineatur ist in Schulheftfarben gehalten: Grundlinie kräftig, Hilfslinien
  hellblau und gestrichelt. Solange `unterschreiben` läuft, leuchtet das Band sanft in der
  Primärfarbe (Alpha 0,15, Puls 2 s). So weiß Ben, wo er schreiben soll, ohne dass ein Pfeil
  nötig ist.
- **Vorlage (je nach Stufe):** Auf Stufe 1 steht der Spielname hellgrau im Band zum
  Nachspuren. Auf Stufe 2 steht er klein über dem Band zum Abschauen. Auf Stufe 3 gibt es
  keine Vorlage. Die Schrift dafür ist eine Systemschrift (`bold 64px sans-serif`). Ausgewertet
  wird die Vorlage nicht, sie ist nur eine Hilfe.
- **Tinte und Sofortfeedback (A1):** Der Strich wird im selben Frame gezeichnet, in Dunkelblau
  wie ein Füller (`#1e3a8a`). Die Breite folgt dem Druck (2–5 px), wie in der Autogrammstunde,
  deren `zeichnen.ts` die Strichdarstellung vormacht. Beim Aufsetzen erscheint ein kleiner
  Tintenpunkt (3 Partikel, 200 ms). Mehr Partikel gibt es nicht: eine Unterschrift ist eine
  ruhige Aufgabe.
- **Ton (A4):** ein leises Kratzgeräusch je Strich-Anfang (Rauschimpuls 60 ms), beim Einrollen
  ein Rascheln. Beides geht über `tonAn()`, wie in `ballhochhalten/klang.ts`. Eine Fanfare gibt
  es erst im Lob.
- **Lob-Szene:** Die Profi-Unterschrift ist sein Name in `italic 48px cursive`, der hinter einer
  Maske von links nach rechts sichtbar wird (`ctx.save(); ctx.rect(...); ctx.clip()`, die Breite
  wächst über 1,5 s). Danach setzt der Stempel ein: ein Kreis mit Wappen, Skalierung 1,4 → 1,0,
  Rotation −12°, Alpha 0,85.
- **Reizarm (A2):** Auf dem Bildschirm sind Anweisung, Timer, Urkunde und ein bis zwei Knöpfe.
  Der Profi steht als Figur am Rand und ist nicht anklickbar.

**Zeichenreihenfolge** in `zeichnen.ts`: Himmel → Profi (`ProfiFigur`-Farben) → Urkunde
(Rahmen, Band, Texte, Wappen) → Lineatur → Vorlage → Bens Tinte → Partikel.

## 4. Datenerfassung

### 4a. SpielErgebnis

Die Rohdaten kommen wie bei jedem Spiel vom `SpielScreen`. **Das Spiel selbst enthält keine
Zeile Aufzeichnungscode** (CLAUDE.md, Spiel-Schnittstelle).

| Kernfeld | Wert | Begründung |
|---|---|---|
| `dauerMs` | aktive Zeit bis „Fertig", ohne Zeiten mit `angehalten` | Wie lange Ben für die Unterschrift brauchte |
| `vollstaendigkeit` | `1`, sobald die Tinte im Band mindestens 1,5 × Bandhöhe lang ist, sonst Anteil davon | Ein Punkt oder Häkchen ist keine Unterschrift |
| `genauigkeit` | **unmaßgeblich, nur Browser:** Anteil der Abtastungen mit Druck > 0 zwischen Ober- und Unterlinie des Bands | Grob, wird nie in einem Bericht verwendet (CLAUDE.md, zweistufige Auswertung) |
| `druckMittel`, `druckStreuung` | `druckKennzahlen()` wie in allen Spielen | |
| `eingabegeraet`, `synthetischerDruck` | wie in allen Spielen | Maus-Fallback bleibt markiert |
| `stufe` | aus dem Segment | Bestimmt Bandhöhe, Lineatur und Vorlage. **Ohne die Stufe sind zwei Urkunden nicht vergleichbar** |
| `abgebrochen` | `false`, außer der Abbruch kommt von außen | Im Spiel gibt es keinen Abbruchweg (C2) |

**`extra`** enthält alles, was die Druckvorlage und die C#-Auswertung brauchen, und nichts
Personenbezogenes:

```json
{
  "urkunde": {
    "vereinId": "hsv", "vereinName": "Hamburger SV", "profi": "Jonas",
    "primaer": "#0a3d91", "sekundaer": "#ffffff"
  },
  "band": { "x": 212.0, "y": 388.5, "breite": 511.1, "hoehe": 111.1 },
  "lineatur": "vier",
  "vorlage": "nachspuren",
  "neustartsMs": [8420.0],
  "fertigMs": 19870.0
}
```

- **`band`** steht in **denselben Koordinaten wie die Rohdaten**, also in CSS-Pixeln relativ zur
  `main`-Fläche des SpielScreens (`SpielScreen.tsx:56-66`). Das Spiel rechnet dafür seine
  Bühnenkoordinaten einmal beim Start mit der Sicht um, dazu kommt der Versatz des Canvas in
  `main`. Erst damit lassen sich die Rohdaten auf das Band beziehen, auf dem Bildschirm wie auf
  dem Papier.
- **`neustartsMs`** sind die Zeitpunkte, an denen Ben „Nochmal" getippt hat, auf der Uhr der
  Rohdaten (Segmentstart). **Maßgeblich ist der letzte Versuch:** Druckvorlage und C# nehmen nur
  Abtastungen mit `t ≥ max(neustartsMs)`. Die früheren Versuche bleiben trotzdem gespeichert.
  Für Thomas ist es ein Befund, wenn Ben zweimal neu anfängt.
- Der **Spielname steht nicht im `extra`**. Er liegt schon am Klienten (`Entitaeten.cs:40`), und
  auf der Urkunde steht ohnehin Bens Handschrift.

### 4b. Was C# daraus rechnet

**Ohne neuen Code:** Die vorhandenen Kennzahlen aus `Kennzahlen.cs` gelten sofort: Tempo, Zittern,
Druck und Absetzer. Das Ergebnis zählt im Wochenbericht ganz normal zur Kategorie `schreiben`,
denn es ist eine echte Messung. Der frühere Vorschlag, Sonderspiele aus dem Bericht zu filtern,
entfällt.

**Neu und optional:** `Auswertung/Unterschrift.cs`, etwa 60 Zeilen. Diese Datei liest als erste
auf dem Server das `extra` aus; dasselbe braucht auch „Dribbeln mit Pfiff". Alle Werte sind
relativ zur Bandhöhe `h` und dadurch unabhängig von Bildschirm und Stufe:

| Kennzahl | Formel | Was Thomas daraus liest |
|---|---|---|
| `Hoehe` | (max y − min y der Punkte mit Druck > 0) / h | Wird die Schrift kleiner und kontrollierter? |
| `Breite` | (max x − min x) / h | Zusammen mit der Höhe: Verhältnis der Proportionen |
| `Grundlinienabweichung` | Mittelwert von \|y_unten(Strich) − y_Grundlinie\| / h, wobei y_unten der tiefste Punkt je Strich ist | Steht die Schrift auf der Linie? |
| `Schraeglage` | Steigung der Regressionsgeraden durch die Strich-Tiefpunkte, in Grad | Wandert die Unterschrift nach oben oder unten? |
| `Neustarts` | `neustartsMs.Length` | Zufriedenheit oder Perfektionismus |

Liegt `extra.band` nicht vor oder ist es nicht lesbar, gibt `Unterschrift.Berechne` den Wert
`null` zurück, und es erscheint nur der Standardteil. **Eine Migration braucht es nicht**,
denn gerechnet wird beim Lesen, wie bei den anderen Kennzahlen auch.

### 4c. Was Thomas sieht

- **Verlauf** (`therapeut/src/screens/Verlauf.tsx`): Die Zeile „Urkunde" hat die üblichen
  Kennzahlen und zusätzlich einen Knopf **„Urkunde ansehen"**.
- **Urkunde ansehen / drucken**: ein neuer Bildschirm `therapeut/src/screens/Urkunde.tsx`.
  - Er zeigt die Urkunde im Querformat A4 als SVG, im selben Aufbau wie auf dem Tablet.
  - Bens Unterschrift wird aus den Rohdaten gezeichnet. Jede Folge von Punkten mit Druck > 0
    wird zu einer `<polyline>`; ein Punkt mit Druck 0 trennt die Striche.
  - Die Umrechnung vom `band` in die Unterschriftsfläche der Druckvorlage erhält das
    Seitenverhältnis.
  - Die Strichbreite folgt dem Druck, gemittelt je Strich.
  - Rechts stehen Profi-Unterschrift und Stempel wie im Lob.
  - Ein Knopf „Drucken" ruft `window.print()` auf. `@media print` blendet alles außer der Urkunde
    aus; das Muster gibt es schon im Wochenbericht.
- **Vergleichsansicht (später, klein):** Alle Urkunden-Unterschriften eines Klienten stehen
  untereinander, nur die Bänder, mit Verein, Datum und Stufe. Das ist der Längsschnitt auf
  einen Blick und der eigentliche therapeutische Gewinn. Er kostet etwa 30 Zeilen, weil er die
  Zeichenfunktion der Urkunde wiederverwendet.

**Endpunkt:** `GET /api/klienten/{id}/urkunden/{ergebnisId:guid}` in `Endpunkte/Bericht.cs`.
- Er liefert `{ datum, stufe, extra, werte }`; `werte` ist der Rohdaten-Blob als Base64, so wie
  er auch hochgeladen wird.
- Die Betreuungsprüfung läuft wie bei `/verlauf` (`Bericht.cs:66`).
- Dazu muss der Verlauf je Zeile die `ergebnisId` mitliefern, eine Zeile in der Projektion.
- Im Browser wird dekodiert mit `atob` → `Uint8Array` → `DataView.getFloat32(i, true)`. Das
  ausdrückliche little-endian entspricht dem Blob-Format aus CLAUDE.md.

**Fallstricke:**
- **Maus-Fallback:** Eine Unterschrift mit der Maus sieht auf dem Ausdruck eckig aus und hat
  synthetischen Druck. Die Druckvorlage zeigt dann klein „mit Maus geschrieben", damit die Probe
  nicht neben Pencil-Proben gelegt wird.
- **`pointercancel` schreibt keinen Absetzpunkt** (`SpielScreen.tsx:128-130`). Bei einer
  Unterschrift würden zwei Striche dann zu einem verbunden, und auf dem Ausdruck erschiene ein
  Strich quer durch den Namen. Die Lösung ist eine Zeile: dort `nimmAuf(e, 0)` aufrufen, wie bei
  `pointerup`. Das ist ohnehin ein Querschnittsfehler (siehe `README.md`).
- **Handballen:** Liegt Bens Hand auf dem Display, zeichnet der SpielScreen auch diesen Zeiger
  auf. Das Spiel nimmt für die eigene Tinte nur `pointerType === 'pen'` bzw. den ersten Zeiger.
  Für die Rohdaten gilt der Querschnittsfund aus `startelf.md`.
- Die Browser-Bewertung (`genauigkeit`) ist unmaßgeblich und wird im Code so markiert.

## 5. Spielspaß

- **Ein Ritual statt einer Übung:** Nach vier Trainingstagen wird Ben „offiziell". Profis
  unterschreiben Verträge, und Ben unterschreibt seine Urkunde. Für ein Kind mit ADHS trägt
  dieses Gefühl, ernst genommen zu werden, weiter als Punkte.
- **Etwas zum Anfassen:** Thomas druckt die Urkunde, und Ben nimmt sie mit nach Hause. Nach
  einigen Vereinen hängt eine Sammlung an der Wand. Das ist Fortschritt, den man sieht, ohne
  Prozentwerte (C4).
- **Der Profi unterschreibt mit:** Ben und sein Trainer stehen gleichberechtigt auf demselben
  Blatt. Der Stempel ist der Höhepunkt, kurz, laut und in Vereinsfarbe, und kommt erst nach der
  Smiley-Frage.
- **Bezug zum Verein (Leitidee):** Vereinsname, Farben, Wappen, die Unterschrift des Profis
  und `profi.abschied` sind je Verein eigen. Bei Ajax steht unter „URKUNDE" klein „Oorkonde"
  mit Übersetzung, das ist dieselbe Mechanik wie bei den Sprüchen.
- **Kurz:** Das Spiel dauert etwa 30–60 Sekunden. Nach einer ganzen Einheit ist das genau
  richtig, denn die Aufmerksamkeit ist am Ende des Tages am kleinsten.

**Kein Game Over (C2), kritisch geprüft:**
- *Was, wenn die Unterschrift misslingt?* Es gibt kein „misslungen". Mit „Nochmal" darf Ben neu
  anfangen, bis zu 2-mal. Danach verschwindet der Knopf ohne Kommentar, und „Fertig" bleibt.
  Endloses Neuanfangen wäre bei Perfektionismus eine Falle.
- *Was, wenn Ben nicht schreiben will?* Bleibt das Band 60 s leer, sagt der Profi einmal: „Ein
  Zeichen reicht auch — so wie ein Profi-Kürzel." Nach weiteren 30 s erscheint „Fertig"
  trotzdem, und `vollstaendigkeit` ist dann 0. Das Spiel bleibt nie hängen.
- Der Text wird nie korrigiert, auch kein „falsch geschrieben". Ein Spielname ist ohnehin, was
  Ben dafür hält.
- Es gibt keinen Stern. Der Lob-Bildschirm auf `origin/aufwaermen-parcours` zeigt schon keine
  Sterne mehr („Lob ohne Sterne"). Auf `main` gibt `App.tsx:257` noch mindestens einen Stern
  aus; das erledigt sich mit dem Merge.

## 6. Schwierigkeit und Einstellungen (B1)

Wirksam sind **Stufe** und **DauerSek**, wobei die Dauer nur die Anzeige betrifft.

| | Stufe 1 | Stufe 2 | Stufe 3 |
|---|---|---|---|
| Bandhöhe (Bühnen-px) | 140 | 100 | 70 |
| Lineatur | vier Linien (Ober-, Mittel-, Grund-, Unterlinie) wie in Klasse 1 | Mittel- und Grundlinie | nur die Grundlinie, wie eine echte Unterschrift |
| Vorlage | Spielname hellgrau im Band, zum Nachspuren | Spielname klein über dem Band, zum Abschauen | keine |
| `extra.lineatur` / `extra.vorlage` | `vier` / `nachspuren` | `zwei` / `abschauen` | `grund` / `keine` |

`Toleranz` und `Mindesttrefferquote` wirken nicht, weil nichts bestanden werden muss.
`Zielgeschwindigkeit` wirkt auch nicht. Die Unterschrift soll in Bens eigenem Tempo entstehen;
gemessen wird es trotzdem. `Einstellungen.tsx` kann die drei Regler für die Rolle `sonder`
ausblenden (3 Zeilen), sonst schiebt Thomas an Reglern, die nichts bewirken.

**Für die Vergleichbarkeit gilt:** Bleibt die Stufe gleich, sind die Bedingungen von Urkunde zu
Urkunde gleich. Ändert Thomas die Stufe, zeigt der Verlauf den Wechsel als Marker, wie bei allen
Spielen.

## 7. Content-Bedarf

Neu ist ein **Pflichtfeld** am Profi (`content/typen.ts:24-31`), und ein optionales am Verein:

```ts
/** Am letzten Tag eines Vereins, nach der Urkunde. `{name}` wird ersetzt. */
abschied: Dialog
```

```ts
/** Wort für „Urkunde" in der Vereinssprache, mit Übersetzung. Fehlt es, steht nur „URKUNDE". */
urkunde?: Spruch
```

Beispiele:

```ts
// hsv.ts
abschied: { text: 'Stark, {name}! Deine Urkunde ist unterschrieben — du warst ein echter Hamburger. Gute Reise!' },
// ajax.ts
abschied: { text: 'Goed gedaan, {name}! Das heißt: gut gemacht. Deine Oorkonde ist fertig. Tot ziens!' },
urkunde: { text: 'Oorkonde', sprache: 'Niederländisch', uebersetzung: 'Urkunde' },
```

Weil `satisfies Verein` greift, meldet der Compiler einen Verein ohne `abschied` als Fehler.
Bilder werden keine gebraucht: Rahmen, Wappenschild und Stempel entstehen aus `farben`.

## 8. Umsetzung

**Kind-App, etwa 450 Zeilen:**

| Datei | Inhalt | Zeilen |
|---|---|---|
| `spiele/abschiedsgeschenk/welt.ts` | `Schritt`, Bandmaße je Stufe, `imBand`, `tinteImBand`, `neustart`, `ergebnis`; ohne Canvas und React | ~150 |
| `spiele/abschiedsgeschenk/welt.test.ts` | vitest, siehe unten | ~120 |
| `spiele/abschiedsgeschenk/zeichnen.ts` | Urkunde, Lineatur, Vorlage, Tinte; Profi-Unterschrift und Stempel als eigene Funktion `zeichneUrkunde(ctx, …, {profiAnteil, stempel})`, damit das Lob sie wiederverwendet | ~200 |
| `spiele/abschiedsgeschenk/index.tsx` | Canvas, Pointer, Bildschleife mit `angehalten`, Knöpfe; Vorbild `autogramme/index.tsx` | ~130 |
| `spiele/abschiedsgeschenk/klang.ts` | Kratzen, Rascheln, Stempel | ~30 |
| `spiele/index.ts` | Eintrag in `KOMPONENTEN` | 2 |
| `spiele/katalog.ts` | Titel und Anweisung | 2 |
| `LobScreen` bzw. `App.tsx` (`lob`) | für die Rolle `sonder`: die Urkunde mit Bens Strichen aus `lauf.ergebnisse.at(-1).rohdaten`, die Profi-Unterschrift wird animiert, dann kommen Stempel und `profi.abschied` | ~40 |
| `content/typen.ts`, `hsv.ts`, `ajax.ts` (und `koeln.ts` auf dem Branch) | `abschied`, optional `urkunde` | ~8 |
| `screens/SpielScreen.tsx:128` | `pointercancel` → Absetzpunkt | 1 |

**Server, etwa 110 Zeilen:** `Bericht.cs` mit dem Urkunden-Endpunkt (~25) und der `ergebnisId` im
Verlauf (1); optional `Auswertung/Unterschrift.cs` (~60); `api.tests` mit einem Endpunkt-Test
(fremder Therapeut → 403) und `Unterschrift.Berechne` an einer konstruierten Punktfolge (~40).

**Therapeuten-App, etwa 150 Zeilen:** `screens/Urkunde.tsx` (SVG-Aufbau und Druck, ~90),
`rohdaten.ts` (Dekodieren und Aufteilen in Striche, ~25), `api.ts` (~10), Knopf im Verlauf (~5),
Druck-CSS (~10).

**Wiederverwendbar:**
- `berechneSicht` und die Strichdarstellung aus `autogramme/zeichnen.ts`
- `druckKennzahlen`, `geraetVon`, `ProfiFigur`
- das Druck-CSS des Wochenberichts
- `Kennzahlen.cs` zum Lesen des Blobs

**Testfälle `welt.test.ts`:**
1. `bandFuer(1|2|3)` liefert Höhen 140, 100 und 70 und die richtige `lineatur` und `vorlage`.
2. Ein Strich ganz im Band erhöht `tinteImBand`, ein Strich außerhalb nicht.
3. Nach dem ersten Strich und 1,2 s ohne Eingabe wechselt `schritt` zu `pruefen`, nach 1,1 s
   noch nicht.
4. Mit `angehalten` laufen weder die 1,2 s noch die 60/90 s.
5. `neustart` leert die Tinte, legt die Zeit in `neustartsMs` ab, und beim dritten Aufruf
   passiert nichts.
6. `ergebnis` nach „Fertig": `vollstaendigkeit` = 1 bei ausreichender Tinte, `abgebrochen` =
   false, `extra.band` ist gesetzt, `stufe` wird übernommen.
7. Das leere Band nach 90 s ergibt `vollstaendigkeit` = 0 und `abgebrochen` = false (C2).

**Testfälle `rohdaten.ts` (Therapeuten-App, vitest):** `[0,10,10,.5, 16,20,10,.5, 32,20,10,0,
48,30,10,.5]` wird zu zwei Strichen. Punkte vor dem letzten Neustart werden verworfen.

**Kataloge:** `Spielkatalog.cs:44` ist bereits richtig (`Sonder`, `schreiben`). Am Server
ändert sich nichts.

## 9. Risiken und offene Fragen

**Technisch**
- **Koordinaten von `band`:** Wird die Bühne anders skaliert, etwa bei einer Drehung des iPads
  mitten in der Unterschrift, passen Band und Rohdaten nicht mehr zusammen. Gegenmittel: `band`
  beim **ersten Aufsetzen** festhalten und nicht beim Mount, bei einer Größenänderung neu
  messen und als `bandWechselMs` mitschreiben. Es reicht aber auch, das nur zu dokumentieren.
- **Profi-Unterschrift mit `cursive`:** Die Systemschrift ist auf iPad und Windows verschieden.
  Das ist unkritisch, weil sie nur Deko ist.
- **Der Timer läuft sichtbar ab und endet nichts** (A3). Das gilt für alle Spiele mit Inhalt als
  Endbedingung. Die Gruppe muss entscheiden, ob der SpielScreen ihn für solche Spiele ausblendet.
- **Druckqualität:** 60-Hz-Abtastung reicht für eine Unterschrift auf A4 aus. Die Polylinie
  wird mit `stroke-linejoin: round` geglättet, Bézier-Glättung ist nicht nötig.

**Therapeutisch**
- Kennt Ben seinen Spielnamen nicht mehr sicher, hilft Stufe 1 mit der Vorlage. Thomas kann die
  Stufe im Spiel unabhängig von den anderen Übungen setzen (B1, je Übungstyp).
- Die Probe ist **eine Unterschrift**, kein Fließtext. Für Satzschreiben sind Startelf und
  Stadionführung da. Die Urkunde ergänzt sie als feste Messstelle.

**Datenschutz (D4)**
- Neue personenbezogene Daten entstehen nicht. Die Punktfolge ist Rohdaten wie in jedem Spiel
  und wird mit dem Profil gelöscht (Cascade, `VACUUM`, `LoeschungTests.cs`).
- Die Regel „Zeichnung nicht speichern, solange es keinen Empfänger gibt" (CLAUDE.md,
  Namensabfrage) ist erfüllt: Der Empfänger ist Thomas, und der Zweck ist der Längsschnitt.
- Der Ausdruck enthält Bens Handschrift und den Vereinsnamen, aber keinen bürgerlichen Namen.
  Wer ihn auf Papier ergänzt, entscheidet Thomas.

**Änderungen an CLAUDE.md**
1. Im Abschnitt „Woher die Übungen des Tages kommen" steht noch „Foto einer auf Papier
   geschriebenen Aufgabe — nur speichern und Thomas anzeigen". Neu: „Urkunde, die Ben auf dem
   Tablet unterschreibt; Thomas kann sie drucken."
2. In „Explizit nicht bauen" bleibt „Bild-Upload der Arbeitsproben" stehen. Er wird für die
   Urkunde nicht mehr gebraucht.
3. `katalog.ts:100` verspricht ein Foto, die Anweisung wird ersetzt (Abschnitt 1).
4. `entscheidungen.md`: ein kurzer Absatz, warum die Urkunde aus Rohdaten gedruckt wird und
   nicht als Bild hochgeladen wird. Das ist dieselbe Begründung wie hier: kein neuer Datentyp,
   Löschung ohne neuen Code.
5. **B2:** Das Sonderspiel misst jetzt, kommt aber nur an jedem fünften Tag dran. Als eines der
   fünf Minispiele für B2 sollte es im Bericht trotzdem nicht gezählt werden.

## 10. Anforderungs-Check

| ID | Status | Anmerkung |
|---|---|---|
| A1 | erfüllt | Tinte im selben Frame, Canvas 2D |
| A2 | erfüllt | Urkunde und 1–2 Knöpfe, keine Statistik, keine Sterne |
| A3 | betroffen | Timer sichtbar, endet aber nichts (Abschnitt 9) |
| A4 | erfüllt | Kratzen, Rascheln, Stempel; über `tonAn()` abschaltbar |
| A5 | erfüllt | Ein Satz Anweisung, vorgelesen |
| B1 | teilweise | Stufe wirkt (Bandhöhe, Lineatur, Vorlage). Die übrigen Regler sind ohne Bedeutung und werden ausgeblendet |
| B2 | neutral | Zählt nicht als eines der fünf Minispiele |
| B3 | erfüllt | Kurz, ruhig, nur jeden 5. Tag |
| B4 | erfüllt | Volle Punktfolge vom SpielScreen, dazu `extra.band` als Bezugsrahmen |
| C1 | erfüllt | Urkunde zum bestandenen Probetraining, vom Profi überreicht |
| C2 | erfüllt | Kein Misslingen, „Nochmal" begrenzt, leeres Band führt trotzdem weiter, keine Korrektur |
| C3 | erfüllt | Profi-Unterschrift und Stempel erst nach der Smiley-Frage |
| C4 | gestärkt | Gedruckte Urkunden als Sammlung, ohne Prozentwerte |
| C5 | erfüllt | `profi.abschied` mit Spielname |
| C6 | erfüllt | Schließt den Verein ab, danach folgt die Reise |
| D2 | erfüllt | Ergebnis und Rohdaten automatisch mit der Session |
| D3 | erfüllt | Kennzahlen im Wochenbericht unter `schreiben`; die Urkunde selbst wird gesondert gedruckt |
| D4 | erfüllt | Keine neuen Datenarten, Löschung über den bestehenden Cascade |
