# TravelKickers

Ergotherapie-Lernapp für **Ben, 7 J., ADHS + feinmotorische Störung**. Ziel: Heimübungen zur
Schreibmotorik in ein kurzes Spielerlebnis überführen und dem Therapeuten **Thomas, 38 J.**
automatisch Verlaufsdaten liefern. Fußball-Thema: Ben reist zu Vereinen und macht dort ein
Probetraining. **Keine Diagnose, kein Therapieersatz.**

## Kontext, der nicht im Code steht

Dies ist eine **bewertete Schul-Projektarbeit**, LF10a, **Gruppe 16, 3 Personen**.
LN1 (Planungsteil) wurde am 29.08.2026 abgegeben.

**Maßgebliches Dokument:** `/home/lee/Documents/LF10a_Gruppe_16_LN1_Kurzfassung_v2.md`
(PDF daneben). Es enthält die Anforderungs-IDs **A1–A5, B1–B4, C1–C6, D1–D4**, gegen die
gebaut und bewertet wird. Bei Architekturvorschlägen immer gegen diese IDs prüfen.

Ideensammlung des Users (seine eigene Vorarbeit, keine KI):
`/home/lee/B.R.I.A.N.v2/Projekte/Kicker/Übungs Ideen.md` und `Generelle Ideen.md`.
**Vor Design- oder Spielarbeit dort reinsehen** — die Datei enthält mehr Übungsideen mit
Mechanik-Details, als hier zusammengefasst sind.

**Design-Referenz:** `docs/mockup-startbildschirm.png` (vom User erstellt).

**Wichtig für die Umsetzung:** Jedes Gruppenmitglied muss seinen Code in der Prüfungssituation
erklären können. Einfacher Code, den man verteidigen kann, schlägt cleveren Code. Keine
Abstraktionen ohne konkreten Anlass, keine Bibliothek für etwas, das 20 Zeilen sind.

## Anforderungen (Kurzform)

| ID | Kern | Was es für den Code bedeutet |
|----|------|------------------------------|
| A1 | Unmittelbare Belohnung | **Feedback < 100 ms** nach jeder Teilbewegung. Härteste technische Vorgabe im Projekt. |
| A2 | Reizarme Oberfläche | Max. 2 Menüebenen, höchstens 5 Kacheln/Bildschirm, **keine Statistik im Kindmodus** |
| A3 | 3–5 Min + Zwangspause | Sichtbarer Timer je Spiel; danach Pausenbildschirm, 10-s-Countdown |
| A4 | Keine Werbung/Dauerton | Ton nur funktional und abschaltbar |
| A5 | Eine Aufgabe pro Bildschirm | 1 Aufgabe + 1 Satz Anweisung, **zusätzlich vorgelesen** |
| B1 | Konfigurierbare Toleranz | Toleranz, Zielgeschwindigkeit, Mindesttrefferquote je Übungstyp im Therapeutenmodus |
| B2 | Übungsvielfalt | 5 Minispiele: Grafomotorik, Kraftdosierung, Pinzettengriff, Hand-Auge |
| B3 | Verkrampfungsprävention | Pausen, wechselnde Muster, Lockerungsübung, Tagesobergrenze |
| B4 | Präzise Eingabeerfassung | Punktfolge mit Koordinaten + Zeitstempeln; daraus Abweichung, Tempo, Zittern |
| C1 | Fußball-Thema | Übungen als Fußballhandlungen |
| C2 | Kein „Game Over" | Kein Verliererzustand, unbegrenzte Wiederholung, Hilfe statt Abbruch |
| C3 | Selbsteinschätzung | Smiley-Frage; Abgleich mit Messwert nur für Thomas |
| C4 | Fortschritt sichtbar | Landkarte + persönliche Bestwerte. Prozentwerte nur im Therapeutenmodus |
| C5 | Lob durch die Spielfigur | Profi begrüßt, kündigt an, lobt; benennt persönliche Bestleistung |
| C6 | Ortswechsel | 5 Einheiten pro Verein, dann Reise zum nächsten |
| D1 | Zwei Ansichten | Kindmodus Standard, Therapeutenbereich per PIN. **Kein Elternbereich** |
| D2 | Automatisches Tracking | Unsichtbar im Hintergrund |
| D3 | Wochenbericht auf 1 Seite | Druckbar; Gesprächsgrundlage für Thomas, nicht für Eltern |
| D4 | Datenschutz | Nur Vorname + Jahrgang, lokal, **Profil löschbar (Art. 17 DSGVO)** |

## Techstack (entschieden, nicht neu aufrollen)

