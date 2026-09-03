# TravelKickers

Ergotherapie-Lernapp zur Schreibmotorik. LF10a, Gruppe 16.
Fachlicher Hintergrund und Anforderungs-IDs: siehe `CLAUDE.md`.

## Starten

Alles zusammen, so wie es vorgeführt wird — baut beide Frontends und startet den Server:

```bash
powershell -File start.ps1
```

Danach: Kindmodus `http://localhost:5099/`, Therapeutenbereich `http://localhost:5099/therapeut/`.

Zum Entwickeln einzeln.

Kind-App:

```bash
cd apps/web
npm install
npm run dev     # http://localhost:5173
npm test        # Auswertung der Ablauflogik
npm run build
```

Therapeuten-App:

```bash
cd apps/therapeut
npm install
npm run dev     # http://localhost:5174
```

Server:

```bash
cd apps/api
dotnet run      # http://localhost:5099
```

Beide Vite-Server leiten `/api` an den Server weiter — dieselbe Origin wie später, deshalb
funktioniert das Anmelde-Cookie auch beim Entwickeln ohne CORS.

```bash
dotnet test     # Zugriffsregel, Art. 17, Idempotenz der Datenannahme
```

**Voraussetzung: .NET 8.** Auf einem Rechner mit .NET-10-SDK reicht `Microsoft.DotNet.AspNetCore.8`
allein **nicht** — es fehlt die Basis-Runtime. Beide installieren:

```bash
winget install Microsoft.DotNet.Runtime.8
```

Ohne sie baut das Projekt, startet aber nicht. Nach `dotnet ef migrations add …` immer neu bauen,
sonst findet `Migrate()` die Migration nicht und legt eine leere Datenbank an.

Demo-Konto aus dem Seed: `thomas@praxis.test` / `travelkickers`.

## Aufbau

```
apps/web/          Kind-App (Tablet)
apps/therapeut/    Therapeuten-App (Laptop), ausgeliefert unter /therapeut/
apps/api/          Server: Minimal API, EF Core + SQLite, Auswertung in C#
apps/api.tests/    xUnit
```

Alles läuft unter **einer** Adresse: der Server liefert beide gebauten Frontends aus `wwwroot`.
Kein CORS, kein zweiter Port.

```
apps/web/src/
  engine/      Segment-Engine: Tagesablauf als lineare Liste + Reducer
  content/     Vereine als Datenpakete (ein Verein = eine Datei)
  spiele/      Minispiele, je eines pro Ordner, hinter einer gemeinsamen Schnittstelle
  screens/     Bildschirme des Kindmodus
  ui/          Figuren, Vorlesen (Web Speech)
  eingabe.ts   Stift, Maus und Tastatur-Ersatzdruck — von allen Spielen genutzt
  rohdaten.ts  Punktfolge als Float32-Blob (B4) — aufgezeichnet im SpielScreen
  api.ts       Aufrufe an den Server, von Hand geschrieben
```

**Die Rohdatenaufzeichnung sitzt im `SpielScreen`, nicht in den Spielen.** Die Zeigerereignisse
steigen aus dem Canvas dorthin auf — jedes Minispiel zeichnet damit auf, ohne eine Zeile dafür zu
enthalten. Wer ein neues Spiel baut, muss an B4 nicht denken.

**Der Trainingstag ist eine Liste, kein Zustandsautomat.** `engine/tagesplan.ts` baut sie,
`engine/session.ts` läuft sie ab und schreibt dabei ein append-only Ereignisprotokoll.
Die Reihenfolge *Selbsteinschätzung vor Lob* (C3) steht in der Liste und ist durch einen
Test abgesichert — sie umzudrehen macht die Messung wertlos.

## Ein Minispiel bauen

Neue Datei in `src/spiele/`, die `SpielProps` entgegennimmt und `onFertig(ergebnis)` aufruft.
Danach in `src/spiele/index.ts` beim passenden Eintrag `Komponente` austauschen. Sonst nichts —
zwei Personen arbeiten dadurch nie in derselben Datei.

Eine Pflicht gibt es: **auf `angehalten` reagieren** und die Bildschleife anhalten. Sonst läuft
das Spiel weiter, während das Pausenmenü offen ist. Zum Ausprobieren einzelner Spiele gibt es
`npm run dev` → `/probe.html` mit Auswahl, Stufe, Dauer und einem Anhalte-Schalter.

Die Zahlen in `SpielErgebnis` sind **unmaßgeblich**: sie erzeugen das Sofortfeedback aus A1.
Die Kennzahlen für den Bericht rechnet später C# aus der Rohdaten-Punktfolge.

### Vorlage: „Ball hochhalten"

Fertig sind zwei Spiele: `src/spiele/ballhochhalten/` und `src/spiele/rasenmaehen/`. Das erste ist
bewusst in vier Dateien geteilt, damit man jede einzeln erklären kann:

| Datei | Inhalt |
|---|---|
| `welt.ts` | Zustand, Physik, Bewertung. Kennt **kein** Canvas und **kein** React — deshalb mit vitest testbar |
| `zeichnen.ts` | Nur Zeichnen. Liest die Welt, verändert sie nie |
| `klang.ts` | Töne über WebAudio, keine Audiodateien nötig. Lautstärke und Stummschaltung kommen aus `bedienung.ts` (A4) |
| `index.tsx` | Hält Canvas, Eingabe und Bildschleife zusammen |

Gespielt wird mit dem Stift: Ball antippen, der Andruck **beim Loslassen** bestimmt die Höhe,
die Lage des Stifts zur Ballmitte die Richtung. Ohne Stift greift der Ersatz aus `eingabe.ts`
(Maustaste = Stift auf Papier, Ziffern 1–9 = 10–90 % Druck, 0 = 100 %); solche Werte werden als
`synthetisch` markiert, sonst mischen sie sich mit echten Pencil-Druckkurven.

## Noch offen

- Weitere Minispiele — fertig sind „Ball hochhalten" und „Platzwart", der Rest zeigt `Platzhalter`
- Onboarding beim ersten Spiel (Pfeile + Erklärung des Profis)
- Abschiedsgeschenk per Kamera und der Upload der Arbeitsproben (Schema steht, Endpunkt fehlt)
- HTTPS unter festem Namen — nötig für echte iPads, sonst stürzt die App beim Sessionstart ab
- Vereinsassets sind Platzhalter mit echten Bezügen und müssen vor einer Veröffentlichung ersetzt werden
