# TravelKickers

Ergotherapie-Lernapp für **Ben, 7 J., ADHS + feinmotorische Störung**. Ziel: Heimübungen zur
Schreibmotorik in ein kurzes Spielerlebnis überführen und dem Therapeuten **Thomas, 38 J.**
automatisch Verlaufsdaten liefern. Fußball-Thema: Ben reist zu Vereinen und macht dort ein
Probetraining. **Keine Diagnose, kein Therapieersatz.**

## Kontext, der nicht im Code steht

Dies ist eine **bewertete Schul-Projektarbeit**, LF10a, **Gruppe 16, 3 Personen**.
LN1 (Planungsteil) wurde am 29.08.2026 abgegeben.

Bewertet wird gegen die Anforderungs-IDs **A1–A5, B1–B4, C1–C6, D1–D4**. Bei
Architekturvorschlägen immer gegen diese IDs prüfen. Die Kurzform steht unten in dieser Datei.

**Entscheidungen zu Backend, Datenbank und Therapeutenbereich:** `docs/entscheidungen.md`.
Dort steht, was bereits entschieden ist und warum — vor einem Architekturvorschlag dort nachsehen,
damit nicht dieselben Fragen erneut aufgemacht werden.

> **Zwei Quelldokumente liegen nicht im Repo** und waren zuletzt nur auf einem anderen Rechner
> vorhanden: die **LN1-Kurzfassung** (der volle Wortlaut von A1–D4; hier steht nur die
> Zusammenfassung in der Tabelle unten) und die **Ideensammlung** des Users (`Übungs Ideen.md`,
> `Generelle Ideen.md`) mit Mechanik-Details zu weiteren Minispielen. Unter „Offene Punkte" sind
> die daraus bekannten Spiele mit ihren Mechaniken festgehalten — genannt, aber ohne Details, sind
> außerdem *Security*, *UFO/Müll einsammeln* und *Startelf-Namen schreiben*. Wer Zugriff auf die
> Dateien hat: nach `docs/` legen und diesen Absatz ersetzen.

**Design-Referenz:** `docs/mockup-startbildschirm.png` (vom User erstellt).

### Stand (10.09.2026)

Gebaut und im Zusammenspiel geprüft: Server mit Anmeldung, Gerätekopplung, Datenannahme und
Auswertung · Therapeuten-App mit Klientenauswahl, Einstellungen, Verlauf, Wochenbericht und
Gerätesperre · Kind-App mit Kopplung, Rohdatenaufzeichnung, Upload und Pausenmenü.
**B2 erfüllt — sechs Minispiele:** **Aufwärmen** (Dribbel-Parcours), **Ball hochhalten**,
**Platzwart**, **Linie malen**, **Autogrammstunde** und **Brezelverkauf**. Bis zum Aufwärmen war
die Rolle `aufwaermen` unbesetzt, jede Einheit begann mit dem `Platzhalter`.

Ebenfalls fertig: **C5** (der Profi lobt eine persönliche Bestleistung namentlich — verglichen
wird je Spiel gegen den bisher besten Wert, `pruefeBestwert` in `profil.ts`), **B3-Tagesobergrenze**
(**eine Einheit pro Tag**, fest im Client; wie lang eine Einheit ist, stellt Thomas ohnehin über
Anzahl und Dauer der Übungen ein) und das **Onboarding** (beim allerersten Mal erklärt der Profi
das Spiel, danach nie wieder; Uhr und Spiel stehen solange).

Starten: `powershell -File start.ps1` → Kindmodus `http://localhost:5099/`,
Therapeutenbereich `/therapeut/`. Demo-Konto `thomas@praxis.test` / `travelkickers`.

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

Die Tabelle ist der Wortlaut aus LN1 und bleibt so stehen. Zwei Punkte sind bewusst anders
umgesetzt und müssen **im Bericht begründet werden** (Details in `docs/entscheidungen.md`):