| Ebene | Wahl |
|---|---|
| Kindmodus | **PWA**: TypeScript + React + Vite, `vite-plugin-pwa` |
| Spiele | **Canvas 2D**, kein Pixi/Three (erst wenn Partikel messbar ruckeln) |
| Eingabe | Pointer Events + `getCoalescedEvents()` (volle 120 Hz vom Pencil) |
| Styling | Tailwind, **kein CSS-Framework mit Komponenten** (Bootstrap explizit verworfen) |
| Ablaufsteuerung | Reducer + Segmentliste. **Kein XState, kein Router** — der Trainingstag ist eine lineare Liste |
| Lokal | **Dexie (IndexedDB)** als Puffer + Outbox |
| Server | ASP.NET Core Minimal API, **.NET 8** (Visual Studio 2022 kann nicht mehr), EF Core + SQLite |
| Auswertung | **C#**, aus den Rohdaten |
| Bericht | Razor-View + CSS `@media print` |
| Tests | xUnit für die Auswertungslogik |
| Verträge | OpenAPI → `openapi-typescript` |
| Layout | `apps/web/`, `apps/api/`, Content in `apps/web/src/content/` |

**Verworfen und warum:** ASP.NET MVC + Razor für den Kindmodus (verletzt A1 und Offline —
ein iPad kann keinen .NET-Prozess hosten), Blazor WASM (Interop-Latenz gegen A1),
SQLite-WASM im Browser (löst kein Problem, das wir haben), Unity, Cloud-DB.

### Zweistufige Auswertung — der Kern der Architektur

- **Browser:** Sofortfeedback unter 100 ms — Strich erscheint, **Soundeffekt, Partikel**,
  Sterne/Pokale. Das gehört zu A1 und ist keine Kür. Die dabei berechnete Bewertung ist grob und
  wird **nie in einem Bericht verwendet**; im Code als unmaßgeblich markieren.
- **C#:** die maßgeblichen Kennzahlen, gerechnet aus der Rohdaten-Punktfolge. Getestet mit xUnit.

Das erfüllt A1, B4, Offline und die Zusage „Auswertung in C#" gleichzeitig.

## Eingabe

Apple Pencil ist die Zielplattform. Fallback für Maus + Tastatur:

- Maustaste gedrückt = Stift auf Papier
- Ziffern `1`–`9` = 10 %–90 % Druck, `0` = 100 %, Default **50 %**
- Diese Werte in den Daten **als synthetisch markieren** — sonst mischen sich echte
  Pencil-Druckkurven mit Tastaturwerten und die Verlaufskurve lügt.

Bei **jedem** Messwert mitspeichern: **Eingabegerät** und **eingestellte Schwierigkeitsstufe**.
Sonst sieht eine vom Therapeuten erhöhte Anforderung wie eine Verschlechterung aus.
Kein Herausrechnen per Formel — Stufe im Verlauf anzeigen (Punkte einfärben, Marker bei Wechsel).

## Leitidee: Es muss sich anfühlen wie echtes Training bei diesem Verein

Der Kern des Konzepts, nicht Deko: **die Aufgaben sind auf den jeweiligen Verein zugeschnitten.**
Ben soll den Eindruck haben, wirklich mit den Leuten dort zu trainieren — nicht dieselbe Übung
mit ausgetauschtem Wappen.

Konkret heißt das: Namen und Rückennummern der Startelf dieses Vereins schreiben, vereinstypische
Sätze und Schlachtrufe (auch fremdsprachige, immer mit deutscher Übersetzung), Stadionrundgang
mit echten Fakten zu diesem Stadion, Autogramme dieser Spieler. Ein Verein bringt also nicht nur
Logo und Farben mit, sondern **eigene Aufgabeninhalte**. Das Content-Format muss das tragen.

## Startbildschirm

Siehe `docs/mockup-startbildschirm.png`. Elemente: Spieltitel oben mit Fußball-Elementen im
Schriftzug, Wolken auf hellblauem Himmel, **Europakarte unten gerundet** (Globus-Andeutung, grau),
**Vereinswappen als Pin-Nadel** auf der Karte, darunter ein Stadion mit Hervorhebung für den
aktuellen Verein. Nicht besuchte Vereine sind blasse, leere Pins — dadurch ist die Karte zugleich
die Fortschrittsanzeige aus C4. Dazu ein **Maskottchen** (Fußball-Figur mit Cap).

Bedienelemente Phase 1: pulsierender weißer **„Drücke zum Start"**, Menü oben rechts
(2 s Langdruck → PIN → Therapeutenbereich). Sonst nichts — A2 begrenzt auf 5 Elemente.

## Ablauf

