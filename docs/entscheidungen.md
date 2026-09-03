# Entscheidungen — Backend, Datenbank, Therapeutenbereich

Stand: 03.09.2026. Branch `backend`.

Dieses Dokument hält fest, **was entschieden wurde und warum**, damit spätere Sitzungen (auch
andere Claude-Sitzungen) nicht dieselben Fragen erneut aufmachen. `CLAUDE.md` bleibt das fachliche
Dokument mit den Anforderungs-IDs; hier stehen nur die Entscheidungen, die danach getroffen wurden.

**Regel für spätere Sitzungen:** Wird eine Entscheidung von hier geändert, wird sie hier
durchgestrichen begründet, nicht stillschweigend überschrieben.

---

## 1. Grundsatz

Der Datenschutzpunkt aus **D4 („nur lokal")** wird bewusst aufgeweicht: die Lehrkraft verlangt ein
Backend. Das ist eine **abgesprochene Abweichung von LN1**, keine übersehene Anforderung — sie
gehört so in den Bericht, sonst liest sie sich wie ein Fehler.

Alles Weitere richtet sich nach einer harten Nebenbedingung: **jedes Gruppenmitglied muss seinen
Code in der mündlichen Prüfung erklären können.** Wo eine Entscheidung zwischen „mächtiger" und
„erklärbar" steht, gewinnt „erklärbar".

## 2. Topologie

| Teil | Technik | Läuft auf |
|---|---|---|
| Kind-App | React 19 + Vite (bestehend, `apps/web`) | Tablet des Kindes |
| Server | ASP.NET Core Minimal API + EF Core | Server (in der Vorführung: derselbe Rechner) |
| Therapeuten-App | React + Vite (**nicht** Razor) | Laptop des Therapeuten |

Der Therapeutenbereich **verschwindet aus der Kind-App** und wird eine eigene Anwendung. Auf dem
Tablet bleibt nur ein kleines, per Langdruck erreichbares **Gerätemenü** (Kopplung, Sync-Status,
Speicherwarnung, lokale Daten löschen) — das ist kein Therapeutenbereich und darf im Bericht auch
nicht so heißen, sonst liest sich D1 wie nicht erfüllt.

Ein PowerShell-Skript startet alle Teile für die Vorführung.

### Warum React statt Razor für die Therapeuten-App
Entscheidung des Nutzers: dieselbe Technologie wie die Kind-App, die Gruppe kann React bereits.
Preis: der Wochenbericht (D3) wird Druck-CSS in React statt einer Razor-View — **`CLAUDE.md` nennt
an dieser Stelle noch Razor und muss angepasst werden.**

### Eine Origin
Der Server liefert beide gebauten Frontends aus (`/` = Kind-App, `/therapeut/` = Therapeuten-App).
Eine Origin, ein Zertifikat, kein CORS, Cookie-Authentifizierung ohne Token-Handling in JavaScript.

**Nicht `localhost`, sondern ein fester Name** (z. B. `travelkickers.local` per Hosts-Eintrag) mit
einem Zertifikat, das diesen Namen im SAN führt. Grund: die Origin ist der Schlüssel von IndexedDB
und der Service-Worker-Registrierung. Ändert sie sich, verliert das Tablet seine lokalen Daten.

**Verifiziert und wichtig:** `apps/web/src/engine/session.ts` ruft `crypto.randomUUID()` auf. Das ist
auf einer unsicheren Origin `undefined` — über `http://` auf eine LAN-IP **stürzt die App ab**, sie
installiert sich nicht bloß nicht.

Wenn die Kind-App PWA bleibt, braucht der Service Worker eine `navigateFallbackDenylist` für
`/api` und `/therapeut`, sonst fängt er die Navigation zur Therapeuten-App ab.

## 3. Online statt Offline — geänderte Entscheidung

**Die Offline-Anforderung ist gestrichen.** Die Anwendung ist reine Online-Software, alles wird auf
dem Server verwaltet und gespeichert.

Das ist eine Vereinfachung, keine Lücke: **Offline ist keine der bewerteten Anforderungen
A1–D4.** Es war eine technische Entscheidung in `CLAUDE.md`, begründet mit einer möglichen
Internetsperre beim Kind. Diese Begründung entfällt bewusst.

Folgen:
- Outbox, Sync-Cursor, Konfliktbehandlung und das ganze Sync-Protokoll **entfallen**.
- Ein WLAN-Aussetzer ist trotzdem kein Sonderfall, sondern Normalbetrieb. Die minimale Absicherung
  (Wiederholung eines fehlgeschlagenen Uploads) bleibt nötig — sie ist kein Offline-Betrieb.
- **Manifest bleibt, Service Worker fliegt raus.** Die Eigenschaft, die gebraucht wird — App-Symbol
  auf dem Homescreen, Vollbild, Landscape, kein sichtbarer Browser — hängt am **Manifest**. Der
  Service Worker war ausschließlich für Offline da und bringt jetzt nur noch Cache-Probleme beim
  Vorführen („warum sehe ich die alte Version?"). `vite-plugin-pwa` bleibt für das Manifest,
  `injectRegister: null` / kein `registerSW`.
- Damit wird auch die Safari-7-Tage-Warnung in `TherapeutScreen.tsx` gegenstandslos — sie
  verschwindet mit dem Bildschirm.

## 4. Konten und Zugriff

**Erster Ausbau: ein Therapeut, ein Kind.** Mehrbenutzerfähigkeit wird nur im Schema vorbereitet,
nicht gebaut. Der Einladungsflow für weitere Therapeuten ist **Ausblick im Bericht**, kein Code.

Drei Schema-Entscheidungen, die heute stimmen müssen, weil sie sich später nicht reparieren lassen:

1. **`Therapeut.Id` ist eine GUID, nicht die E-Mail.** Sonst zerbricht jeder Fremdschlüssel, sobald
   jemand heiratet oder die Praxis wechselt.
2. **Die Beziehung Therapeut↔Klient liegt ab Tag 1 in einer eigenen Tabelle** `Betreuung(TherapeutId,
   KlientId, Von, Bis?)`, auch wenn es zunächst genau ein Paar gibt. Ein `Klient.TherapeutId` später
   auf n:m umzubauen ist eine Datenmigration, kein Refactoring — und die Vertretung bei Krankheit
   ist eine Anforderung.
3. **Passwort-Hashing mit `PasswordHasher<Therapeut>`.** Der eine Baustein aus ASP.NET Core Identity,
   den man nicht selbst schreiben sollte (PBKDF2-HMAC-SHA256, zufälliges Salt, zeitkonstanter
   Vergleich). **Identity als Ganzes bleibt draußen** — es brächte sieben Tabellen und Spalten wie
   `SecurityStamp`, `ConcurrencyStamp`, `LockoutEnd` ins ERD, und das ERD wird bewertet.

**Keine `PraxisId`, keine Praxis-Tabelle.** Der Prüfungssatz lautet: *„Zugriff steht in der Tabelle
Betreuung, nicht in einer Spalte Praxis — eine zweite Praxis ändert an der Zugriffsprüfung nichts."*
Das beantwortet alle harten Fälle von selbst: Therapeut in zwei Praxen, Vertretung aus einer fremden
Praxis, Kind mit Therapeuten aus zwei Praxen.

**Kein EF Core Global Query Filter.** Bewusst nicht: einen unsichtbaren Filter sieht man im Code der
Abfrage nicht. Stattdessen ein sichtbarer Join plus xUnit-Test. Das ist in der Prüfung erklärbar.

**Kein Zeitfenster beim Zugriff.** Der Therapeut sieht alle Daten seiner Klienten, auch aus
Zeiträumen vor oder nach einer Vertretung.

**`therapeutId` kommt nie aus dem Request**, sondern aus dem Auth-Cookie
(`User.FindFirstValue(ClaimTypes.NameIdentifier)`). Ohne das ist der Satz „Zugriff steht in
Betreuung" nicht wahr.

**Seed nicht an `IsDevelopment()` hängen.** Wenn der gebaute Ordner weitergegeben oder die `.exe`
doppelgeklickt wird, ist die Umgebung `Production`, der Seed läuft nicht, das Login gibt 401 und
niemand sieht warum.

## 5. Gerätekopplung

Der Therapeut erzeugt einen **Einmalcode mit Ablauf**, das Tablet löst ihn ein und bekommt ein
**einziges undurchsichtiges Gerätetoken**, das der Server nur als Hash speichert und einzeln sperren
kann. Kein OAuth Device Grant, kein JWT mit Refresh-Token.

- **Der Sync-Endpunkt liest die `KlientId` aus dem Token** und ignoriert jede `KlientId` im
  Request-Rumpf. Damit ist eine ganze Klasse von Zugriffsfehlern strukturell unmöglich, statt
  getestet zu werden.
- **Ein Gerät ist immer genau einem Kind zugeordnet.** Geteilte Tablets mit mehreren Kindern gibt es
  nicht. Ein Leihtablet wird vor der Übergabe zurückgesetzt.
- **Kein Rate-Limit pro IP.** In der Ein-Rechner-Vorführung kommt alles von `::1`; fünf Tippfehler
  würden die Prüfung minutenlang sperren. Stattdessen ein Fehlversuchszähler auf dem Code selbst.
- Die Kind-App ist eine **PWA, kein App-Store-Programm**. Sie wird ohnehin über einen Link geöffnet —
  der Kopplungscode kann in diesem Link stecken.
- **Die Erstkopplung passiert in der Praxis**, bevor das Tablet mitgegeben wird.

## 6. Verifizierte Befunde im bestehenden Code

Beides ist geprüft, nicht vermutet, und beides muss repariert werden:

- **`apps/web/src/App.tsx:24`** — der laufende `SessionState` (Ereignisprotokoll *und* alle
  Spielergebnisse) lebt ausschließlich in `useState`. Persistiert werden nur Verein/Tag und das
  Profil. **Ein Reload mitten in der Einheit verliert alles.** `CLAUDE.md` fordert „Fortschritt nach
  jedem Segment speichern. Neustart am selben Tag → *Weitermachen?*" — nicht umgesetzt.
- **`apps/web/src/profil.ts:47`** — `loescheProfil()` entfernt `tk.profil` und `tk.fortschritt`.
  `tk.pinHash` und `tk.tonAus` bleiben liegen. **Die Geräteseite von Art. 17 fällt heute durch.**

Außerdem: `dexie` ist als Dependency installiert und **nirgends im Code benutzt**.

## 7. Umgebung (Stand 03.09.2026)

- **Installiert: .NET SDK 10.0.400, ASP.NET Core Runtime 10.0.11. Keine .NET-8-Runtime.**
- **Visual Studio 2022 ist auf diesem Rechner nicht installiert.**
- Verifiziert: ein `net8.0`-Projekt **baut** mit dem .NET-10-SDK, lässt sich aber **nicht starten** —
  `You must install or update .NET to run this application. Framework: 'Microsoft.NETCore.App',
  version '8.0.0'`. Für `net8.0` müsste die .NET-8-Runtime nachinstalliert werden.
- Node 24.16.0, npm 11.13.0.
- **Pfadlängen-Falle:** lange Windows-Pfade brechen sowohl `git clone` (`fatal: '$GIT_DIR' too big`)
  als auch `dotnet build` (260-Zeichen-Grenze). Das Repo liegt deshalb unter
  `C:\Users\Lenn\Documents\LF10a_Gruppe16`.

## 8. Zielframework, Datenbank, Bilder

**Zielframework: `net8.0`.** Die Begründung aus `CLAUDE.md` bleibt gültig — in der Gruppe wird
Visual Studio 2022 benutzt. **Auf einem Rechner mit .NET-10-SDK muss dafür die .NET-8-Runtime
nachinstalliert werden**, sonst baut das Projekt zwar, startet aber nicht (siehe Abschnitt 7).

**Datenbank: SQLite mit EF Core Migrations.**
SQLites bekannte Schwäche sind viele gleichzeitige Schreiber und Netzlaufwerke — hier schreibt ein
Serverprozess und ein Therapeut liest. Die Rohdaten passen: ein 4-Minuten-Spiel bei 60 Hz sind
~14.000 Abtastungen, gut 200 KB pro Spiel, und BLOBs dieser Größe sind für SQLite unkritisch.
Verworfen: PostgreSQL (zweiter Serverprozess am Prüfungstag), SQL Server LocalDB/Express (weitere
Installation auf dem Vorführrechner), LiteDB und JSON-Dateien (kosten SQL und EF Core — also genau
das, was bewertet wird).

Migrations statt `EnsureCreated()`, weil `EnsureCreated()` bei einer bestehenden Datenbank nichts
tut: eine neue Spalte hieße „Datei löschen, alle Testdaten weg". Migrations machen daraus ein
`ALTER TABLE ADD COLUMN`. Pakete: `Microsoft.EntityFrameworkCore.Sqlite` und
`…EntityFrameworkCore.Design`, dazu einmalig `dotnet tool install --global dotnet-ef`.
**Regel für drei Personen: vor `dotnet ef migrations add` immer erst mergen** — sonst kollidieren
zwei Migrationen im Modell-Snapshot.

**Handschriftprobe und Abschiedsgeschenk-Foto werden hochgeladen — aber es gibt keinen
Elternbereich in der Software.** Beide Bilder liegen auf dem Server und werden Thomas angezeigt.
Was die Eltern bekommen, entscheidet und übergibt Thomas im Gespräch, auf Papier. Damit bleiben
**D1 („kein Elternbereich")** und **D3 („nicht für Eltern")** unverändert erfüllt und LN1 braucht
keinen zweiten Änderungsantrag.

Dass diese beiden Bilder auf dem Server liegen, geht allerdings über **D4 („nur Vorname +
Jahrgang")** hinaus — eine Handschriftprobe ist mehr als ein Vorname. Das gehört **in dieselbe
dokumentierte D4-Abweichung** wie das Backend selbst, nicht als eigene Ausnahme.
Konsequenzen für den Code: eigener Endpunkt und eigene Tabelle (nicht Base64 in
`SpielErgebnis.extra`), Größen- und Content-Type-Grenze, Foto vor dem Hochladen auf ~1600 px
herunterrechnen, und **beide werden bei Art. 17 mitgelöscht**.

## 9. Offen

- Aufteilung der Arbeitspakete auf drei Personen.
- Neuzuordnung von **D1** im Bericht: „Therapeutenbereich per PIN" beschreibt nach der Auslagerung
  nicht mehr die Kind-App, sondern die eigene Therapeuten-App. Ohne diesen Satz liest sich die
  verschwundene PIN wie eine nicht erfüllte Anforderung.
- `CLAUDE.md` nennt den Wochenbericht noch als „Razor-View + CSS `@media print`" und Dexie/Offline
  als Techstack — beides ist überholt und muss angepasst werden.

## 10. Verworfen — und warum

| Verworfen | Grund |
|---|---|
| ASP.NET Core Identity (vollständig) | Sieben Tabellen und ~20 unerklärbare Spalten im bewerteten ERD |
| OIDC / Entra ID / Keycloak | Braucht Internet oder einen zweiten Serverprozess; bei Ein-Rechner-Vorführung ein Ausfallrisiko ohne Punktgewinn |
| SCIM | Rechnet sich ab dreistelligen Nutzerzahlen |
| Selbstregistrierung | Offenes Registrierungsformular bei Gesundheitsdaten eines Kindes |
| JWT für Einladung und Kopplung | Das Token wird ohnehin in der DB nachgeschlagen; wer nachschlägt, braucht keine Signatur |
| Razor für die Therapeuten-App | Gruppe kann React, will eine Technologie |
| Docker Compose für die Vorführung | Zusätzliche Fehlerquelle am Prüfungstag ohne Punktgewinn |
| EF Core Global Query Filter | Unsichtbar im Code der Abfrage, dadurch in der Prüfung nicht erklärbar |
| Praxis-/Tenant-Tabelle heute | `Betreuung` beantwortet alle Mehrpraxen-Fälle ohne zusätzliche Spalte |
| Sync-Protokoll, Outbox, Cursor | Offline-Anforderung gestrichen |
| Rate-Limit pro IP | Alles kommt in der Vorführung von `::1` |
| Service Worker | War nur für Offline da; das Manifest allein liefert Homescreen-Symbol, Vollbild und Landscape |
| Elternbereich in der Software | D1 und D3 schließen ihn aus; Thomas übergibt im Gespräch auf Papier |
| PostgreSQL / LocalDB / LiteDB / JSON | Siehe Abschnitt 8 |
| `EnsureCreated()` | Verliert bei jeder Schema-Änderung alle Testdaten |