- **D1** — die zwei Ansichten sind Kind-App und **eigene Therapeuten-App**, nicht mehr ein
  PIN-Bereich in der Kind-App. Die Trennung ist dadurch stärker (echte Anmeldung statt
  Kindersicherung). Ohne diesen Satz liest sich die verschwundene PIN wie eine nicht erfüllte
  Anforderung.
- **D4** — es gibt ein Backend, die Lehrkraft verlangt es. Gespeichert werden Vor- **und**
  Nachname (gleichnamige Kinder müssen unterscheidbar bleiben), kein Jahrgang.

## Techstack (entschieden, nicht neu aufrollen)

| Ebene | Wahl |
|---|---|
| Kindmodus | TypeScript + React + Vite, `apps/web`. **Manifest für Homescreen und Vollbild, kein Service Worker** |
| Therapeuten-App | TypeScript + React + Vite, `apps/therapeut`, ausgeliefert unter `/therapeut/` |
| Spiele | **Canvas 2D**, kein Pixi/Three (erst wenn Partikel messbar ruckeln) |
| Eingabe | Pointer Events + `getCoalescedEvents()` (volle 120 Hz vom Pencil) |
| Styling | Tailwind, **kein CSS-Framework mit Komponenten** (Bootstrap explizit verworfen) |
| Ablaufsteuerung | Reducer + Segmentliste. **Kein XState, kein Router** — der Trainingstag ist eine lineare Liste |
| Lokal | `localStorage`: Gerätetoken, Fortschritt, Schnappschuss `tk.lauf`, Bedienung. **Kein Dexie** |
| Server | ASP.NET Core Minimal API, **.NET 8** (Visual Studio 2022 kann nicht mehr), EF Core + SQLite, `apps/api` |
| Auswertung | **C#**, aus den Rohdaten (`apps/api/Auswertung/Kennzahlen.cs`) |
| Bericht | React + CSS `@media print` |
| Tests | xUnit (`apps/api.tests`) und vitest (`apps/web`) |
| Verträge | handgeschriebene `api.ts` je Frontend, **kein Codegenerator** |
| Betrieb | **Ein Prozess, eine Origin**: der Server liefert beide Frontends aus `wwwroot`. `start.ps1` baut und startet |
| Layout | `apps/web/`, `apps/therapeut/`, `apps/api/`, `apps/api.tests/`, Content in `apps/web/src/content/` |

**Verworfen und warum:** ASP.NET MVC + Razor für den Kindmodus (verletzt A1 — ein iPad kann
keinen .NET-Prozess hosten), Razor auch für die Therapeuten-App (die Gruppe kann React, eine
Technologie genügt), Blazor WASM (Interop-Latenz gegen A1), SQLite-WASM im Browser, Unity,
Cloud-DB, Dexie/IndexedDB (ohne Offline kein Puffer nötig), Service Worker (war nur für Offline
da und liefert sonst veraltete Builds aus), OpenAPI-Codegenerator (zwölf Endpunkte sind von Hand
kürzer als die Werkzeugkette), CORS (entfällt bei einer Origin), Docker (ein Ausfallrisiko am
Prüfungstag ohne Punktgewinn).

**Zwei Fallen, die im Code je einen Kommentar haben und beide wie ein kaputter Build aussehen:**
`UseRouting()` muss ausdrücklich **nach** `UseStaticFiles()` stehen, sonst liefert jede `.js` die
`index.html` aus · zwei verschachtelte `SelectMany` übersetzt EF Core in SQL `APPLY`, das SQLite
nicht kennt.

### Zweistufige Auswertung — der Kern der Architektur

- **Browser:** Sofortfeedback unter 100 ms — Strich erscheint, **Soundeffekt, Partikel**,
  Sterne/Pokale. Das gehört zu A1 und ist keine Kür. Die dabei berechnete Bewertung ist grob und
  wird **nie in einem Bericht verwendet**; im Code als unmaßgeblich markieren.