**Ein Verein = 5 Einheiten.** Danach Reise zum nächsten Verein: neuer Profi, andere Spielauswahl.

Eine Einheit besteht aus einer Liste von **Segmenten**:

```
[Ankommen]        nur an Tag 1 eines Vereins
 Aufwärmen        jeden Tag
 Spiel → Lob → Zwangspause → Spiel → Lob → Zwangspause → …
 Abschluss-Fragebogen   jeden Tag
```

Stationentour, Autogrammstunde und Abschiedsgeschenk sind **normale Minispiele** im Tagesplan,
keine Sonderfälle. Tag 5 endet mit dem Abschiedsgeschenk (Foto einer auf Papier geschriebenen
Aufgabe, per Kamera aufgenommen — **nur speichern und Thomas anzeigen, nicht auswerten**).

**Namensabfrage per Stift nur beim allerersten Start überhaupt**, nicht bei jedem neuen Verein.

### Timer und Pause

- Sichtbarer Timer **im Spiel** (A3).
- Danach **Zwangspause**: kann **angehalten** werden (falls zu Hause etwas dazwischenkommt) und
  wird danach fortgesetzt — aber **nicht übersprungen**.
- Inhalt und Dauer der Pause stellt Thomas ein (z. B. 10 Hampelmänner, Stifthaltung, Hand lockern).

### Abbruch

Fortschritt nach jedem Segment speichern. Neustart am selben Tag → „Weitermachen?".
An einem anderen Tag → Tag beginnt neu, der abgebrochene wird **als abgebrochen protokolliert**.
Ein Abbruch nach 90 Sekunden ist für Thomas ein Befund, keine Datenpanne — nicht wegwerfen.

## Spiel-Schnittstelle

Jedes Minispiel meldet selbst „fertig". Endbedingung ist spielabhängig: Zeit, Wiederholungen
(z. B. Aufwärmparcours 5×) oder erschöpfter Inhalt (alle Autogramme gegeben).

Rückgabe = **fester Kern + freies Extra**:

- Kern: Dauer, Vollständigkeit (0–1), Genauigkeit (0–1), Druck-Mittel/-Streuung,
  Eingabegerät, Schwierigkeitsstufe, abgebrochen ja/nein
- Extra: spielspezifisches JSON

Nur der Kern geht in den Verlaufsgraphen — sonst sind Spiele nicht vergleichbar.
Zusätzlich **Kategorie-Tags** je Spiel (gerade Striche, Wellen, Schreibübungen, Druckdosierung),
mehrere pro Spiel möglich, für die Auswertung nach Fähigkeitsbereich.

### Selbsteinschätzung (C3) — Reihenfolge ist kritisch

**Frage → Lob des Profis → Ergebnis.** Wird zuerst das Ergebnis gezeigt oder gelobt, misst man
nicht die Selbsteinschätzung, sondern die Fähigkeit, ein Ergebnis abzulesen — und die Differenz,
also der ganze Zweck von C3, ist wertlos.

Drei Smileys, nicht fünf. **Die Antwort wird nie korrigiert oder kommentiert** — kein
„Das war doch super!", das entwertet Bens Wahrnehmung und verstößt gegen C2.

## Daten

**Rohdaten aufheben**, nicht nur Kennzahlen: die interessanten Feinmotorik-Metriken (Zittern,
Absetzhäufigkeit, Geschwindigkeitsprofil, Druckstabilität) sind heute noch nicht definiert und
lassen sich später auf alten Sessions nachrechnen. Auf ~60 Hz ausdünnen, als **Float32-Blob**
speichern, nicht als JSON-Objekte (ein 4-Minuten-Spiel sind sonst ~20.000 Objekte).

Sync-fähig von Anfang an, auch wenn Phase 1 ohne Server läuft:
**client-generierte UUIDs, append-only Session-Events, Outbox-Tabelle.** Das ist der Teil, der
später Sync ermöglicht — nicht der Server.

Datenmodell **mehrbenutzerfähig** (alles hängt an einer `client_id`), UI aber nur ein aktives
Profil, umschaltbar nur im Therapeutenmodus.

### Speicher-Fallstricke (verifiziert)

- Safari löscht Website-Daten nach ~7 Tagen Nichtnutzung — **außer die PWA ist auf dem Homescreen
  installiert**. Ohne Installation sind die Therapiedaten irgendwann weg.
- Beim Start `navigator.storage.persist()` anfordern.
- Im Therapeutenmodus **Warnung anzeigen**, solange die App nicht als Homescreen-App installiert ist.

## Therapeutenmodus

