# Spielkonzepte: „Einlasskontrolle" (Security) und „Platz aufräumen" (UFO/Müll)

Stand: 13.11.2026. Beide Ideen waren nur als Name bekannt (CLAUDE.md, „Offene Punkte"); die
Mechanik ist hier neu entworfen. Nichts davon ist gebaut.

## 0. Vergleich und Empfehlung

| | **Einlasskontrolle** (`einlass`) | **Platz aufräumen** (`muell`) |
|---|---|---|
| Fußballhandlung (C1) | Ordner am Stadioneingang, Taschenkontrolle | Nach dem Abpfiff den Rasen säubern |
| Die eine Regel | Ein Gegenstand bleibt nur am Stift, **solange der Druck im Band liegt** | Was **in einem geschlossenen Kreis** liegt, holt die Seilkamera |
| Motorischer Kern | Greifen – Halten – Transportieren – Loslassen mit dosierter Kraft | Geschlossene Kreisformen, klein und rund |
| Fähigkeitsbereiche | `pinzettengriff`, `druckdosierung` | `wellen`, `hand-auge` |
| Schließt eine Lücke in B2? | **Ja** — Pinzettengriff trägt heute nur die Autogrammstunde, und die trägt ihn schlecht (Abschnitt 0.1) | Nein — `wellen` + `hand-auge` hat schon „Aufwärmen" (Branch `aufwaermen-parcours`) |
| Neue Kennzahlen in C# | `Haltewackeln`, `DruckStreuungJeStrich` (aus dem Blob), Griffe aus `extra` | `Kreise.cs`: Rundheit, Schließlücke, Drehrichtung (rein aus dem Blob) |
| Größtes Risiko | Druckwerte eines 7-Jährigen mit Pencil unbekannt; ohne Druck (Finger, Crayon) unspielbar ohne Sonderweg | Gering — keine Druckabhängigkeit, Punkt-in-Polygon ist zehn Zeilen |
| Umfang Frontend | ~900 Zeilen in 5 Dateien | ~850 Zeilen in 5 Dateien |
| Wiederverwendung | Druckband und Druckbalken aus „Platzwart", Tribüne aus „Ball hochhalten" | Rasen und Linien aus „Platzwart", Strichpuffer aus „Autogrammstunde" |

**Empfehlung: zuerst `einlass` bauen.** B2 nennt vier Bereiche, und Pinzettengriff ist der einzige,
der heute nur auf einer Behauptung steht. Das fünfte Spiel, das B2 verlangt, sollte diese Lücke
schließen statt einen schon dreifach abgedeckten Bereich (`hand-auge`) ein viertes Mal zu belegen.
`muell` ist technisch leichter und hat die schönere C#-Geschichte — es ist das richtige *zweite*
Spiel, oder das erste, falls die Pencil-Kalibrierung von `einlass` bis zur Vorführung nicht klappt.

**Neue Kategorie? Nein.** Die vorhandenen sieben tragen beide Spiele. Geprüft und verworfen:
`kreise`/`formen` (ist „Wellen und Bögen", `apps/therapeut/src/api.ts:221`) und
`visuelle-suche` für die Taschenkontrolle (das Spiel nimmt Ben die Suche bewusst ab, Abschnitt
A.2). Eine neue Kategorie kostet Einträge an drei Stellen (`katalog.ts:17-24`,
`Spielkatalog.cs`, `KATEGORIE_TITEL` in `therapeut/src/api.ts:219-228`) und eine Wochenbericht-
Zeile ohne Vergangenheit — eine Abstraktion ohne Anlass.

### 0.1 Trägt die „Autogrammstunde" den Pinzettengriff?

Nur schwach. Der Kopfkommentar (`apps/web/src/spiele/autogramme/welt.ts:11-13`) begründet den
Tag mit der Feldgröße: „ein kleines Feld erzwingt die feine Führung aus Daumen und Zeigefinger".
Nachgerechnet (Bühne 900×640, `berechneSicht` skaliert auf einem 11-Zoll-iPad im Vollbild mit
s ≈ 1,19; 1 pt ≈ 0,19 mm, also **1 Bühnenpixel ≈ 0,23 mm** — Rechnung, nicht nachgemessen):

| Stufe | `feldBreite` (`welt.ts:49`) | Feld in mm |
|---|---|---|
| 1 | 282 × 118 | ≈ 65 × 27 |
| 3 | 226 × 95 | ≈ 52 × 22 |
| 5 | 170 × 71 | ≈ 39 × 16 |

Ein 4–6 cm breites Feld ist die Größe einer normalen Unterschrift. Gezählt wird nur Strecke im
Feld (`welt.ts:173-177`), verlangt sind `2 × feldBreite` (`welt.ts:62`) — Kritzeln aus dem
Handgelenk füllt das Autogramm genauso. Es gibt kein Greifen, kein Halten, kein Loslassen und
keine Kraftvorgabe; der Druck wird aufgezeichnet, ist aber kein Kriterium. Was das Spiel trainiert,
ist **Schreiben in begrenztem Raum**. In der Prüfung hält „das Feld ist klein" einer Nachfrage
nicht stand. Vorschlag: sobald `einlass` gebaut ist, den Tag `pinzettengriff` bei `autogramme`
streichen. Achtung: der Wochenbericht gruppiert zur Abfragezeit (`Bericht.cs:163-164`), die
Änderung wirkt also rückwirkend auf alte Wochen — im Bericht erwähnen.

### 0.2 Was ein Stift auf Glas vom Pinzettengriff abbilden kann

Der Pinzettengriff ist die Opposition von Daumen- und Zeigefingerkuppe, mit der ein kleines Objekt
gefasst, mit dosierter Kraft gehalten, kontrolliert bewegt und gezielt losgelassen wird. Davon:

| Teilfähigkeit | Am iPad mit Pencil | Wie |
|---|---|---|
| Fingeropposition, Handgewölbe | **nein** | Keine Sensorik dafür. Der Stift *ist* aber im Dreipunktgriff gehalten — der Griff, auf den Pinzettentraining hinarbeitet |
| Zielen auf ein kleines Objekt | ja | Abstand Aufsetzpunkt – Objektmitte, relativ zum Objektradius |
| Kraft dosieren (nicht zerdrücken, nicht fallen lassen) | **teilweise** | Der Pencil misst die Axialkraft der Spitze, nicht die Klemmkraft der Finger. Die Dosierung ist dieselbe Steuerleistung, die Muskelgruppe nicht ganz |
| Ruhig halten (statische Stabilität) | ja | Positionsstreuung, solange der Stift im Greifmoment aufliegt |
| Kleine kontrollierte Transportbewegung | ja | Tempo, Zittern, Weglänge der Transportstrecke |
| Gezieltes Loslassen | ja | Abstand Absetzpunkt – Ablagemitte |
| Tastsinn, Objektwiderstand | **nein** | Glas ist glatt. Die fehlende Haptik ist der größte Unterschied zur Pinzette mit Erbsen |

Ehrliche Formulierung für den Bericht: *„Das Spiel trainiert die stiftgeführte Präzision mit
dosierter Kraft — Zielen, Halten, Transportieren, Loslassen. Die Fingeropposition selbst und die
Haptik kann ein Tablet nicht abbilden; dafür setzt Thomas die Pause ein."* Die Zwangspause ist
von Thomas frei belegbar (B3) — „5 Wäscheklammern an den Becher klemmen" ergänzt das Spiel genau
um das, was fehlt.

**Verworfen: echtes Kneifen mit zwei Fingern.** Wäre die einzige echte Opposition auf Glas, aber
(1) der `SpielScreen` zeichnet *jeden* Zeiger in eine Punktfolge (`SpielScreen.tsx:113-131`, ein
einziges `unten`-Flag, kein Filter auf `pointerId`) — zwei Finger verschränken sich, Zittern und
Weglänge in `Kennzahlen.cs` werden Unsinn; (2) Finger liefern auf dem iPad keinen Druck
(`eingabe.ts:44-47` fällt auf den Ersatzwert zurück); (3) die Zielplattform ist der Pencil.
**Stiftneigung** (`altitudeAngle`, Hinweis auf Faustgriff vs. Dreipunktgriff) wäre interessant,
passt aber nicht ins verbindliche Blob-Format (vier Float32) — höchstens als grober Wert je Griff
in `extra`, und Safari-Unterstützung erst auf dem Gerät prüfen.

---

# A. Einlasskontrolle (`einlass`)

## A.1 Kurzfassung

Ben ist Ordner am Stadioneingang. Ein Fan stellt seine Tasche auf den Tisch, der Scanner hat ein
paar Dinge darin markiert, die nicht ins Stadion dürfen. Ben greift jedes markierte Ding mit dem
Stift, hält es mit dosiertem Druck und legt es in die Abgabekiste — zu leicht, und es fällt
zurück; zu fest, und es flutscht weg. Ist die Tasche leer, geht der Fan durchs Drehkreuz und die
Tribüne füllt sich ein Stück.

```ts
einlass: {
  titel: 'Einlasskontrolle',
  anweisung: 'Leg die leuchtenden Sachen aus der Tasche in die Kiste.',
  rolle: 'normal',
  tags: ['pinzettengriff', 'druckdosierung'],
},
```

`druckdosierung` steht mit Absicht da: der Tagesplan meidet Überschneidungen zur vorherigen Übung
(`spieleDesTages`), und zwei Druckspiele hintereinander sind genau das, was B3 verhindern soll.
Der Tag sorgt dafür, dass `einlass` nicht direkt auf „Platzwart" oder „Ball hochhalten" folgt.

## A.2 Spielidee und Ablauf

**Die eine Regel:** *Ein Gegenstand bleibt nur am Stift, solange der Druck im Band liegt.*
Alles andere folgt daraus:

- **Greifen** = auf dem Gegenstand aufsetzen und den Druck `greifzeit` lang im Band halten, ohne
  den Gegenstand zu verlassen. Ein Ring um den Gegenstand füllt sich, nur während der Druck stimmt.
- **Zu leicht** (länger als `GNADE` = 0,15 s unter dem Band): der Gegenstand rutscht ab.
- **Zu fest** (länger als `GNADE` über dem Band): er flutscht wie Seife ein Stück zur Seite.
- **Ablegen** ist kein eigener Befehl: der Gegenstand fällt, sobald der Druck das Band verlässt
  oder der Stift abhebt. Liegt er dann über der Kiste, ist er abgegeben, sonst springt er an
  seinen Platz in der Tasche zurück. Beim normalen Abheben über der Kiste fällt der Druck ohnehin
  unter das Band — Abheben und „zu leicht" sind dieselbe Regel.

Die Gnadenzeit verhindert, dass eine einzelne Druckspitze des Pencils sofort bestraft wird.

**Was Ben sieht:** in der Mitte eine offene Sporttasche (Draufsicht), darin 4–10 Gegenstände.
Die verbotenen sind **gelb umrandet, gestrichelt und mit einem kleinen Warndreieck** markiert —
Form *und* Farbe, weil bei Jungen um 8 % eine Rot-Grün-Schwäche haben und Rot mit den
Vereinsfarben von Ajax und Köln kollidiert. Ben muss also nichts *wissen*, nur greifen: die
Unterscheidung „erlaubt/verboten" nimmt ihm der Scanner ab. Die erlaubten Sachen sind Störobjekte,
die die Präzision verlangen (eng daneben liegen), keine Denkaufgabe.

| Verboten (markiert) | Gewicht | Erlaubt (Störobjekte) |
|---|---|---|
| Glasflasche, Regenschirm, Wasserpistole | schwer | Schal, Mütze, Brezel, Handschuhe |
| Trillerpfeife („stört den Schiri"), Dose, Tröte | leicht | Sitzkissen, Kuscheltier |

Nichts Bedrohliches — keine Pyrotechnik, keine Messer. Der Fan hat die Sachen „aus Versehen
eingepackt", die Kiste heißt **Abgabe** („bekommst du nach dem Spiel wieder", so wird es in echten
Stadien gehandhabt). Der Fan ist nie ein Verdächtiger und nie ungeduldig.

**Ablauf einer Runde (eine Tasche, ~15 s):**

1. Fan läuft von rechts an den Tisch (0,8 s), stellt die Tasche ab.
2. Ben greift und legt ab, in beliebiger Reihenfolge, 2–4 Mal.
3. Letzter Gegenstand in der Kiste → Fan nickt, Vereinsspruch als Sprechblase (wie
   `ballhochhalten/welt.ts:478-481`, fremdsprachig mit Übersetzung), Fan geht durchs Drehkreuz
   (Klack-Ton), Tribüne im Hintergrund +1 Reihe (1,6 s).
4. Jede **vierte Tasche gehört einem Spieler** aus `verein.kader`: Gepäckanhänger
   „Nr. 10 · Ludovit Reis". Leitidee — Ben kontrolliert die Tasche *dieser* Mannschaft.

**Endbedingung: Zeit** (Uhr des `SpielScreen`), wie bei der Autogrammstunde
(`autogramme/index.tsx:102-105`). Taschen kommen endlos. Eine angefangene Tasche wird beim
Schlusspfiff nicht gewertet, sondern über `begonnen` in die Vollständigkeit gerechnet.

**Angehalten:** ein gehaltener Gegenstand springt in die Tasche zurück (wie `hebeAb` in
`autogramme/index.tsx:125-130`), sonst flöge er beim Weiterspielen mit dem ersten Punkt quer über
den Tisch.

## A.3 Grafik

Bühne **900 × 640** wie alle Spiele; `berechneSicht` aus `autogramme/zeichnen.ts:33-36`
übernehmen.

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │  ▓▓▓▓▓▓▓▓▓▓▓▓▓ Tribüne (füllt sich reihenweise, Vereinsfarbe) ▓▓▓▓▓▓▓▓▓▓▓ │ y 0–150
 │ ───────────────────────────────────────────────────────────────────────── │
 │   [Verbotsschild]          ╔═══ Scanner-Bogen ═══╗            ☺ Fan       │ y 150–230
 │                            ║                     ║           /█\  Schal   │
 │   ┌─────────┐   ┌──────────╨─────────────────────╨──────┐    / \          │
 │   │ ABGABE  │   │  ⌂Schal   ◇Flasche!   ●Pfeife!  ⌂Mütze│   ╪ Drehkreuz │ y 260–520
 │   │  Kiste  │   │      ●Brezel    ◇Dose!    ⌂Kissen     │               │
 │   │  (r 55– │   │  ⌂Handschuh      ◇Schirm!             │               │
 │   │    87)  │   └───────────── Sporttasche ─────────────┘               │
 │   └─────────┘                                                             │
 │   [Druckbalken nur als Hilfe, siehe A.5]                                  │ y 560–600
 └───────────────────────────────────────────────────────────────────────────┘
   Kiste x≈150, Tasche x 300–720, Fan/Drehkreuz x 760–880
```

**Zeichenreihenfolge** (`zeichnen.ts`): Hintergrundwand → Tribüne (Anteil gefüllt) → Scanner-Bogen
→ Tisch → Kiste → Tasche (Innenfutter) → erlaubte Gegenstände → verbotene mit Markierung →
**gehaltener Gegenstand zuletzt** (mit Schatten, 1,1-fach, über allem) → Greifring → Partikel →
Fan → Hilfe-Druckbalken.

**Vereinsfarben:** Tribüne, Fan-Schal und Kistenaufdruck aus `verein.farben`; Abstufungen über
`mischeFarbe` (`ballhochhalten/welt.ts:126`). Alles andere neutral (Beige, Grau), damit nur die
Markierung heraussticht — A2.

**Sofortfeedback unter 100 ms (A1)** — alles im selben Bild, in dem der Zeiger ankommt:

| Ereignis | Bild | Ton |
|---|---|---|
| Aufsetzen auf Gegenstand | Ring erscheint, beginnt zu füllen, sobald Druck im Band | leises „tick" |
| Druck zu leicht | Gegenstand sinkt 2 px ein, Ring bleibt grau | — |
| Druck zu fest | Gegenstand staucht sich (Skalierung y 0,85) — „Seife drücken" | — |
| Gegriffen | Gegenstand hebt sich, Schatten, folgt dem Stift | „klack" |
| Abgerutscht / geflutscht | Hüpfer zurück in die Tasche, Staubwölkchen | weiches „plopp" |
| In der Kiste | 12 Partikel in Vereinsfarbe, Kiste wackelt | helles „pling" |
| Erlaubtes berührt | Gegenstand wackelt 0,3 s, sonst nichts | — |
| Tasche leer | Fan nickt, Spruch, Drehkreuz | „klack-klack" |

**Reizarm (A2):** Markierung leuchtet ruhig, höchstens ein langsames Atmen (0,5 Hz), kein Blinken.
Keine Punktzahl, kein Zähler im Bild — die Tribüne ist die Fortschrittsanzeige (wie
`ballhochhalten/welt.ts:58-63`). Nie mehr als ein wartender Fan: **keine wachsende Schlange.**

## A.4 Datenerfassung

**Kern (unmaßgeblich, nur Sofortfeedback):**

| Feld | Bedeutung |
|---|---|
| `vollstaendigkeit` | abgelegte / verbotene Gegenstände aller **begonnenen** Taschen |
| `genauigkeit` | abgelegte / alle Aufsetzer (inkl. daneben und erlaubt berührt) |
| `druckMittel`, `druckStreuung` | über alle Druckwerte bei aufliegendem Stift (`druckKennzahlen`) |
| `eingabegeraet`, `synthetischerDruck`, `stufe`, `abgebrochen` | wie in allen Spielen |

**`extra`** — Messwerte, keine Noten. Koordinaten in Bühnenpixeln, weil C# daraus Verhältnisse
bildet (einheitenlos, CLAUDE.md: keine Millimeter-Kalibrierung):

```jsonc
{
  "taschen": 14, "abgelegt": 38, "aufsetzer": 51,
  "daneben": 4, "erlaubtBeruehrt": 3, "abgerutscht": 4, "geflutscht": 2, "geholfen": 0,
  "objektRadius": 25, "kisteRadius": 71, "greifzeitMs": 400,
  "band": { "leicht": [0.175, 0.425], "schwer": [0.475, 0.725] },
  "druckGeprueft": true,
  "griffe": [
    { "art": "abgelegt",            // abgelegt | abgerutscht | geflutscht | zurueck | geholfen
      "schwer": true,
      "objekt": { "x": 412, "y": 318, "r": 25 },
      "aufsetzen": { "x": 418, "y": 322 },
      "ablage": { "x": 160, "y": 390 },       // fehlt, wenn nicht gegriffen
      "kiste": { "x": 150, "y": 380, "r": 71 },
      "greifDruck": 0.58 }                    // Mittel während der Greifzeit
  ]
}
```

Bei ~4 s je Griff sind das 40–60 Einträge — unkritisch.

**Maßgeblich in C#.** Was die bestehenden Kennzahlen schon liefern (`Kennzahlen.cs:60-117`):
`DruckMittel`, `TempoMittel` (= Transporttempo), `Zittern` (= Ruhe der Transportbewegung),
`Absetzer` (≈ Griffversuche). Neu vorgeschlagen, alle **nur aus dem Blob**, also für jedes Spiel
gültig:

1. **`Haltewackeln`** (px): für jeden Strich (Abschnitt zwischen zwei Druck-0-Punkten, die der
   `SpielScreen` beim Abheben setzt, `SpielScreen.tsx:122-127`) mit Dauer ≥ 300 ms die Punkte der
   ersten 300 ms nehmen, ihren Schwerpunkt c bilden, `√(mittel(|pᵢ − c|²))`. Mittel über alle
   Striche. Kleiner = ruhigerer Griff. ~20 Zeilen.
2. **`DruckStreuungJeStrich`**: Streuung des Drucks **innerhalb** jedes Strichs, gemittelt.
   Wichtig, weil die bestehende `DruckStreuung` global ist (`Kennzahlen.cs:105`): in `einlass`
   haben leichte und schwere Gegenstände verschiedene Zielbänder — wer richtig anpasst, bekommt
   eine *höhere* globale Streuung. Ein Griff = ein Strich = ein Zieldruck, also ist die Streuung
   je Strich die saubere Größe. **Dasselbe Problem hat „Platzwart" heute schon** (drei Zonen,
   `rasenmaehen/welt.ts:63`) — die neue Kennzahl hilft dort mit.

Aus `extra.griffe`, neue Datei `apps/api/Auswertung/Griffe.cs` (`System.Text.Json`, ~60 Zeilen):

3. **`Zielabweichung`** = Median `|aufsetzen − objekt| / objekt.r`
4. **`Ablageabweichung`** = Median `|ablage − kiste| / kiste.r` über gegriffene Gegenstände
5. **`Griffquote`** = abgelegt / (abgelegt + abgerutscht + geflutscht)
6. **`Richtung`** = geflutscht / (abgerutscht + geflutscht) — >0,5 heißt „drückt eher zu fest"

C# rechnet hier aus Koordinaten, die das Spiel geloggt hat, nicht aus Noten des Browsers — die
Zusage „Auswertung in C#" bleibt wahr. Offene Frage dazu in A.9.

**Was Thomas liest:** im Wochenbericht die Zeile *Pinzettengriff* mit `Haltewackeln` und
`DruckStreuungJeStrich`. Im Verlauf des Spiels zusätzlich Griffquote und **Richtung** — die ist
therapeutisch die interessanteste Zahl: viel „geflutscht" heißt Überdruck (Verkrampfungsneigung,
typisch bei grafomotorischen Störungen), viel „abgerutscht" heißt zu wenig Haltekraft. Punkte nach
`stufe` einfärben wie in allen Spielen.

**Fallstricke:**

- **Maus:** Ersatzdruck per Ziffer (`eingabe.ts:26`, wie `ballhochhalten/index.tsx:93`).
  Vorgabe 50 % liegt bei Stufe 1 **nicht** im leichten Band — Tester drücken `3` für leicht, `6`
  für schwer. Hinweis wie `ersatzdruckHinweis` (`rasenmaehen/zeichnen.ts:203`) einblenden.
- **Finger oder Stift ohne Drucksensor** (Logitech Crayon meldet `pen`, aber keinen echten Druck):
  das Spiel wäre bei Stufe ≥ 3 für leichte Dinge unlösbar — ein Verliererzustand durch die
  Hintertür (C2). Regel: `druckZaehlt = !d.synthetisch || geraet === 'mouse'`. Zählt der Druck
  nicht, entscheidet nur die Greifzeit, und `extra.druckGeprueft = false`. Ob der Crayon
  tatsächlich einen konstanten Wert meldet, **auf dem Gerät prüfen**.
- **Handballen:** liegt Bens Hand auf dem Glas, entstehen `touch`-Zeiger, die als Greifversuch
  gelten würden. In `index.tsx`: hat das Spiel einmal `pen` gesehen, `touch` ignorieren.
  (Der `SpielScreen` zeichnet den Ballen trotzdem in den Blob — ein bestehendes, spielübergreifendes
  Problem, siehe A.9.)
- **Browser-Bewertung ist unmaßgeblich:** `ergebnis()` bekommt den üblichen Warnkommentar
  (`autogramme/welt.ts:206-213`).

## A.5 Spielspaß

- **Rhythmus:** eine Tasche ≈ 15 s, ein Griff ≈ 4 s — kurze, abgeschlossene Einheiten, jede mit
  eigenem Abschluss (Fan geht durch). Für ein Kind mit ADHS ist ein Erfolgserlebnis alle paar
  Sekunden wichtiger als ein großes Ziel am Ende.
- **Belohnung:** das „pling" in der Kiste und die Tribüne, die sich reihenweise füllt. Bei voller
  Tribüne einmal „Ausverkauft!" mit La Ola (wie der Abpfiff in `ballhochhalten/welt.ts:535`),
  danach füllen weitere Fans die Stehplätze. Die Tribüne leert sich nie.
- **Überraschung:** die Spielertasche jede vierte Runde, mit Namen aus dem Kader; darin ab und zu
  ein Kuriosum, das trotzdem raus muss (eine Trillerpfeife in der Tasche des Torwarts).
- **Steigerung innerhalb des Spiels:** bewusst **keine** schwerer werdenden Taschen — die Stufe
  bleibt fest, wie in allen Spielen (`autogramme/welt.ts:42-48`), sonst ist der Verlauf nicht
  lesbar. Steigerung kommt aus der Erzählung (Stadion füllt sich, Ausverkauft).
- **Abwechslung (B3):** zwei Gewichtsklassen wechseln innerhalb jeder Tasche — wechselnde
  Kraftmuster statt Dauerdruck. Ein Griff dauert unter einer Sekunde Haltekraft; zwischen den
  Taschen hebt Ben zwangsläufig ab (Mikropause). Empfehlung an Thomas: Dauer 180 s statt 210 s.
- **Vereinsbezug:** Kaderanhänger, Sprüche, Vereinsfarben. Optional ein Hausordnungsschild in der
  Vereinssprache (A.7).
- **Lob des Profis (C5):** generisch über den Lob-Bildschirm. Kandidat für eine persönliche
  Bestleistung: „Fans eingelassen" (`extra.taschen`). Die Bestleistung ist projektweit noch
  nicht gebaut (`Profi.bestleistung` in `typen.ts:30` wird nirgends gelesen).

**Kein Game Over (C2) — kritisch geprüft.** Die Mechanik selbst hat keinen Verliererzustand:
nichts geht kaputt, abgerutschte Dinge liegen wieder an ihrem Platz, die Tasche wartet beliebig
lange. Zwei echte Risiken:

1. **Das Thema „Kontrolle/Verbot"** kann sich für ein Kind, das oft ermahnt wird, nach Ertappen
   anfühlen. Gegenmittel: der Fan ist freundlich und dankbar, die Kiste heißt „Abgabe", nichts
   wird weggenommen. Keine Alarmgeräusche, keine roten Kreuze.
2. **Ein Gegenstand, der sich nicht greifen lässt** (Druck findet das Band nie). „Hilfe statt
   Abbruch": nach **3** misslungenen Griffen am selben Gegenstand erscheint der Druckbalken aus
   „Platzwart" (`rasenmaehen/zeichnen.ts:164`) mit dem Zielband — Information, keine größere
   Toleranz. Nach **5** hüpft der Gegenstand von selbst in die Kiste, gezählt als `geholfen`,
   **nicht** als `abgelegt`. Die Toleranz wird nie heimlich weiter — sonst wäre die Messung
   eine andere als die eingestellte.

**C3:** Beim Schlusspfiff keine ergebnisabhängige Reaktion (wie `ballhochhalten/welt.ts:530-534`).

## A.6 Schwierigkeit und Einstellungen (B1)

Thomas stellt Stufe 1–5 ein (`therapeut/src/screens/Einstellungen.tsx:141`). Alles leitet sich
daraus ab, als einfache Formeln in `welt.ts` wie bei den anderen Spielen:

| Parameter | Formel | St. 1 | St. 2 | St. 3 | St. 4 | St. 5 |
|---|---|---|---|---|---|---|
| Objektradius (px) | `34 − 3·s` | 31 | 28 | 25 | 22 | 19 |
| ≈ Ø in mm | | 14 | 13 | 11,5 | 10 | 9 |
| Treffsaum (px) | fest | 6 | 6 | 6 | 6 | 6 |
| halbes Druckband | `0,20 − 0,025·s` | 0,175 | 0,15 | 0,125 | 0,10 | 0,075 |
| Band leicht (Mitte 0,30) | | 0,13–0,48 | 0,15–0,45 | 0,18–0,43 | 0,20–0,40 | 0,23–0,38 |
| Band schwer (Mitte 0,60) | | 0,43–0,78 | 0,45–0,75 | 0,48–0,73 | 0,50–0,70 | 0,53–0,68 |
| Greifzeit (s) | `0,25 + 0,05·s` | 0,30 | 0,35 | 0,40 | 0,45 | 0,50 |
| Kistenradius (px) | `95 − 8·s` | 87 | 79 | 71 | 63 | 55 |
| verbotene je Tasche | `2 + ⌊s/2⌋` | 2 | 3 | 3 | 4 | 4 |
| erlaubte je Tasche | `1 + s` | 2 | 3 | 4 | 5 | 6 |
| Mindestabstand der Mitten | `(2,9 − 0,15·s)·r` | 85 | 73 | 61 | 51 | 41 |

Ab Stufe 3 überlappen sich die Bänder nicht mehr: ein fester Druck reicht nicht für beide
Gewichtsklassen — das ist die Kraftdosierung (dieselbe Idee wie `rasenmaehen/welt.ts:81-88`).
Bei Stufe 1–2 überlappen sie, das ist Nachsicht (C2). Bandmitten **geraten, nicht gemessen** —
mit Pencil und Kind nachziehen, bevor Stufe 4–5 in der Vorführung gezeigt wird.

**Toleranz, Zielgeschwindigkeit, Mindesttrefferquote** werden gespeichert
(`Entitaeten.cs:127-131`), erreichen aber kein Spiel: `SpielProps` (`spiele/index.ts:18-33`)
reicht nur `stufe` durch. Das ist eine spielübergreifende B1-Lücke. Wird sie geschlossen, ist für
`einlass` die natürliche Abbildung: `toleranz` skaliert das halbe Druckband, `zielgeschwindigkeit`
die Greifzeit (umgekehrt). Nicht in diesem Spiel allein lösen.

Die Lage der Gegenstände ist **fest statt zufällig** — sonst sind zwei Sitzungen nicht vergleichbar
und der Test nicht vorhersagbar (wie `aufwaermen/welt.ts`, Kommentar zu `MUSTER`). 15 feste
Plätze in der Tasche (5 × 3 Raster mit festem Versatz), Belegung per Formel wie `zoneVon`
(`rasenmaehen/welt.ts:75-79`): `(tasche·7 + platz·13) % n`. Plätze, die den Mindestabstand
verletzen, bleiben leer.

## A.7 Content-Bedarf

**Pflicht: nichts.** Das Spiel liest `farben`, `kader`, `sprueche` — alles da (`typen.ts:39-48`).
Die Gegenstände stehen im Code, nicht im Content: sie werden mit Canvas gezeichnet, und eine
Stadionordnung ist überall gleich.

**Optional** (Leitidee, darf fehlen, damit bestehende Vereine weiter übersetzen):

```ts
/** Ein Satz der Stadionordnung, als Schild über dem Scanner. Fremdsprachig mit Übersetzung. */
hausordnung?: Spruch[]
```

```ts
// hsv.ts
hausordnung: [{ text: 'Glasflaschen bleiben draußen!', sprache: 'Deutsch',
                uebersetzung: 'Glasflaschen bleiben draußen!' }],
// ajax.ts
hausordnung: [{ text: 'Glas blijft buiten!', sprache: 'Niederländisch',
                uebersetzung: 'Glas bleibt draußen!' }],
```

Niedrige Priorität: ein 7-Jähriger liest das Schild kaum, und Text im Bild kostet Reizarmut.

## A.8 Umsetzung

| Datei | Inhalt | ≈ Zeilen | Vorbild |
|---|---|---|---|
| `spiele/einlass/welt.ts` | Zustand, Regel, Stufenformeln, Taschenbelegung, `ergebnis` | 280 | `rasenmaehen/welt.ts` (Band, `urteil`), `autogramme/welt.ts` (Runden, `begonnen`) |
| `spiele/einlass/zeichnen.ts` | Szene, Gegenstände als Canvas-Formen, Ring, Fan | 300 | `rasenmaehen/zeichnen.ts:164` (Druckbalken), `ballhochhalten/zeichnen.ts` (Tribüne) |
| `spiele/einlass/index.tsx` | Canvas, Zeiger, Bildschleife, Ziffernlauscher | 150 | `ballhochhalten/index.tsx` (fast 1:1) |
| `spiele/einlass/klang.ts` | tick, klack, plopp, pling | 70 | `ballhochhalten/klang.ts` |
| `spiele/einlass/welt.test.ts` | siehe unten | 230 | `autogramme/welt.test.ts` |
| `api/Auswertung/Kennzahlen.cs` | `Haltewackeln`, `DruckStreuungJeStrich` | +45 | — |
| `api/Auswertung/Griffe.cs` | Kennzahlen aus `extra.griffe` | 60 | — |
| `api.tests/…` | Tests für beide | 120 | `SpielkatalogTests.cs` |

Schnittstelle von `welt.ts` (alles ohne Canvas): `neueWelt(stufe, verein?)`,
`setzeAuf(w, x, y, d, geraet)`, `bewege(w, x, y, d)`, `hebeAb(w)`, `aktualisiere(w, dt)`,
`ergebnis(w, dauerMs, abgebrochen)`, dazu die Formeln aus A.6 als `export const`.

**Testfälle `welt.test.ts`:**

1. Objekte werden mit steigender Stufe kleiner, Bänder schmaler, Greifzeit länger.
2. Ab Stufe 3 gibt es keinen Druck, der in beiden Bändern liegt; bei Stufe 1 gibt es einen.
3. Aufsetzen neben allen Objekten → `daneben++`, nichts gegriffen.
4. Druck im Band für `greifzeit − ε` → noch nicht gegriffen; für `greifzeit` → gegriffen.
5. Während der Greifzeit den Objektradius + Saum verlassen → Greifen bricht ab.
6. Gegriffen, Druck `GNADE − ε` zu leicht → hält noch; `GNADE` lang → `abgerutscht`, Objekt
   zurück an seinem Platz.
7. Dasselbe zu fest → `geflutscht`.
8. Abheben über der Kiste → `abgelegt`; Abheben daneben → `zurueck`, nichts verloren.
9. Erlaubten Gegenstand berühren → nicht greifbar, `erlaubtBeruehrt++`.
10. Zwei Objekte im Treffsaum → das mit der näheren Mitte wird gegriffen.
11. Letzter verbotener Gegenstand abgelegt → Fanwechsel, danach neue Tasche; während des Wechsels
    nimmt der Tisch nichts an.
12. Jede vierte Tasche trägt einen Kaderspieler, der Kader wiederholt sich.
13. Belegung ist deterministisch: zweimal `neueWelt(3)` → gleiche Tasche.
14. Synthetischer Druck vom Finger (`geraet: 'touch'`) → Druck zählt nicht, `druckGeprueft: false`.
15. Nach 3 Fehlgriffen am selben Objekt `hilfeSichtbar`, nach 5 `geholfen` statt `abgelegt`.
16. `ergebnis` ohne jeden Griff liefert Nullen, kein `NaN`; Stufe wird durchgereicht.

**Eintragen** — CLAUDE.md nennt zwei Stellen, tatsächlich sind es **sechs**:

```ts
// apps/web/src/spiele/katalog.ts               → Eintrag aus A.1
// apps/web/src/spiele/index.ts:46-51           → einlass: Einlasskontrolle,
// apps/therapeut/src/api.ts:200-211 (SPIEL_TITEL) → einlass: 'Einlasskontrolle',
```
```csharp
// apps/api/Auswertung/Spielkatalog.cs:33-45
["einlass"] = new(Rolle.Normal, ["pinzettengriff", "druckdosierung"]),
// apps/api/Daten/Seed.cs:54-58  → "einlass" in die Liste
// apps/api.tests/SpielkatalogTests.cs → [InlineData("einlass", "pinzettengriff", "druckdosierung")]
```

Ohne `SPIEL_TITEL` zeigt die Therapeuten-App die nackte ID. Ohne Seed-Zeile ist es schlimmer,
siehe A.9.

## A.9 Risiken und offene Fragen

**Technisch**

- **Druckkalibrierung.** Bandmitten 0,30/0,60 sind geschätzt. Ein Apple Pencil erreicht 1,0 in
  der Praxis nie (`ballhochhalten/welt.ts:34-37`); wie fest ein 7-Jähriger drückt, weiß niemand
  im Team. Vor der Vorführung mit echtem Pencil messen.
- **Neues Spiel ohne Einstellungszeile ist aktiv, aber für Thomas unsichtbar.** Fehlt die Zeile
  in der DB, liefert `fuerSpiel` die `VORGABE` mit `aktiv: true` (`engine/tagesplan.ts:32-39, 52`)
  und `aktiveMitRolle` (`tagesplan.ts:143-144`) nimmt das Spiel in den Topf. Die Therapeuten-App
  listet aber nur vorhandene Zeilen (`Klienten.cs`, GET einstellungen). Folge: in einer
  bestehenden Datenbank taucht `einlass` in Bens Training auf, und Thomas kann es nicht abwählen.
  Der Seed läuft nur auf leerer DB — für bestehende Klienten braucht es eine Datenmigration oder
  eine Anzeige aus dem Katalog statt aus der DB. **Betrifft jedes neue Spiel.**
- **`extra` wird heute nirgends in C# gelesen.** `ballhochhalten/welt.ts:731-732` verspricht
  „die maßgeblichen Kennzahlen rechnet C# aus `extra.wuerfe`" — dafür gibt es keinen Code.
  `Griffe.cs` wäre der erste Leser. Die Gruppe sollte einmal entscheiden, ob geloggte
  Spielgeometrie in `extra` als „Rohdaten" zählt (Vorschlag: ja, solange C# rechnet) — und
  `segmente.ts:64` sagt „geht nicht in den Verlaufsgraphen". Kompromiss: Griffe-Kennzahlen nur
  in der Detailansicht des Spiels, nicht im Graphen und nicht im Wochenbericht.
- **Handballen im Blob.** `SpielScreen` filtert nicht nach Zeigerart. Für alle Spiele relevant,
  für ein Greifspiel besonders: ein Ballen-Strich ist für `Haltewackeln` ein sehr ruhiger Griff.
  Vorschlag: im `SpielScreen` `touch` ignorieren, sobald `pen` gesehen wurde — eine Zeile, aber
  in einer Datei, die allen gehört; absprechen.
- **Neue Kennzahl-Felder** vergrößern `Kennzahl` und damit Verlauf und Bericht. D3 verlangt eine
  Seite — neue Spalten nur im Verlauf, nicht in der Haupttabelle des Wochenberichts.

**Therapeutisch**

- Siehe 0.2: keine Fingeropposition, keine Haptik. Im Bericht so benennen, nicht überverkaufen.
- Isometrisches Halten kann verkrampfen. Kurze Haltezeiten, Mikropausen und der Tag
  `druckdosierung` (Tagesplan-Abstand) sind die Gegenmittel; Thomas sollte die Spieldauer kürzen
  können und wissen, dass „Richtung > 0,5" ein Verkrampfungshinweis ist.

**Konflikte mit CLAUDE.md**

- „An zwei Stellen eintragen" stimmt nicht (sechs, siehe A.8). Außerdem verweisen
  `therapeut/src/api.ts:217` und `docs/entscheidungen.md:288` auf `Auswertung/Kategorien.cs`,
  die Datei heißt `Spielkatalog.cs`.
- Die Leitidee verlangt vereinsspezifische Inhalte; `einlass` hat davon nur den Kader und die
  Sprüche. Das reicht für „nicht dasselbe Spiel mit getauschtem Wappen" knapp — `hausordnung`
  würde es stärken.

## A.10 Anforderungs-Check

| ID | Status | Begründung |
|---|---|---|
| A1 | erfüllt | Ring, Stauchen, Schatten im selben Bild; Töne bei Greifen/Ablegen |
| A2 | erfüllt | Neutrale Szene, eine Markierungsart, keine Zahlen, keine Schlange |
| A3 | erfüllt | Uhr des `SpielScreen`, Spiel endet nur durch sie |
| A4 | erfüllt | Nur Ereignistöne, über `bedienung.ts` stummschaltbar |
| A5 | erfüllt | Ein Satz, vorgelesen; die Unterscheidung macht der Scanner |
| B1 | betroffen | Stufe wirkt auf 7 Parameter; Toleranz & Co. erreichen das Spiel nicht (spielübergreifend) |
| B2 | **erfüllt, Kern** | Pinzettengriff glaubhaft, Kraftdosierung zusätzlich |
| B3 | Risiko | Haltekraft kann verkrampfen — kurze Griffe, Tagesplan-Abstand, Pauseninhalt |
| B4 | erfüllt | Blob durch `SpielScreen`; Griffgeometrie in `extra` |
| C1 | erfüllt | Ordnerdienst am Stadioneingang |
| C2 | Risiko, gelöst | Hilfe nach 3/5 Fehlgriffen; Sonderweg ohne Druck; freundlicher Fan |
| C3 | erfüllt | Keine ergebnisabhängige Reaktion beim Abpfiff |
| C4 | betroffen | Tribüne als Fortschritt im Spiel; Bestleistung projektweit offen |
| C5 | betroffen | Lob generisch; Bestleistungskandidat „Fans eingelassen" |
| C6 | — | nicht berührt |
| D2 | erfüllt | Aufzeichnung unsichtbar |
| D4 | erfüllt | Keine personenbezogenen Daten im Spiel; Kadernamen sind Content |

---

# B. Platz aufräumen (`muell`)

## B.1 Kurzfassung

Nach dem Abpfiff liegt Müll auf dem Rasen: Becher, Wimpel, Papierkugeln, Konfetti. Über dem
Platz hängt die **Seilkamera** an vier Seilen. Ben malt einen Kreis um ein Stück Müll; schließt er
den Kreis, fährt die Kamera hin, senkt den Greifer und holt alles heraus, was darin liegt. Ist ein
Platzabschnitt sauber, fährt sie zum nächsten.

```ts
muell: {
  titel: 'Platz aufräumen',
  anweisung: 'Male einen Kreis um den Müll, dann holt ihn die Seilkamera.',
  rolle: 'normal',
  tags: ['wellen', 'hand-auge'],
},
```

ID `muell` statt `aufraeumen`: `aufraeumen` und `aufwaermen` unterscheiden sich in zwei
Buchstaben — in einem Katalog mit String-Schlüsseln ist das eine Verwechslung mit Ansage.

## B.2 Spielidee und Ablauf — und das UFO

**Passt das UFO zu C1? Nein.** C1 verlangt Übungen als Fußballhandlungen, die Leitidee „echtes
Training bei diesem Verein" mit echten Stadionfakten. Ein UFO ist ein Science-Fiction-Fremdkörper
ohne Fußballbezug; in der Prüfung führt „warum ein UFO?" zu keiner guten Antwort, und es setzt
einen Präzedenzfall gegen das ganze Themenargument. Das *Aufräumen nach dem Spiel* passt dagegen
gut — das macht in jedem Stadion ein Team.

**Ersatz: die Seilkamera.** Sie erfüllt dieselbe Kinderfantasie (ein fliegendes Ding mit Greifarm
über dem Rasen), hängt aber in echten Stadien über dem Spielfeld. Der Profi stellt sie vor
(„Das ist unsere Seilkamera — heute sammelt sie den Müll ein."). **Nicht „Spidercam" nennen**, das
ist ein Markenname (CLAUDE.md: Marken vermeiden). Verworfen: Greifzange in Bens Hand (ist dann
doch wieder `einlass`), Kehrmaschine (kein Greifen, keine Form).

**Die eine Regel:** *Was ganz in einem geschlossenen Kreis liegt, holt die Seilkamera.*

- **Geschlossen** heißt: das Strichende liegt höchstens `schliessToleranz` vom Strichanfang
  entfernt, nachdem der Strich mindestens 75 px lang war. Dann wird automatisch zugemacht.
- **Darin** heißt: der Mittelpunkt des Müllstücks liegt im Polygon (Strahlverfahren, gerade/
  ungerade Kreuzungen — zehn Zeilen, auch bei einer Acht noch richtig).
- **Der Greifer ist klein:** ein Kreis, dessen mittlerer Radius größer ist als `greiferRadius`,
  fasst nichts. Sonst umkreist Ben den ganzen Abschnitt mit einem Strich und die Feinmotorik ist
  weg. Statt einer Fehlermeldung zeigt die Kamera ihren gestrichelten Greiferkreis an der Stelle.

**Ablauf einer Runde (ein Abschnitt, ~25 s):** Kamera schwenkt zum Abschnitt (Strafraum,
Mittelkreis, Eckfahne, Seitenlinie, Torraum — feste Folge), 7–11 Müllstücke liegen fest verteilt.
Ben malt Kreise in beliebiger Reihenfolge; die Kamera arbeitet die geschlossenen Kreise in einer
Warteschlange ab (`auftraege: Kreis[]`), Ben darf weitermalen, während sie fährt. Letztes Stück
weg → „Sauber!" mit Vereinsspruch, Schwenk zum nächsten Abschnitt (1,5 s).

**Endbedingung: Zeit.** Abschnitte wiederholen sich mit verschobener Müllverteilung.

## B.3 Grafik

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ \                         Seilkamera ▣                                  / │ Seile zu den
 │   \______________________/   ╲╱ Greifer  \_____________________________/   │ vier Ecken
 │  ┌──────────────────────── Rasen (Draufsicht) ─────────────────────────┐  │
 │  │   ░Becher      ·Konfetti      ◁Wimpel                               │  │ y 90–600
 │  │         ╭───╮                         ·Konfetti ·                   │  │
 │  │   ◎     │ ◎ │← Bens Kreis (Vereinsfarbe, weiß umrandet)            │  │
 │  │  Papier ╰─●─╯  ● = Startpunkt, leuchtet bei Annäherung             │  │
 │  │                    ─ ─ Strafraumlinie ─ ─                           │  │
 │  └─────────────────────────────────────────────────────────────────────┘  │
 └───────────────────────────────────────────────────────────────────────────┘
```

Bühne **900 × 640**. Rasen mit Mähstreifen und weißen Linien aus `rasenmaehen/zeichnen.ts:103-160`
(`rasen`, `linien`). Seilkamera als Kasten mit vier Linien zu den Ecken — sie ist das einzige
bewegte Objekt außer Konfetti. Müll als einfache Canvas-Formen; Wimpel und Becher tragen
Vereinsfarben (`verein.farben`), das ist der Fanmüll *dieses* Vereins.

**Zeichenreihenfolge:** Rasen → Linien → Müll → offene/fertige Kreise → Greiferschatten →
Seile → Kamera → Partikel.

**Sofortfeedback (A1):** der Strich wird mit jedem Zeigerpunkt gezeichnet (`feinEreignisse`,
volle 120 Hz). Ist der Stift dem Startpunkt auf `schliessToleranz` nahe, **leuchtet der
Startpunkt** — Ben weiß vor dem Abheben, dass der Kreis zugeht. Beim Schließen füllt sich die
Fläche im selben Bild halbtransparent in Vereinsfarbe, ein „klick". Die Kamerafahrt (0,6 s) und das
„surr–klack–plopp" sind Belohnung danach, nicht das Feedback selbst. Offener Kreis: verblasst in
0,8 s, kein Ton.

**Reizarm:** keine Zähler, keine Uhr im Bild; Konfetti klein und ruhig. Fortschritt ist der
saubere Rasen.

## B.4 Datenerfassung

**Kern (unmaßgeblich):** `vollstaendigkeit` = eingesammelt / Müll in begonnenen Abschnitten;
`genauigkeit` = geschlossene Kreise / Kreisversuche (Striche ≥ 75 px); Druck wird aufgezeichnet,
ist kein Kriterium.

**`extra`:**

```jsonc
{ "abschnitte": 8, "eingesammelt": 61, "muellGesamt": 68,
  "kreisversuche": 74, "geschlossen": 66, "zuGross": 3, "leer": 2,
  "schliessToleranz": 36, "greiferRadius": 105 }
```

**Maßgeblich in C#: neue Datei `apps/api/Auswertung/Kreise.cs`, rein aus dem Blob** — keine
Spielgeometrie nötig, das ist die sauberste C#-Geschichte aller Konzepte. Für jeden Strich
(zwischen Druck-0-Punkten) mit ≥ 8 Punkten:

- Schwerpunkt `c`, Abstände `rᵢ = |pᵢ − c|`, mittlerer Radius `r̄`, Weglänge `L`.
- **Ist es ein Kreisversuch?** `L / r̄ ≥ 5`. Begründung zum Erklären: ein Kreis hat
  `L/r̄ = 2π ≈ 6,3`, eine gerade Linie `≈ 4` (Mittelpunkt in der Mitte, mittlerer Abstand L/4).
- **Rundheit** = `1 − σ(r) / r̄`, auf 0–1 begrenzt.
- **Schließlücke** = `|p_n − p_1| / r̄` (Formschluss — typisches Problem bei grafomotorischen
  Störungen: der Kreis bleibt offen oder schießt über).
- **Drehrichtung** über die Gaußsche Trapezformel `A = ½ Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)`. Bildschirm-y
  zeigt nach unten: `A < 0` heißt gegen den Uhrzeigersinn.
- Je Spiel: Median Rundheit, Median Lücke, Median `r̄`, **Anteil gegen den Uhrzeigersinn**.

Gibt `null` bei weniger als 3 Kreisversuchen (wie `Kennzahlen.Berechne`: lieber keine Zahl als
eine erfundene). Dazu passen die bestehenden `TempoMittel` und `Zittern`.

**Was Thomas liest:** Rundheit ↑ und Lücke ↓ über die Wochen; die Kreisgröße gegen die Stufe
(kleinere Kreise werden aus den Fingern statt aus dem Arm gemacht). Der **Anteil gegen den
Uhrzeigersinn** ist der Schreibrichtung der Buchstaben a, o, d, g nahe — das Spiel erzwingt sie
nicht (C2), aber Thomas sieht, ob Ben sie von selbst wählt.

**Fallstricke:** Mit der Maus sind Kreise viel runder — `eingabegeraet` steht im Verlauf, Punkte
einfärben. C#-Schwellen sind in Bildschirm-px des `SpielScreen` (`SpielScreen.tsx:17-19`), nicht
in Bühnenpixeln; auf einem anderen Tablet verschiebt sich `r̄`, Rundheit und Lücke sind als
Verhältnisse davon nicht betroffen.

## B.5 Spielspaß

- **Greifautomaten-Gefühl:** die Kamera, die herunterfährt und zupackt, ist der eigentliche Reiz;
  jeder Kreis löst eine kleine Show aus.
- **Rhythmus:** Ben bestimmt das Tempo, die Warteschlange lässt ihn nie warten.
- **Belohnung:** sauberer Abschnitt, Vereinsspruch, Kameraschwenk. Ab und zu liegt unter dem Müll
  ein **verlorenes Fundstück** eines Kaderspielers („Schienbeinschoner Nr. 6") — Leitidee.
- **Effizienz als Überraschung:** liegen drei Konfetti nah beieinander, holt ein Kreis alle drei —
  Ben entdeckt das selbst.
- **Abwechslung (B3):** Kreise sind dynamisch und ohne Haltekraft — das Gegenstück zu `einlass`
  und `rasenmaehen`; gute Entspannung nach einem Druckspiel.

**C2 — kritisch geprüft.** Kein Verliererzustand: offene oder zu große Kreise tun nichts, Müll
geht nie verloren, es kommt **kein neuer Müll hinzu, solange Ben arbeitet** (sonst wäre es ein
Wettlauf gegen einen wachsenden Haufen — genau das darf nicht sein). Hilfe statt Abbruch: nach 3
offenen Kreisen hintereinander wird der Startpunkt-Leuchtring doppelt so groß; nach 2 zu großen
erscheint der Greiferkreis schon beim Aufsetzen. Hilfen ändern die Toleranz nicht und werden in
`extra.hilfen` gezählt.

## B.6 Schwierigkeit und Einstellungen (B1)

| Parameter | Formel | St. 1 | St. 2 | St. 3 | St. 4 | St. 5 |
|---|---|---|---|---|---|---|
| Größenfaktor Müll | `1,25 − 0,08·s` | 1,17 | 1,09 | 1,01 | 0,93 | 0,85 |
| Schließtoleranz (px) | `60 − 8·s` | 52 | 44 | 36 | 28 | 20 |
| ≈ in mm | | 12 | 10 | 8 | 6,5 | 4,5 |
| Greiferradius (px) | `150 − 15·s` | 135 | 120 | 105 | 90 | 75 |
| Müll je Abschnitt | `6 + s` | 7 | 8 | 9 | 10 | 11 |
| Konfetti-Drift (px/s) | `max(0, 5·(s − 2))` | 0 | 0 | 5 | 10 | 15 |

Der Drift ab Stufe 3 begründet `hand-auge`: ein langsam wanderndes Ziel einkreisen. Toleranz/
Zielgeschwindigkeit wie in A.6 nur, wenn die spielübergreifende Lücke geschlossen wird
(`toleranz` → Schließtoleranz).

## B.7 Content-Bedarf

**Pflicht: nichts.** Farben, Kader (Fundstücke), Sprüche reichen.

**Optional, auch für andere Spiele nützlich:** der Stadionname fehlt im Schema
(`typen.ts:33-49` hat `stadt` und `fakten`, aber keinen Namen). „Nach dem Spiel im
Volksparkstadion" wäre Leitidee pur; „Stadionführung" und der Startbildschirm bräuchten ihn auch.

```ts
stadion?: string          // hsv.ts: stadion: 'Volksparkstadion'
```

## B.8 Umsetzung

| Datei | Inhalt | ≈ Zeilen | Vorbild |
|---|---|---|---|
| `spiele/muell/welt.ts` | Strich, Schließen, `imPolygon`, Warteschlange, Abschnitte | 240 | `autogramme/welt.ts` (Strichpuffer, `neu`-Flag) |
| `spiele/muell/zeichnen.ts` | Rasen, Müll, Kreise, Seilkamera | 260 | `rasenmaehen/zeichnen.ts:103-160` |
| `spiele/muell/index.tsx` | Canvas, Zeiger, Bildschleife | 140 | `autogramme/index.tsx` (fast 1:1, ohne Ziffernlauscher) |
| `spiele/muell/klang.ts` | klick, surr, plopp | 60 | `ballhochhalten/klang.ts` |
| `spiele/muell/welt.test.ts` | siehe unten | 200 | `autogramme/welt.test.ts` |
| `api/Auswertung/Kreise.cs` + Tests | Rundheit, Lücke, Drehrichtung | 70 + 90 | `Kennzahlen.cs` |

**Testfälle `welt.test.ts`:** (1) Punkt-in-Polygon innen/außen/auf der Kante, auch für eine Acht;
(2) Strich unter 75 px schließt nie; (3) Ende innerhalb der Toleranz schließt, knapp außerhalb
nicht; (4) Mittelpunkt im Kreis → eingesammelt, nur Rand im Kreis → nicht; (5) Kreis größer als
`greiferRadius` → nichts eingesammelt, `zuGross++`; (6) ein Kreis um drei Konfetti holt alle drei;
(7) geschlossener Kreis ohne Müll → `leer++`; (8) Warteschlange: zwei Kreise schnell hintereinander
werden beide abgearbeitet; (9) letzter Müll → nächster Abschnitt, Gesamtzähler bleiben;
(10) Abschnitte deterministisch; (11) Drift nur ab Stufe 3; (12) Pause hebt den Stift ab, der
halbe Kreis verfällt; (13) `ergebnis` ohne Strich → Nullen statt `NaN`.

**C#-Tests für `Kreise.cs`:** synthetischer Blob mit einem Kreis gegen den Uhrzeigersinn →
Rundheit ≈ 1, Lücke ≈ 0, Anteil = 1; gerade Linie → kein Kreisversuch; Kreis mit 20 % Lücke →
Lücke ≈ 2π·0,2 ≈ 1,26.

**Eintragen** (dieselben sechs Stellen wie A.8):
`["muell"] = new(Rolle.Normal, ["wellen", "hand-auge"])`, `SPIEL_TITEL.muell = 'Platz aufräumen'`.

## B.9 Risiken und offene Fragen

- **Abdeckung:** `wellen` + `hand-auge` trägt schon „Aufwärmen" (Branch `aufwaermen-parcours`,
  Rolle `aufwaermen`, also nicht im selben Topf). Im Wochenbericht landen beide in denselben
  Zeilen — das ist gewollt, aber `muell` bringt B2 keinen neuen Bereich.
- **Kreis um alles:** durch `greiferRadius` gelöst; prüfen, ob 135 px bei Stufe 1 für ein Kind
  mit grober Motorik groß genug ist (≈ 6 cm Durchmesser).
- **Seilkamera kennt Ben nicht.** Der Profi muss sie einführen; Onboarding ist projektweit offen
  (CLAUDE.md, Phase 1).
- **Drehrichtung:** soll das Spiel sie je erzwingen? Nein — C2 und „keine Korrektur". Nur messen.
- **Konflikte mit CLAUDE.md:** keine eigenen; dieselbe Eintragungs- und Seed-Problematik wie A.9.

## B.10 Anforderungs-Check

| ID | Status | Begründung |
|---|---|---|
| A1 | erfüllt | Strich je Zeigerpunkt, Startpunkt-Leuchten, Flächenfüllung beim Schließen |
| A2 | erfüllt | Rasen, Müll, eine Kamera — keine Zahlen |
| A3 | erfüllt | Uhr des `SpielScreen` |
| A4 | erfüllt | Ereignistöne, abschaltbar |
| A5 | erfüllt | Ein Satz, vorgelesen |
| B1 | betroffen | Stufe wirkt auf 5 Parameter; Toleranz-Lücke spielübergreifend |
| B2 | erfüllt | Grafomotorik (Bögen) + Hand-Auge; keine neue Abdeckung |
| B3 | erfüllt | Dynamisch, ohne Haltekraft — Ausgleich zu Druckspielen |
| B4 | erfüllt | Alle maßgeblichen Kennzahlen aus dem Blob |
| C1 | erfüllt **nur mit Seilkamera** | Mit UFO verletzt |
| C2 | erfüllt | Kein nachwachsender Müll, Hilfen ohne Toleranzänderung |
| C3 | erfüllt | Keine Ergebnisanzeige am Ende |
| C4 | betroffen | Sauberer Rasen als Fortschritt; Bestleistung projektweit offen |
| C5 | betroffen | Lob generisch; Kandidat „Abschnitte sauber gemacht" |
| C6 | — | nicht berührt |
| D2 | erfüllt | Aufzeichnung unsichtbar |
| D4 | erfüllt | Keine personenbezogenen Daten |