- **C#:** die maßgeblichen Kennzahlen, gerechnet aus der Rohdaten-Punktfolge. Getestet mit xUnit.

Das erfüllt A1, B4 und die Zusage „Auswertung in C#" gleichzeitig.

**Blob-Format, verbindlich für beide Seiten:** vier `Float32` je Abtastung — `t` (Millisekunden
seit **Segmentstart**), `x`, `y`, `druck`. Little-endian, ohne Kopf, auf ~60 Hz ausgedünnt.
Geschrieben in `apps/web/src/rohdaten.ts`, gelesen in `apps/api/Auswertung/Kennzahlen.cs`.

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

Bedienelemente: pulsierender weißer **„Drücke zum Start"** und der **Anhalte-Knopf oben rechts**.
Sonst nichts — A2 begrenzt auf 5 Elemente. Der Langdruck ins Therapeutenmenü ist entfallen; der
Anhalte-Knopf liegt in `App.tsx` über allen Bildschirmen und gehört zum Gerät, nicht zu diesem
Bildschirm.

## Ablauf

**Ein Verein = 5 Einheiten.** Danach Reise zum nächsten Verein, immer in derselben Reihenfolge:
neuer Profi, neue Aufgabeninhalte.

Eine Einheit besteht aus einer Liste von **Segmenten**:

```
[Ankommen]        nur an Tag 1 eines Vereins
 Aufwärmen        jeden Tag
 Spiel → Lob → Zwangspause → Spiel → Lob → Zwangspause → …
 Abschluss-Fragebogen   jeden Tag
```

### Woher die Übungen des Tages kommen

**Es steht nirgends fest, welche Übung an welchem Tag drankommt.** Es gibt keine Tagesliste mehr
im Content — der Plan wird für jeden Tag neu gewürfelt.

Jedes Minispiel hat im Katalog (`apps/web/src/spiele/katalog.ts`) eine **Rolle**: `aufwaermen`,
`normal` oder `sonder`. Die vergibt der Content, **nicht** der Therapeut — ob „Aufwärmen" ein
Aufwärmspiel ist, ist eine Eigenschaft des Spiels. Der Therapeut stellt zweierlei ein: **wie
viele** Übungen welcher Rolle eine Einheit hat (Vorgabe 1 + 3 + 1) und **welche Spiele** im Topf
sind. Das Sonderspiel steht immer als **letzte** Übung an Tag 5 (Abschiedsgeschenk: Foto einer
auf Papier geschriebenen Aufgabe — **nur speichern und Thomas anzeigen, nicht auswerten**).

**Geordneter Zufall.** Der Startwert kommt aus Verein und Tag, bewusst *ohne* Kind-Kennung — die
kennt das Tablet gar nicht, sie steckt nur im Gerätetoken. Folgen daraus: derselbe Tag ergibt
denselben Plan (nach einem Abbruch bringt Ben das zu Ende, was er angefangen hat, und der Plan
ist mit vitest prüfbar), verschiedene Tage ergeben verschiedene Pläne, und sobald der Therapeut
ein Spiel aus dem Topf nimmt, wird aus einer anderen Menge gezogen.

**Die Abwechslungsregel** (`spieleDesTages` in `engine/tagesplan.ts`) in vier Zeilen: die erste
Übung wird gewürfelt · für jeden weiteren Platz gewinnt die Übung mit der geringsten
Überschneidung der Fähigkeitsbereiche zur vorherigen · bei Gleichstand gewinnt, was heute noch
nicht dran war · sonst der Zufall, und dasselbe Spiel nie dreimal hintereinander. Ergebnis:
Hand-Auge, dann Striche, dann Wellen, dann Druck — ohne dass irgendwo eine Liste steht.