PIN, lokal gehasht, beim ersten Start gesetzt. Öffnet erst nach **2 s Langdruck**, damit Ben nicht
hineinstolpert. Im Code offen als „Kindersicherung, keine Sicherheit" benennen — ohne Server gibt
es kein echtes Auth, und dahinter darf später nichts Vertrauliches landen.

Einstellbar: Schwierigkeit/Toleranz je Übungstyp, Spiele weglassen, Reihenfolge ändern,
Übungen verlängern/verkürzen, Pausendauer und -inhalt, Profil löschen.

## Content

Vereine, Profis, Dialoge und Tagespläne als **TypeScript-Objekte mit Schema-Validierung** in
`apps/web/src/content/`. Neuer Verein = eine Datei + Bilderordner. Typsicher, und ein fehlendes
Feld gibt einen Fehler statt eines leeren Bildschirms.

Anpassungen des Therapeuten sind **Overrides in der DB**, die über den Content gelegt werden —
der Content bleibt unversehrt und updatebar.

Jeder Dialogtext hat ein **optionales Audio-Feld** (A5 verlangt Vorlesen). Phase 1: Text groß +
Web Speech API. Später echte Aufnahmen: MP3 reinlegen, kein Codeumbau.

**Vereinsassets:** HSV-Logo und echte Bezüge erstmal drin, werden später ersetzt (Wappen sind
Marken, Spielernamen Persönlichkeitsrechte). Deshalb ist ein Verein nur ein Datenpaket — der
Austausch gegen fiktive Vereine darf keinen Code anfassen, nur Content-Dateien.

Ein Vereinspaket enthält daher: Wappen, Farben, Stadion, Profi-Figur mit Sprechtexten **und die
vereinsspezifischen Aufgabeninhalte** (Kaderliste, Fakten, Sprüche) — siehe Leitidee oben.

## Phase 1 — Umfang

1. PWA-Gerüst, Startbildschirm: pulsierender weißer „Drücke zum Start", Menü oben rechts
   (Langdruck → PIN), Vereinslogo als Pin auf der Karte
2. Erstlauf: Profi begrüßt, Namenseingabe **per Stift gezeichnet**. Der Name wird gespeichert,
   damit Begrüßungen und Lob später persönlich adressiert werden können (C5)
3. Ansage: Dauer der Einheit, Anzahl Übungen und Pausen (grober Plan, keine Spieldetails)
4. Segment-Engine für den Tagesablauf
5. **Ein Minispiel: Linie malen** — als Referenz für Tracking, Spielende, Metriken
6. Onboarding beim ersten Spiel (Pfeile + Erklärung des Profis)
7. Lob → Selbsteinschätzung → Pause mit Timer
8. Abschluss-Fragebogen
9. Therapeutenmodus: Einstellungen + Verlauf

**Arbeitsteilung für 3 Personen:** so schneiden, dass jedes Minispiel isoliert baubar ist und
niemand in denselben Dateien arbeitet.

## Explizit nicht bauen

Gems, Shop, Trikots, eigene Mannschaft, Streak/Serien (bewusst gestrichen — ein Streak bestraft
Krankheit und Ferien). Elternbereich. Automatische Bildauswertung des Papierfotos.
Sync-Server-Betrieb. Datenexport als Feature. Millimeter-genaue Kalibrierung (Toleranz bleibt
einheitenlos).

## Offene Punkte

- Startbildschirm-Gestaltung und Reise-Animation im Detail
- Die vier weiteren Minispiele. Kandidaten aus der Ideenliste, mit ihren Mechaniken:
  - **Platzwart Rasenmähen** (Kraftdosierung): nicht zu stark, nicht zu schwach drücken, sonst
    geht der Rasen kaputt; Sprenger als Hindernis
  - **Dribbeln mit Pfiff** (Inhibition): bei Trainerpfiff Stift anhalten, aber **nicht abheben**;
    Doppelpfiff = weiter. Beim Abheben rollt der Ball weg
  - **Tour Guide / Stationentour** (Tempo + Druck): Fakten in gleichmäßigem Tempo und Druck
    nachschreiben — zu schnell oder zu langsam, und die Besucher gehen
  - **11 Meter** (Hand-Auge): Schnelligkeit und gleichmäßiger Druck; sonst hält der Torwart
  - **Ball hochhalten** (Hand-Auge): auf den Ball tippen, Zonen geben mehr Punkte
  - **Autogrammstunde** (Grafomotorik + Pinzettengriff): Unterschriften auf Trikots
  - Weitere in `Übungs Ideen.md` (Security, UFO/Müll einsammeln, Startelf-Namen schreiben)
- Wann genau der Sync-Server gebaut wird
- Ob echte Vereinsassets durch fiktive ersetzt werden
