# Ballkünstler / TravelKickers

Ergotherapie-Lernapp zur Schreibmotorik. LF10a, Gruppe 16.
Fachlicher Hintergrund und Anforderungs-IDs: siehe `CLAUDE.md`.

## Starten

```bash
cd apps/web
npm install
npm run dev     # http://localhost:5173
npm test        # Auswertung der Ablauflogik
npm run build
```

## Aufbau

```
apps/web/src/
  engine/      Segment-Engine: Tagesablauf als lineare Liste + Reducer
  content/     Vereine als Datenpakete (ein Verein = eine Datei)
  spiele/      Minispiele, je eines pro Datei, hinter einer gemeinsamen Schnittstelle
  screens/     Bildschirme des Kindmodus
  ui/          Figuren, Vorlesen (Web Speech)
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

## Noch offen

- Minispiel „Linie malen" (Phase 1, Punkt 5) — alle Spiele zeigen bis dahin `Platzhalter`
- Rohdatenaufzeichnung (Punktfolge als Float32-Blob) und Dexie/IndexedDB statt localStorage
- Therapeutenmodus: Einstellungen und Verlauf (PIN, Löschen und Speicherwarnung stehen)
- Onboarding beim ersten Spiel, Abschiedsgeschenk per Kamera, Sync-Server
