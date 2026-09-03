# TravelKickers

Ergotherapie-Lernapp zur Schreibmotorik. LF10a, Gruppe 16.
Fachlicher Hintergrund und Anforderungs-IDs: siehe `CLAUDE.md`.

## Starten

Kind-App:

```bash
cd apps/web
npm install
npm run dev     # http://localhost:5173
npm test        # Auswertung der Ablauflogik
npm run build
```

Server:

```bash
cd apps/api
dotnet run      # http://localhost:5099
```

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
apps/web/src/
  engine/      Segment-Engine: Tagesablauf als lineare Liste + Reducer
  content/     Vereine als Datenpakete (ein Verein = eine Datei)
  spiele/      Minispiele, je eines pro Ordner, hinter einer gemeinsamen Schnittstelle
  screens/     Bildschirme des Kindmodus
  ui/          Figuren, Vorlesen (Web Speech)
  eingabe.ts   Stift, Maus und Tastatur-Ersatzdruck — von allen Spielen genutzt
```

**Der Trainingstag ist eine Liste, kein Zustandsautomat.** `engine/tagesplan.ts` baut sie,
`engine/session.ts` läuft sie ab und schreibt dabei ein append-only Ereignisprotokoll.
Die Reihenfolge *Selbsteinschätzung vor Lob* (C3) steht in der Liste und ist durch einen
Test abgesichert — sie umzudrehen macht die Messung wertlos.

## Ein Minispiel bauen

Neue Datei in `src/spiele/`, die `SpielProps` entgegennimmt und `onFertig(ergebnis)` aufruft.
Danach in `src/spiele/index.ts` beim passenden Eintrag `Komponente` austauschen. Sonst nichts —
zwei Personen arbeiten dadurch nie in derselben Datei.

Die Zahlen in `SpielErgebnis` sind **unmaßgeblich**: sie erzeugen das Sofortfeedback aus A1.
Die Kennzahlen für den Bericht rechnet später C# aus der Rohdaten-Punktfolge.

### Vorlage: „Ball hochhalten"

Das erste fertige Spiel liegt in `src/spiele/ballhochhalten/` und ist bewusst in vier Dateien
geteilt, damit man jede einzeln erklären kann:

| Datei | Inhalt |
|---|---|
| `welt.ts` | Zustand, Physik, Bewertung. Kennt **kein** Canvas und **kein** React — deshalb mit vitest testbar |
| `zeichnen.ts` | Nur Zeichnen. Liest die Welt, verändert sie nie |
| `klang.ts` | Töne über WebAudio, keine Audiodateien im Offline-Cache (A4: abschaltbar) |
| `index.tsx` | Hält Canvas, Eingabe und Bildschleife zusammen |

Gespielt wird mit dem Stift: Ball antippen, der Andruck **beim Loslassen** bestimmt die Höhe,
die Lage des Stifts zur Ballmitte die Richtung. Ohne Stift greift der Ersatz aus `eingabe.ts`
(Maustaste = Stift auf Papier, Ziffern 1–9 = 10–90 % Druck, 0 = 100 %); solche Werte werden als
`synthetisch` markiert, sonst mischen sie sich mit echten Pencil-Druckkurven.

## Noch offen

- Minispiele „Linie malen", Aufwärmparcours, Autogrammstunde, Platzwart — zeigen bis dahin `Platzhalter`
- Rohdatenaufzeichnung (Punktfolge als Float32-Blob) und Dexie/IndexedDB statt localStorage
- Therapeuteneinstellungen wirken noch nicht auf den Tagesplan (B1): `standardEinstellungen` in `App.tsx`
- Onboarding beim ersten Spiel, Abschiedsgeschenk per Kamera, Sync-Server
- Vereinsassets sind Platzhalter mit echten Bezügen und müssen vor einer Veröffentlichung ersetzt werden