**Speichersperre.** Sind für eine Rolle mehr Plätze eingestellt als Spiele aktiv, lehnt der
Server das Speichern mit einer Meldung ab („Übungen: 3 pro Einheit eingestellt, aber nur 2 Spiele
sind aktiv."). Sonst müsste sich dieselbe Übung wiederholen, und die Einstellung wäre nicht das,
was der Therapeut meint. Die Oberfläche warnt vorher, der Server ist die Regel.

**Änderungen gelten ab dem nächsten Training:** die Kind-App holt die Einstellungen vor **jedem**
Start einer Einheit neu. Ein iPad wird nicht geschlossen — beim App-Start allein käme eine
Änderung erst nach einem Neuladen an.

**Namensabfrage per Stift nur beim allerersten Start überhaupt**, nicht bei jedem neuen Verein.
Gefragt wird nach einem **selbstgewählten Spielnamen** („Benno") — den bürgerlichen Namen vergibt
der Therapeut, und im Kindmodus wird ausschließlich der Spielname ausgesprochen (C5). Das Getippte
ist nötig, weil sich Handschrift nicht auslesen lässt; das Schreiben ist die Übung. Die Zeichnung
wird **nicht** gespeichert, solange es keinen Empfänger dafür gibt — ein abgelegtes Bild ohne
Zweck verstößt gegen D4.

### Timer und Pause

- Sichtbarer Timer **im Spiel** (A3).
- Danach **Zwangspause**. Sie lässt sich **nicht überspringen**; „Weiter" erscheint erst bei 0.
- Inhalt und Dauer der Pause stellt Thomas ein (z. B. 10 Hampelmänner, Stifthaltung, Hand lockern).

**Anhalten geht überall über denselben Knopf oben rechts** (`ui/PausenMenue.tsx`) — im
Startbildschirm, im Spiel und in der Zwangspause. Dahinter: Ton, Lautstärke, Bildschirm dunkler,
Weiterspielen. Vier Elemente, damit A2 gewahrt bleibt.

Angehalten stehen **beide Uhren und die Bildschleifen der Spiele** (`angehalten` in `SpielProps`).
Sonst fiele der Ball, während Ben nicht hinsieht, und die gemessene `dauerMs` enthielte die
Pausenzeit — eine Pause würde ihn doppelt bestrafen.

Bildschirmhelligkeit kann eine Web-App **nicht** steuern; „Bildschirm dunkler" legt einen Schleier
über den Inhalt. Der Schalter verspricht deshalb nichts, was er nicht kann.

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

**Zwei Felder füllt der `SpielScreen`, nicht das Spiel:** die `id` (client-vergeben, macht einen
wiederholten Upload zum Upsert) und die **Rohdaten**. Die Aufzeichnung sitzt im `SpielScreen`, weil
die Zeigerereignisse aus dem Canvas dorthin aufsteigen — **jedes Minispiel zeichnet damit auf, ohne
eine Zeile dafür zu enthalten.** Wer ein neues Spiel baut, muss an B4 nicht denken. Auch die
`spielId` überschreibt der `SpielScreen` mit der aus dem Tagesplan: maßgeblich ist, welche Übung
vorgesehen war, nicht was ein Spiel über sich selbst sagt.

Ein Spiel muss dagegen **selbst** auf `angehalten` reagieren und seine Bildschleife anhalten.

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

**Die Anwendung ist online.** Offline wurde gestrichen — damit entfallen Outbox, Sync-Cursor und
Konfliktbehandlung ersatzlos. Geblieben sind die **client-generierten UUIDs** und das
**append-only Ereignisprotokoll**: sie haben mit Offline nichts zu tun, sondern machen einen
wiederholten Upload nach einem Verbindungsabbruch idempotent.

Die Einheit geht am Ende als **ein** `PUT /api/sessions/{id}` raus. Bricht die Verbindung mitten
im Training ab, wird zu Ende gespielt und beim nächsten Start nachgesendet — Ben sieht davon
nichts. Beim Start ist eine Verbindung nötig: ohne Service Worker lädt die App vom Server.

Der laufende Zustand liegt als Schnappschuss in `localStorage` unter `tk.lauf`. **Bewusst lokal
und nicht auf dem Server:** er enthält die Segmentliste, und würde man ihn aus Content und
Einstellungen neu bauen, käme nach einer Änderung des Therapeuten eine *andere* Liste heraus — der
Index zeigte woanders hin und Ben überspränge oder wiederholte ein Spiel, ohne dass es jemand
merkt.

Datenmodell **mehrbenutzerfähig**: alles hängt an einer `KlientId`, der Zugriff steht in der
Tabelle `Betreuung`. Ein Gerät ist immer genau einem Kind zugeordnet; die Zuordnung kommt aus dem
**Gerätetoken**, nie aus dem Request.

### Speicher-Fallstricke (verifiziert)

- Safari löscht Website-Daten nach ~7 Tagen Nichtnutzung — **außer die App ist auf dem Homescreen
  installiert**. Betroffen sind jetzt nicht mehr die Therapiedaten (die liegen auf dem Server),
  sondern das **Gerätetoken**: fliegt es raus, ist die Kopplung weg und der nächste Termin fällt
  aus. Die Erstkopplung passiert in der Praxis.
- Beim Start `navigator.storage.persist()` anfordern.
- **Vollbild auf dem iPad kommt nicht aus dem Manifest** — iPadOS beachtet weder
  `display: fullscreen` noch einen Orientierungs-Lock. Es kommt aus
  `<meta name="apple-mobile-web-app-capable">`. Das Manifest liefert Symbol und Name.
- `crypto.randomUUID()` ist auf einer unsicheren Origin `undefined`: über `http://` auf eine
  LAN-IP **stürzt die App beim Sessionstart ab**, sie installiert sich nicht bloß nicht.

## Therapeuten-App

Eigene Anwendung unter `/therapeut/`, eigene Anmeldung mit Cookie — **kein PIN-Bereich mehr in der
Kind-App**. Auf Bens Tablet liegt dadurch nie eine Klientenliste.

Einstellbar: Schwierigkeit/Toleranz/Zielgeschwindigkeit/Mindesttrefferquote je Übungstyp, Spiele
weglassen, Reihenfolge, Übungen verlängern/verkürzen, Pausendauer und -inhalt. Dazu Verlauf,
Wochenbericht, Gerätekopplung samt Sperre und **Profil löschen (Art. 17)**.

Gelöscht wird hier und nicht auf dem Tablet: dort läge die Funktion hinter einer Kindersicherung,
und die Daten liegen ohnehin auf dem Server. Ein verlorenes Tablet wird durch **Sperren des
Gerätetokens** unschädlich gemacht — ein Knopf auf dem Gerät täte das nicht.

## Content

Vereine, Profis und Dialoge als **TypeScript-Objekte mit Schema-Validierung** in
`apps/web/src/content/`. Tagespläne stehen dort **nicht** mehr — siehe „Woher die Übungen des
Tages kommen". Neuer Verein = eine Datei + Bilderordner. Typsicher, und ein fehlendes
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

Erledigt: Gerüst und Startbildschirm · Erstlauf mit Spielnamen per Stift · Ansage · Segment-Engine ·
Lob → Selbsteinschätzung → Pause mit Timer · Abschluss-Fragebogen · Therapeuten-App mit
Einstellungen und Verlauf · Gerätekopplung, Datenannahme, Auswertung in C#, Wochenbericht ·
Pausenmenü · Onboarding beim ersten Spiel. Sechs Minispiele statt einem: **Aufwärmen**,
**Ball hochhalten**, **Platzwart**, **Linie malen**, **Autogrammstunde**, **Brezelverkauf**.

Phase 1 ist damit abgearbeitet. Das Onboarding erklärt der Profi in einer Sprechblase; **Pfeile
auf einzelne Spielelemente gibt es nicht** — die bräuchten pro Spiel Wissen über dessen Canvas.
Nachrüsten, falls sich beim Ausprobieren mit Ben zeigt, dass der Satz allein nicht trägt.

**Wenn ein neues Minispiel dazukommt**, muss es an vier Stellen eingetragen werden — die
Komponente selbst (`apps/web/src/spiele/index.ts`) nicht mitgezählt:

| Datei | Was fehlt sonst |
|---|---|
| `apps/web/src/spiele/katalog.ts` | Titel, Anweisung, Rolle, Bereiche — ohne den Eintrag kommt das Spiel im Tagesplan gar nicht vor |
| `apps/api/Auswertung/Spielkatalog.cs` | Rolle und Bereiche auf dem Server. Fehlt es, gilt es als normale Übung ohne Bereich und taucht im Wochenbericht unter „Ohne Zuordnung" mit einem Hinweis auf |
| `apps/api/Daten/Seed.cs` | die Einstellungszeile des Demo-Kindes. Ohne sie kann Thomas Stufe und Dauer für dieses Spiel nicht einstellen |
| `apps/therapeut/src/api.ts` (`SPIEL_TITEL`) | der Klartextname. Ohne ihn steht in der Therapeuten-App die rohe Spiel-ID |

**Arbeitsteilung für 3 Personen:** so schneiden, dass jedes Minispiel isoliert baubar ist und
niemand in denselben Dateien arbeitet. Zwei Regeln haben sich als bindend erwiesen: **eine Person
besitzt das Datenbankschema** (nie zwei offene EF-Migrationen), und **vor `dotnet ef migrations
add` immer erst mergen**.

## Explizit nicht bauen

Gems, Shop, Trikots, eigene Mannschaft, Streak/Serien (bewusst gestrichen — ein Streak bestraft
Krankheit und Ferien). Elternbereich. Automatische Bildauswertung des Papierfotos.
Datenexport als Feature. Millimeter-genaue Kalibrierung (Toleranz bleibt einheitenlos).
Offline-Betrieb, Outbox, Sync-Protokoll. Einladungsflow für weitere Therapeuten (nur Ausblick im
Bericht). Bild-Upload der Arbeitsproben — das Schema steht, der Endpunkt kommt später.

## Offene Punkte

**Vor der Vorführung auf echten Tablets nötig:**

- **HTTPS unter festem Namen** (Hosts-Eintrag + Zertifikat mit diesem Namen im SAN). Umgebungs-
  arbeit, kein Code — aber ohne sie stürzt die App auf dem iPad beim Sessionstart ab, siehe
  Speicher-Fallstricke.
- **D1-Absatz in das Berichtsdokument einfügen.** Der fertige Text steht in
  `docs/entscheidungen.md` unter „Textbaustein D1"; das Berichtsdokument selbst liegt nicht im
  Repo, deshalb bleibt das Einfügen Handarbeit.

**Danach:**

- Startbildschirm-Gestaltung und Reise-Animation im Detail
- Die weiteren Minispiele. Kandidaten aus der Ideenliste, mit ihren Mechaniken:
  - **Dribbeln mit Pfiff** (Inhibition): bei Trainerpfiff Stift anhalten, aber **nicht abheben**;
    Doppelpfiff = weiter. Beim Abheben rollt der Ball weg
  - **Tour Guide / Stationentour** (Tempo + Druck): Fakten in gleichmäßigem Tempo und Druck
    nachschreiben — zu schnell oder zu langsam, und die Besucher gehen
  - **11 Meter** (Hand-Auge): Schnelligkeit und gleichmäßiger Druck; sonst hält der Torwart
  - Weitere in `Übungs Ideen.md` (Security, UFO/Müll einsammeln, Startelf-Namen schreiben)
- Ob echte Vereinsassets durch fiktive ersetzt werden
