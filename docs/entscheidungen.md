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
- **Manifest bleibt, Service Worker fliegt raus.** Der Service Worker war ausschließlich für Offline
  da und ist jetzt nur noch eine Fehlerquelle (veraltete `index.html` aus dem Cache nach einem
  Deploy — „warum sehe ich die alte Version?").
- **Beim Entfernen einmalig `unregister()` aufrufen.** Der bisherige `registerType: 'autoUpdate'`
  hat sich auf jedem Gerät eingetragen, das je einen Build gesehen hat. Ohne expliziten
  `navigator.serviceWorker.getRegistrations()` → `unregister()` in `main.tsx` liefert dieser
  Service Worker dort **dauerhaft die alte App aus**, egal was auf dem Server steht.
- **Vollbild auf dem iPad kommt NICHT aus dem Manifest** — iPadOS beachtet weder
  `display: fullscreen` noch einen Orientierungs-Lock. Es kommt aus
  `<meta name="apple-mobile-web-app-capable" content="yes">`, verifiziert in
  `apps/web/index.html:12`. Das Manifest liefert Homescreen-Symbol und Name. **Wichtig für die
  mündliche Prüfung** — die naheliegende Antwort „das macht das Manifest" ist falsch.
- **`navigator.storage.persist()` (`main.tsx:9`) und die Installationswarnung bleiben, werden aber
  umgeschrieben.** Sie schützen nicht mehr die Therapiedaten (die liegen auf dem Server), sondern
  das **Gerätetoken**. Wirft Safari die Website-Daten nach ~7 Tagen Pause weg, verliert das Tablet
  seine Kopplung — nach Ferien oder Krankheit ist das ein ausgefallener Praxistermin, und die
  Erstkopplung passiert laut Abschnitt 5 in der Praxis.

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

- **`nameBild` ist write-only.** Geschrieben in `App.tsx:79`, deklariert in `profil.ts:14`,
  **nirgends gelesen**. Ein gespeichertes Bild der Handschrift eines Kindes ohne jeden Verwendungs-
  zweck ist heute die einzige echte D4-Verletzung im Projekt. Mit der Entscheidung aus Abschnitt 8
  (Arbeitsprobe für Thomas) bekommt es einen Zweck — bis der Upload gebaut ist, bleibt es zwecklos
  gespeichert.

Außerdem: `dexie` ist als Dependency installiert und **nirgends im Code benutzt**.

### Reload-Bug: Lösung auf dem Tablet, nicht im Backend

**Korrigiert.** Die naheliegende Online-Lösung („nach jedem Segment an den Server, beim Neustart von
dort wiederherstellen") ist die **schlechtere**. Zwei Gründe:

1. Der `SessionState` enthält `segmente`, `index`, `ergebnisse`, `einschaetzungen`, `events`
   (`engine/session.ts:17-29`). Zum Wiederherstellen müsste entweder der Server den kompletten
   Tagesplan samt Content und Einstellungen kennen, oder der Client baut ihn neu — und baut ihn nach
   einer Einstellungsänderung **anders**, womit `index` in eine andere Liste zeigt und Ben ein Spiel
   überspringt oder wiederholt, ohne dass es jemand merkt.
2. Der Fall, gegen den man sich absichert, ist genau der Fall, in dem das Netz weg ist. Eine
   Wiederherstellung, die den Server braucht, hilft ausgerechnet dann nicht.

Stattdessen: ein Schnappschuss des `SessionState` in `localStorage` unter `tk.lauf`, ~20 Zeilen.
Er speichert die Segmentliste mit und ist dadurch immun gegen Einstellungsänderungen mitten in der
Einheit. Vier Details, ohne die er kaputtgeht:

- Zusatzfelder `gespeichertAm` und `gesendet`.
- Reihenfolge: erst `PUT`, erst bei bestätigter Antwort `gesendet = true`, **erst dann löschen**.
  Der `useEffect` darf `tk.lauf` nie löschen, nur weil `lauf` auf `null` gesetzt wurde.
- Der Retry beim Start nimmt **jeden** ungesendeten Schnappschuss. Ist er von einem früheren Tag,
  wird er vor dem Senden auf `abgebrochen` gesetzt und bekommt ein `abbruch`-Ereignis — das ist die
  Abbruchregel aus CLAUDE.md und D2.
- Ein eigenes Flag für den „Weitermachen?"-Bildschirm, sonst fällt die App direkt ins laufende Spiel
  zurück, statt zu fragen.

Die Einheit geht am Ende als **ein** `PUT /api/sessions/{sessionId}` raus. Weil die `sessionId`
client-seitig erzeugt wird, ist ein Wiederholversuch ein Upsert statt eines Duplikats. Das ist die
komplette Absicherung gegen einen WLAN-Aussetzer — keine Outbox, kein Cursor.

## 7. Umgebung (Stand 03.09.2026)

- **Installiert: .NET SDK 10.0.400, ASP.NET Core Runtime 10.0.11. Keine .NET-8-Runtime.**
- **Visual Studio 2022 ist auf diesem Rechner nicht installiert.**
- Verifiziert: ein `net8.0`-Projekt **baut** mit dem .NET-10-SDK, lässt sich aber **nicht starten** —
  `You must install or update .NET to run this application. Framework: 'Microsoft.NETCore.App',
  version '8.0.0'`.
- **Zwei Pakete, nicht eines.** `winget install Microsoft.DotNet.AspNetCore.8` allein reicht
  **nicht** — es liefert nur `Microsoft.AspNetCore.App 8.0.30`. Es fehlt die Basis-Runtime
  `Microsoft.NETCore.App 8.x`: `winget install Microsoft.DotNet.Runtime.8`. Ohne sie startet die
  API nicht, obwohl `dotnet --list-runtimes` „ASP.NET Core 8" anzeigt. Notbehelf zum Testen:
  Umgebungsvariable `DOTNET_ROLL_FORWARD=Major`.
- `dotnet` liegt nicht im PATH der Git-Bash — dort `export PATH="$PATH:/c/Program Files/dotnet"`.
- `dotnet-ef` 8.0.30 ist global installiert (`~/.dotnet/tools`).
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

### Details, die vor der ersten Migration feststehen müssen

- **Entitäten:** Therapeut, Klient, Betreuung, Gerät, Kopplungscode, **Einstellungen** (B1),
  Session, **SessionEvent** (D2 + Abbruch als Befund), Spielergebnis **mit Selbsteinschätzung**
  (C3), Rohdaten, Anhang. Ohne Einstellungen, SessionEvent und Selbsteinschätzung sind **B1, D2 und
  C3 nicht erfüllbar** — und die drei werden benotet.
- **GUID nur für client-erzeugte Entitäten** (Session, SessionEvent, Spielergebnis, Rohdaten), mit
  `UNIQUE` auf der `sessionId`; Begründung ist Idempotenz eines wiederholten POST. Für Therapeut,
  Klient, Betreuung, Einstellungen `int`-Autoincrement — liest sich im bewerteten ERD besser.
- **Rohdaten in eigener Tabelle** (1:1 zur Session). Begründung ist EF Core, nicht SQLite: EF
  materialisiert das `byte[]` bei jeder Abfrage der Entität mit.
- **Verbindungszeichenfolge über einen absoluten Pfad** aus `AppContext.BaseDirectory` (oder
  `-WorkingDirectory` im Startskript). Sonst legt `Migrate()` am Vorführtag still eine leere
  Datenbank an und das Login gibt 401 — ohne sichtbaren Grund.
- **Art. 17:** Cascade-Delete + xUnit-Test auf null Zeilen in jeder Tabelle als Nachweis, dazu
  `VACUUM` — sonst stehen die Bytes noch in Freelist und WAL.
- **Sicherung:** `VACUUM INTO` auf einen zweiten Datenträger nach jeder Übungseinheit. Das ist die
  wahrscheinlichste Datenverlustquelle im ganzen Projekt.
- **Eine Person besitzt das Schema.** Nie zwei offene Migrationen gleichzeitig — damit entfällt die
  Snapshot-Konfliktbehandlung ganz, statt sie zu erklären.
- **Endpunkte ohne `{klientId}` im Pfad.** Der Server liest die Klient-Zuordnung aus dem
  Gerätetoken (Abschnitt 5): `PUT /api/sessions/{sessionId}`, `GET /api/kind`, `POST
  /api/kind/bilder`. **Kein `DELETE` aus der Kind-App** — die Löschung nach Art. 17 löst die
  Therapeuten-App aus. Auf dem Tablet heißt der Knopf „Lokale Daten dieses Geräts löschen"
  (entfernt `tk.profil`, `tk.fortschritt`, `tk.pinHash`, `tk.tonAus`, `tk.lauf` und das
  Gerätetoken — zugleich der Rücksetzvorgang fürs Leihtablet) und verspricht nicht „Art. 17".
- **Bilder erst später bauen**, das Schema aber jetzt vorbereiten: eine Anhang-Tabelle
  hinzuzufügen ist eine rein additive Migration. Wenn gebaut: nur das **Kamerafoto** client-seitig
  über Canvas auf ~1600 px JPEG umkodieren — nicht nur wegen der Größe, sondern weil dabei **EXIF
  mit GPS-Standort verschwindet**. Die Handschriftprobe bleibt unverändertes PNG; JPEG würde die
  Strichkanten zerstören, und EXIF hat sie ohnehin keins.

### Wochenbericht: Fähigkeitsbereich vor Einzelübung

Die Haupttabelle des Wochenberichts fasst **nach Fähigkeitsbereich** zusammen (CLAUDE.md:
„Kategorie-Tags … für die Auswertung nach Fähigkeitsbereich"). Die Einzelübungen liegen hinter
einem bewusst unauffälligen Knopf und sind zugeklappt — D3 verlangt eine Seite, und die Aussage
ist der Bereich, nicht die einzelne Übung.

**Ein Spiel kann mehrere Bereiche tragen**, die Anzahlen summieren sich deshalb auf mehr als die
Zahl der Übungen. Der Bericht schreibt das dazu, sonst wirkt er falsch addiert.

Die Zuordnung Spiel → Bereich liegt in **`apps/api/Auswertung/Kategorien.cs`**, nicht im Frontend:
die Zusammenfassung ist Auswertung, und die gehört laut Techstack nach C#. Die Therapeuten-App
kennt nur die Beschriftungen. **Ein neues Minispiel muss dort eingetragen werden** — vergisst man
es, verschwindet es nicht still, sondern landet unter „Ohne Zuordnung" und der Bericht schreibt
einen Hinweis. Genau das ist im Test `KategorienTests` festgehalten.

### Tagesplan: gewürfelt statt fest

**Der gemeldete Fehler war strukturell.** `tagesplan()` filterte die feste Spieleliste eines
Vereinstages gegen die Einstellungen. `linie` und `aufwaermen` standen an je 9 von 10 Tagen —
wer eines abwählte, höhlte fast jeden Tag aus. Im Extremfall (nur ein Spiel aktiv) waren **8 von
10 Tagen leer**, die Einheit lief durch, meldete „fertig" und schob den Fortschritt weiter.

Behoben in zwei Schritten. Zuerst die Absicherung: eine Einheit ohne Übung startet nicht mehr.
Danach die Ursache: **es gibt keine Tagesliste mehr.**

- **Rollen** (`aufwaermen` / `normal` / `sonder`) stehen am Spiel und werden vom Content
  vergeben, nicht vom Therapeuten. Der stellt Anzahl je Rolle und den Topf ein.
- **Geordneter Zufall**, Startwert aus Verein + Tag. Nicht `Math.random()`: derselbe Tag muss
  denselben Plan ergeben, sonst bekommt Ben nach einem Abbruch etwas anderes und der Generator
  ist nicht testbar. Ohne Kind-Kennung, weil das Tablet seine `KlientId` nicht kennt.
- **Abwechslung über Fähigkeitsbereiche**, nicht über Spiel-IDs: aufeinanderfolgende Übungen
  sollen möglichst wenig gemeinsame Bereiche haben.
- **Grenzfall, bewusst dokumentiert:** bei nur einem Spiel im Topf kann „nicht dreimal
  hintereinander" nicht gelten. Erreichbar ist das nur unter Umgehung der Speichersperre; ein
  Test hält es fest, damit niemand es später für einen Fehler hält.
- **Speichersperre auf beiden Seiten:** die Oberfläche warnt und zeigt „8 von 8 aktiv — zu
  wenige für die eingestellten Plätze", der Server lehnt mit einer Meldung ab. Die Oberfläche
  ist die Bequemlichkeit, der Server die Regel.
- **Verworfen:** die Tagesliste als „Vorschlag" behalten und nur auffüllen — das hätte die
  Variation wieder an den Verein gebunden. Der Verein prägt über seine *Inhalte*
  (Kaderliste, Fakten, Sprüche), nicht über die Auswahl der Übungen.

Der Katalog liegt jetzt zweimal: `apps/web/src/spiele/katalog.ts` (Daten, ohne React, damit die
Engine ihn ohne Canvas und WebAudio lesen kann) und `apps/api/Auswertung/Spielkatalog.cs` (Rolle
und Bereiche für Prüfung und Bericht). Ein vergessener Eintrag fällt auf, statt still zu wirken.

## 9. Offen

- Aufteilung der Arbeitspakete: regelt die Gruppe selbst. **Eine Regel bleibt technisch bindend:**
  eine Person besitzt das Datenbankschema, nie zwei offene Migrationen gleichzeitig.
- `CLAUDE.md` ist an mehreren Stellen überholt und muss angepasst werden: Wochenbericht als
  „Razor-View + CSS `@media print`", Dexie als lokaler Puffer, „Sync-fähig von Anfang an" mit
  Outbox, der Abschnitt „Speicher-Fallstricke", die Erwähnungen von Offline, `.NET 8`-Begründung,
  Namensabfrage im Erstlauf, PIN und Therapeutenmodus.

## 10. Kindmodus: Namen, Menü, Ton, Pause

**Zwei Namen pro Kind.** Der Therapeut legt den Klienten mit **Vor- und Nachname** an — das ist der
Name in seiner Liste. Im Spiel fragt der Erstlauf zusätzlich einen **selbstgewählten Spielnamen**
per Stift ab („Benno"), und **nur dieser** wird für Begrüßung und Lob benutzt (C5). Die
Stiftzeichnung ist damit zugleich die erste Grafomotorik-Probe.

**Kein Jahrgang.** D4 würde ihn erlauben, aber die Software rechnet nichts Altersabhängiges: die
Toleranz bleibt laut CLAUDE.md einheitenlos, es gibt keine altersnormierten Vergleichswerte, und
Thomas kennt Bens Alter aus seiner eigenen Akte. Ein gespeicherter Jahrgang wäre damit dasselbe
wie das heutige `nameBild` — Daten ohne Leser. Zur Unterscheidung gleichnamiger Kinder dient der
Nachname. Sollten später altersabhängige Spielempfehlungen dazukommen, ist eine nullbare Spalte
eine rein additive Migration.

> **Die dokumentierte D4-Abweichung ist also der Nachname, nicht der fehlende Jahrgang.**
> Weniger zu speichern braucht keine Rechtfertigung; mehr zu speichern schon. Begründung für den
> Bericht: gleichnamige Kinder müssen in der Klientenliste unterscheidbar bleiben.

**Keine Hintergrundmusik.** Bleibt wie in `klang.ts:2` festgehalten: Ton nur funktional (A4). Falls
später doch Musik kommt, dann **nur im Startbildschirm und in der Lobby, nie während eines Spiels**
— Dauerbeschallung während einer Konzentrationsaufgabe ist genau das, was A4 verhindern soll. Das
Pausenmenü bekommt deshalb vorerst nur einen Ton-Schalter, keinen getrennten Musik-Schalter.

**Kein PIN, kein Therapeutenbereich, keine Löschfunktion auf dem Tablet.** `TherapeutScreen.tsx`
ist gelöscht, der Langdruck aus dem Startbildschirm entfernt. Art. 17 löst der
Therapeut in seiner App aus — dort liegen die Daten. Ein Leihtablet wird organisatorisch
zurückgesetzt; zusätzlich **widerruft der Therapeut das Gerätetoken serverseitig**. Das ist besser
als ein Knopf auf dem Gerät, weil es auch bei einem verlorenen Tablet wirkt.

> **D1 muss im Bericht neu zugeordnet werden.** „Kindmodus Standard, Therapeutenbereich per PIN"
> beschreibt die Kind-App jetzt nicht mehr. Die zwei Ansichten sind Kind-App und Therapeuten-App;
> die Trennung ist stärker als vorher (eigene Anwendung, echte Anmeldung statt Kindersicherung),
> aber ohne diesen Satz liest ein Prüfer die verschwundene PIN als nicht erfüllte Anforderung.

#### Textbaustein D1 — wörtlich für den Bericht

Der folgende Absatz gehört in das Kapitel zur Anforderungserfüllung, direkt zu D1. Er steht hier
und nicht im Berichtsdokument, weil das Dokument nicht im Repository liegt — beim Einfügen bitte
gegen die dortige Nummerierung und Zitierweise prüfen.

> **D1 — Zwei Ansichten (während der Implementierung geändert, Anforderung erfüllt)**
>
> LN1 sah als zweite Ansicht einen Therapeutenbereich vor, der innerhalb der Kind-Anwendung
> über eine PIN erreichbar ist. Umgesetzt wurden stattdessen **zwei getrennte Anwendungen**: die
> Kind-Anwendung unter `/` und die Therapeuten-Anwendung unter `/therapeut/`, letztere mit
> eigener Anmeldung über E-Mail und Passwort. In der Kind-Anwendung gibt es keine PIN-Abfrage
> und keinen verborgenen Bereich mehr.
>
> **Diese Änderung ist nicht Teil der Planung, sondern während der Implementierung entstanden.**
> Der Planungsteil wurde am 29.08.2026 abgegeben und beschrieb den PIN-Bereich noch so. Am
> 03.09.2026 entstand die Therapeuten-Anwendung als eigene Anwendung — eine Folge der
> Entscheidung für ein Backend (siehe Abweichung zu D4). Damit wäre ein PIN-Bereich in der
> Kind-Anwendung eine zweite Oberfläche für dieselben Funktionen gewesen, die zusätzlich
> schlechter geschützt ist. Der PIN-Bereich wurde deshalb am selben Tag entfernt und durch das
> Pausenmenü ersetzt, das nur noch Ton, Lautstärke und Abdunkeln enthält. Der Verlauf ist in der
> Versionsgeschichte des Projekts nachvollziehbar.
>
> Die Anforderung „zwei Ansichten, Kindmodus als Standard, therapeutische Funktionen geschützt"
> ist damit erfüllt, und zwar strenger als ursprünglich geplant. Eine PIN ist eine
> Kindersicherung: Sie verbirgt eine Oberfläche, die auf dem Gerät weiterhin vorhanden ist,
> und schützt die dahinterliegenden Daten nicht. Die getrennte Anwendung dagegen verlangt eine
> echte Anmeldung, und die Daten liegen serverseitig. Auf dem Tablet des Kindes befindet sich
> dadurch zu keinem Zeitpunkt eine Klientenliste, ein Verlauf oder ein Wochenbericht — auch
> nicht verborgen.
>
> Praktisch wirkt sich das an drei Stellen aus. Erstens ist die Zuordnung Gerät zu Kind nicht
> mehr Sache der Bedienung, sondern eines Gerätetokens, das bei der Kopplung in der Praxis
> vergeben wird; die Kind-Anwendung sendet niemals eine Kennung des Kindes mit, sie steht im
> Token. Zweitens wird ein verlorenes oder entwendetes Tablet dadurch unschädlich gemacht, dass
> der Therapeut das Token serverseitig sperrt — ein Knopf auf dem Gerät selbst könnte das nicht
> leisten. Drittens wird die Löschung eines Profils nach Art. 17 DSGVO in der Therapeuten-
> Anwendung ausgelöst, also dort, wo die Daten tatsächlich liegen.
>
> Unverändert bleibt, dass es **keinen Elternbereich** gibt (D1) und der Wochenbericht
> Gesprächsgrundlage für den Therapeuten ist, nicht für die Eltern (D3).

Der Vollständigkeit halber: Die zweite Abweichung von LN1 betrifft **D4** (Backend statt rein
lokaler Speicherung, Vor- **und** Nachname statt Vorname und Jahrgang). Auch sie entstand
**während der Implementierung** und nicht in der Planung — sie geht auf die Vorgabe der Lehrkraft
zurück, ein Backend zu bauen. Begründet ist sie in Abschnitt 1 und Abschnitt 8 dieses Dokuments;
im Bericht gehört sie an dieselbe Stelle wie dieser Absatz — beide Abweichungen zusammen und
beide als das gekennzeichnet, was sie sind: nachträgliche Änderungen an einer abgegebenen Planung,
nicht übersehene Anforderungen.

**Statt des Langdrucks ein offenes Pausenmenü** (`ui/PausenMenue.tsx`, gebaut). Erreichbar im
Startbildschirm, in jedem Spiel **und in der Zwangspause**, ohne Verzögerung und ohne PIN. Beim
Öffnen steht „Das Spiel wartet auf dich." — Ben soll nicht glauben, ihm laufe gerade die Zeit
davon. Vier Elemente: Ton, Lautstärke, Bildschirm dunkler, Weiterspielen. Damit bleibt A2 gewahrt.

Der Knopf liegt in `App.tsx` über allen Bildschirmen, nicht in den einzelnen: er gehört zum Gerät
und zu keinem Segment, und derselbe Knopf an derselben Stelle ist für ein Kind eine Bedienung
statt drei.

**Beide Uhren bleiben dabei stehen** — die Spieluhr in `SpielScreen` und der Countdown der
Zwangspause. Auch die Bildschleifen der Spiele rechnen nicht weiter (`angehalten` in `SpielProps`),
sonst fiele der Ball, während Ben nicht hinsieht. Damit enthält die gemessene `dauerMs` keine
Pausenzeit: sie kommt aus `w.zeitGesamt`, und das wächst nur in `aktualisiere`.
*Nachgemessen: Spieluhr 0:46 beim Öffnen, 0:46 nach fünf Sekunden Menü. Zwangspause 27 beim
Öffnen, 27 nach sechs Sekunden.*

**Die zwei Knöpfe in der Zwangspause sind entfallen.** „Anhalten/Weiterlaufen" und „Neu starten"
macht jetzt der zentrale Knopf; übrig bleibt „Weiter", und der erscheint weiterhin erst bei 0.
Überspringen gibt es nach wie vor nicht (A3).

**A4 ist damit erst jetzt erfüllt.** Vorher steuerte `tk.tonAus` nur das Vorlesen, die
Spielgeräusche hatten eine eigene Variable, und `setStumm` wurde **nirgends aufgerufen** — die
Geräusche ließen sich gar nicht abschalten. Beides liegt jetzt in `bedienung.ts`; `klang.ts` liest
Lautstärke und Stummschaltung bei **jedem** Ton neu, weil die Bildschleife außerhalb von React
läuft und eine zwischengespeicherte Kopie sofort veraltet wäre.

**Bildschirmhelligkeit kann eine Web-App nicht steuern.** Es gibt keine Browser-Schnittstelle dafür,
auf iPadOS erst recht nicht. Gebaut ist ein **abdunkelnder Schleier** über dem Inhalt, ohne
Klickannahme — das ändert die Hintergrundbeleuchtung nicht, wirkt für ein Kind aber wie „dunkler".
Der Schalter heißt deshalb „Bildschirm dunkler" und nicht „Helligkeit".

**Verbindung ist beim Start nötig, danach nicht mehr.** Ohne Service Worker gibt es keinen
zwischengespeicherten App-Rumpf — die App lädt vom Server. Bricht die Verbindung **während** einer
Einheit ab, wird zu Ende gespielt und der Schnappschuss später nachgesendet (Abschnitt 6).

## 11. Verworfen — und warum

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
