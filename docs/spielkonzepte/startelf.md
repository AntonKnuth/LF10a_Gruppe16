# Startelf — Spielkonzept

Stand: 13.11.2026. Katalog-ID `startelf`, Bereich `schreiben`. Noch nicht gebaut (zeigt heute
den `Platzhalter`, `apps/web/src/spiele/index.ts:155-160`).

## 1. Kurzfassung

Ben steht mit dem Profi in der Kabine vor der **Taktiktafel** und schreibt die Aufstellung an:
erst die Rückennummer, auf höheren Stufen auch den Namen des Spielers. Jeder Spieler, den er
geschrieben hat, wird als Magnet auf seine Position gesetzt, und der Stadionsprecher ruft ihn
auf. Weil sich Handschrift nicht auslesen lässt, **schreibt Ben nie frei**: jedes Zeichen hat
eine bekannte Strichvorlage (Druckschrift, mit Startpunkt und Richtung). Bewertet wird
geometrisch, also ob er an der Vorlage entlangfährt, wo er anfängt, in welche Richtung er
schreibt und wie gut er die Lineatur trifft. Das ist der Unterschied zur „Autogrammstunde"
(dort wird frei geschrieben und nur die Tintenmenge im Feld gezählt) und zur „Stadionführung"
(dort gelten Tempo und Druck beim Abschreiben langer Sätze).

Vorgeschlagener Katalogeintrag (`apps/web/src/spiele/katalog.ts:74-79`, nur die Anweisung ändert sich):

```ts
startelf: {
  titel: 'Startelf',
  anweisung: 'Schreibe die Aufstellung an die Tafel und fang immer am grünen Punkt an.',
  rolle: 'normal',
  tags: ['schreiben'],
},
```

Die bisherige Anweisung („Namen und Rückennummer") stimmt auf Stufe 1–2 nicht, weil dort nur
Nummern geschrieben werden. Der grüne Punkt ist die einzige Regel, die Ben kennen muss (A5).

## 2. Spielidee und Ablauf

**Fußballhandlung (C1).** In der Kabine wird vor jedem Spiel die Aufstellung an die Tafel
geschrieben. Der Profi des Vereins (bei HSV „Jonas", `content/vereine/hsv.ts:16`) hält die
Spielerkarte hoch: Trikot in Vereinsfarben, Nummer, Name. Ben schreibt sie in die Schreibzeile
der Tafel. Danach fliegt der Spielermagnet auf seinen Platz in der 4-3-3-Aufstellung. Der
Stadionsprecher ruft auf wie in der Bundesliga: *„Mit der Nummer 14 — Robert …"*, und die
Kurve antwortet *„GLATZEL!"*. Das ist ein echtes Ritual aus dem Stadion und passt zur Leitidee:
Ben schreibt die Aufstellung **dieses** Vereins.

**Die eine Regel, aus der alles folgt** (für den Kopfkommentar von `welt.ts`):

> **Ein Strich der Vorlage füllt sich nur vom Startpunkt aus und nur, solange der Stift im
> Korridor vorwärts fährt.** Woanders aufsetzen, rückwärts fahren oder abkürzen färbt nichts.
> Es geht aber auch nichts kaputt, und die Kreide bleibt grau sichtbar stehen (C2).

Daraus folgen Startpunkt- und Richtungsprüfung, ohne dass sie einzeln programmiert werden
müssen. Erlaubt ist, den Stift abzusetzen und **an der Spitze des bisher gefüllten Strichs**
wieder aufzusetzen. Kinder mit feinmotorischer Störung tun das oft. Für die Mechanik ist das
kein Fehler, für Thomas ist es ein Messwert (Absetzer über Soll).

**Ablauf einer Runde (ein Spieler):**

1. Die Spielerkarte erscheint oben rechts. Der Profi sagt einmalig den Namen.
2. In der Schreibzeile stehen die Zeichen als Vorlage. Das **aktive** Zeichen ist hervorgehoben,
   sein aktiver Strich hat einen grünen Startpunkt, einen Richtungspfeil und eine kleine
   Strichnummer.
3. Ben fährt den Strich nach. Ist der Strich zu 90 % abgefahren, gilt er als fertig. Dann
   kommen ein Klick und Funken am Strichende, und der nächste Strich bekommt seinen grünen Punkt.
4. Sind alle Striche fertig, leuchtet das Zeichen kurz in der Vereinsfarbe auf, und das nächste
   Zeichen wird aktiv.
5. Ist das letzte Zeichen fertig, kommt der Jubel (1,6 s): der Magnet fliegt an seinen Platz,
   der Stadionsprecher ruft auf, danach erscheint der nächste Spieler.
6. Sind alle 11 Spieler auf der Tafel: „Die Startelf steht!" (2 s, Einlauf-Klang). Danach kommt
   eine neue Tafel für das „Rückspiel", mit denselben 11 in umgekehrter Reihenfolge.

**Endbedingung: die Uhr** (`zeitAbgelaufen`, wie bei der Autogrammstunde,
`spiele/autogramme/index.tsx:132-134`). Eine Endbedingung über den Inhalt („11 Spieler")
scheidet aus: auf Stufe 1 ist sie in etwa 90 s erreicht, auf Stufe 4 gar nicht, und A3 verlangt
3–5 Minuten. Läuft die Uhr mitten in einer Tafel ab, **ergänzt der Profi die restlichen Magnete**.
Sie fliegen in 1,5 s selbst an ihren Platz, erst danach kommt `onFertig`. Ben sieht nie eine halbe
Aufstellung. Die `dauerMs` wird beim Ablauf der Uhr eingefroren, die Schlussanimation zählt nicht mit.

**Abgrenzung zu den zwei anderen Schreibspielen:**

| | Autogrammstunde (gebaut) | Stadionführung (Konzept) | **Startelf** |
|---|---|---|---|
| Was Ben schreibt | eigenes Autogramm, frei | Stadionfakten, ganze Sätze | Nummer und Name, Zeichen für Zeichen |
| Vorlage | keine, nur ein Feld | Text zum Abschreiben | Strichvorlage mit Start und Richtung |
| Was zählt | Strecke im Feld (`welt.ts:161-185`) | Tempo und Druck gleichmäßig | Formtreue, Startpunkt, Richtung, Lineatur |
| Feinmotorischer Kern | Pinzettengriff (kleines Feld) | Schreibfluss | Buchstabenform und Bewegungsrichtung |
| Kader wird genutzt als | Deko auf dem Trikot | — | **Aufgabeninhalt** |

Aus der Autogrammstunde übernommen werden nur Muster, kein Verhalten: Bühne und `Sicht`, das
Feld `neu` am Schriftpunkt (keine Linie durch die Luft, `autogramme/zeichnen.ts:172-173`), die
Jubeluhr, die Sperre während `angehalten` und das Trikot als Bildidee.

## 3. Grafik

**Bühne 900×640** wie alle Spiele, eingepasst über `berechneSicht`
(`autogramme/zeichnen.ts:33-36`). Der Hintergrund wird in Canvas-Koordinaten gefüllt
(`autogramme/zeichnen.ts:52-60`).

```
  0                 290                                          900
  +------------------+--------------------------------------------+ 0
  | TAKTIKTAFEL      |  SPIELERKARTE            ┌───────┐         |
  |  (grüner Platz)  |  „ROBERT GLATZEL"        │  14   │ Trikot  | 30-160
  |    (9) (14) (18) |                          └───────┘         |
  |                  |  ─────────────────────────────── Oberlinie | 200
  |   (6) (7) (10)   |  ▒▒▒▒▒▒▒▒▒▒▒ Mittelband ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ |
  |                  |  ●→ ┊1 ┊  ┊4 ┊   G L A T Z E L (gestrichelt)| Grundlinie
  | (3) (4) (28) ( ) |  ───────────────────────────────            |
  |                  |       Unterband                            | ~440
  |      ( 1 )       |                                            |
  |                  |  [Profi-Kopf]  Sprechblase (nur bei Hilfe) | 480-600
  +------------------+--------------------------------------------+ 640
```

- **Taktiktafel** (x 24–284, y 30–610): dunkelgrüner Platz, 11 blasse Magnetplätze. Gesetzte
  Magnete in `verein.farben.primaer`, Nummer in `sekundaer`. Die Tafel ist die
  Fortschrittsanzeige, ohne Zahl (A2, C4).
- **Spielerkarte**: kleines Trikot mit Nummer, daneben der Name in Druckschrift, zum Abgucken.
  Die Trikotform aus `autogramme/zeichnen.ts:71-129` neu zeichnen, nicht über Ordnergrenzen
  importieren.
- **Schreibzeile** (x 310–880, y 180–450): Lineatur wie im Heft der 1. Klasse, drei gleich hohe
  Bänder, Mittelband hellblau. Auf Stufe 1 bekommt jede Ziffer ein Rechenheft-Kästchen.
- **Profi-Kopf** mit Sprechblase, nur bei Hilfe sichtbar.

Mit Tafel, Karte, Schreibzeile, Profi und dem Anhalte-Knopf aus `App.tsx` sind es höchstens
5 Elemente (A2). Kein Punktestand, keine Prozentzahl.

**Zeichenreihenfolge in `zeichne()`:** Hintergrund (Kabinenwand) → Tafel mit Platz →
Magnete → Spielerkarte → Lineatur → Vorlage (erledigte Striche in Vereinsfarbe, offene
gestrichelt grau) → Bens Kreide (auf der Vorlage dunkel, daneben hellgrau) → Startpunkt und
Pfeil des aktiven Strichs → Funken → fliegender Magnet und Jubel → Sprechblase.

**Sofortfeedback (A1, unter 100 ms):**

| Ereignis | Reaktion | Latenz |
|---|---|---|
| Stift bewegt sich | Kreidestrich unter dem Stift, im nächsten Bild gezeichnet | ≤ 16 ms |
| Fortschritt auf dem Strich | gestrichelte Vorlage wird hinter der Stiftspitze **durchgezogen** in Vereinsfarbe | ≤ 16 ms |
| Strich fertig | kurzer Kreideklick (WebAudio, 40 ms), 6 Funken am Strichende | ≤ 16 ms + Audio-Latenz |
| Zeichen fertig | Zeichen pulsiert 300 ms, Ton eine Terz höher als der Klick | ≤ 16 ms |
| Spieler fertig | Magnet fliegt (600 ms), Stadionsprecher per `vorlesen()` (`ui/vorlesen.ts:8`) | Bild ≤ 16 ms, Sprache ~200 ms |
| Falscher Start | grüner Punkt pulsiert größer, **kein** Fehlerton | ≤ 16 ms |

Die Sprachausgabe ist langsamer als 100 ms, ist aber auch nicht das Feedback auf die Teilbewegung.
Das liefern der Durchzieh-Effekt und der Klick. `vorlesen()` beachtet den Ton-Schalter (A4).

**Farben:** Kreide auf der Vorlage `#1f3550`, daneben `#b9c3cf` (hellgrau). **Kein Rot**, anders
als in der Autogrammstunde (`autogramme/zeichnen.ts:174`). Rote Striche an Buchstaben kennt ein
Kind aus der Heftkorrektur, und genau dieses Gefühl soll hier nicht entstehen (C2).

**In `zeichnen.ts`:** `berechneSicht`, `zeichne`, `tafel`, `magnet`, `karte`, `lineatur`,
`vorlage`, `kreide`, `startpunkt` (Kreis und Pfeil an der Strichtangente), `funken`, `jubel`,
`sprechblase`. Wie bei den anderen Spielen nur lesend auf der Welt.

## 4. Datenerfassung

### Kernfelder

| Feld | Quelle in `ergebnis()` | Bemerkung |
|---|---|---|
| `vollstaendigkeit` | fertige Zeichen ÷ begonnene Zeichen, das laufende anteilig | vom Profi ergänzte Magnete zählen **nicht** |
| `genauigkeit` | Abtastungen im Korridor des aktiven Strichs ÷ alle Abtastungen | wie `linie/welt.ts:156-175` |
| `druckMittel/-Streuung` | `druckKennzahlen(w.druckWerte)` | `eingabe.ts:59` |
| `eingabegeraet`, `synthetischerDruck` | aus `geraetVon` und `druckVon` | |
| `stufe`, `abgebrochen` | durchgereicht | |

Beide Browser-Werte bekommen den bekannten **Unmaßgeblich**-Kommentar
(`autogramme/welt.ts:206-213`). Sie treiben nur die Sterne nach dem Lob.

### `extra`

```json
{
  "version": 1,
  "massstab": { "s": 0.94, "dx": 38.5, "dy": 0 },
  "massstabGeaendert": false,
  "spielerGeschrieben": 9,
  "spielerVomProfi": 2,
  "tafeln": 1,
  "striche": 57,
  "falscheStarts": 6,
  "gegenrichtung": 2,
  "hilfeMitfahren": 1,
  "zeichen": [
    { "z": "1", "nummer": 14, "band": 72, "oben": 200, "grund": 344,
      "strichVon": 0, "strichBis": 2, "fertig": true, "soll": [[322,236, 362,200, 362,344]] }
  ]
}
```

Zwei Entscheidungen stecken darin:

1. **`massstab`** rechnet die Rohdaten auf die Bühne um. Der `SpielScreen` zeichnet in
   CSS-Pixeln des Spielbereichs auf (`screens/SpielScreen.tsx:17-19, 56-66`), die Vorlage liegt
   in Bühnenkoordinaten. Mit `s = sicht.s / dpr` usw. gilt `xBühne = (xRoh − dx) / s`, wobei
   `dpr = cv.width / rect.width` ist. Ändert sich die Sicht während des Spiels (iPad gedreht),
   wird `massstabGeaendert = true` gesetzt, und C# rechnet keine Geometrie-Kennzahlen.
2. **Zuordnung über die Strichnummer, nicht über die Zeit.** Das Spiel kennt den Zeitnullpunkt
   des `SpielScreen` nicht (`beginn` ist dort eine private Referenz), und die Rohdaten-Zeit
   enthält Pausen. Stattdessen zählt `welt.ts` jedes Aufsetzen (`striche++`), auch während des
   Jubels. Jedes Zeichen merkt sich `strichVon`/`strichBis`. C# zerlegt die Rohdaten an den
   Druck-0-Punkten, die der `SpielScreen` beim Absetzen schreibt (`SpielScreen.tsx:122-126`), in
   Striche und ordnet sie über den Index zu. **Stimmt die Anzahl nicht mit `extra.striche`
   überein, gibt C# `null` zurück**, nach dem Grundsatz „lieber keine Zahl als eine erfundene"
   (`apps/api/Auswertung/Kennzahlen.cs:57-59`).

`soll` sind die Vorlagenstriche in ganzzahligen Bühnenkoordinaten. Das sind 60 Zeichen à ~12
Punkte, etwa 6 KB JSON. Die Punktfolge selbst steht nicht drin, die ist im Blob (CLAUDE.md:
keine JSON-Punktobjekte).

### Maßgebliche Kennzahlen in C#

Die bestehenden Werte aus `Kennzahlen.Berechne` (Tempo, Zittern, Druck, Absetzer) gelten
unverändert. Neu ist **`Auswertung/Schreibkennzahlen.cs`**, eine reine Rechenklasse wie
`Kennzahlen.cs`. Sie nimmt Blob und `extra`-JSON und liefert
`Schreibkennzahl(Groesse, Groessenstreuung, Lineaturtreue, Formabweichung, AbsetzerUeberSoll,
Startpunkttreffer, Problemzeichen)`. Für Zeichen *z* mit Abtastungen *P_z* (nur Druck > 0,
auf die Bühne umgerechnet), Sollhöhe *h_z* = `grund − oben` und Bandhöhe *b_z*:

| Kennzahl | Formel | Was Thomas daraus liest |
|---|---|---|
| **Größe** | Mittel über z von (Q95(y) − Q5(y)) / h_z | 1,0 = trifft die Lineatur. > 1,3 zu groß (typisch bei schwacher Steuerung), < 0,7 verkrampft-klein |
| **Größenstreuung** | Streuung derselben Quotienten | Größenkonstanz, ein Kernmerkmal der Dysgraphie |
| **Lineaturtreue** | Anteil von P mit `oben − 0,25·b ≤ y ≤ grund + 0,25·b` | hält er die Linien ein |
| **Formabweichung** | Mittel über P des Abstands zum nächsten Punkt der `soll`-Polylinien, geteilt durch b_z | einheitenlos, damit über Stufen hinweg wenigstens grob vergleichbar |
| **Absetzer über Soll** | Σ max(0, Ist-Striche_z − Soll-Striche_z) / Anzahl Zeichen | zögerliches, abgehacktes Schreiben |
| **Startpunkttreffer** | Anteil der Ist-Striche, deren erste Abtastung < 0,4·b von einem Soll-Start von z liegt | Schreibrichtung und Strichfolge |
| **Problemzeichen** | Zeichen mit ≥ 3 Vorkommen und Startpunkttreffer < 50 %, die drei schlechtesten | z. B. „3, S, 9", ein Hinweis auf Spiegelschrift |

Die Quantile Q5/Q95 statt Min/Max: ein einzelner Ausrutscher soll nicht die Größe bestimmen. Im
Bericht steht das als ein Satz. **Problemzeichen** kommen bewusst aus C# und nicht aus dem
Browser-Zähler `falscheStarts`, sonst stünde ein unmaßgeblicher Wert im Bericht.

**Verlauf:** Größe, Lineaturtreue und Formabweichung als Kurven, eingefärbt nach Stufe wie
bisher. **Wochenbericht:** im zugeklappten Teil „Einzelübungen" (`docs/entscheidungen.md`
Abschnitt 8) eine Zeile *Schrift (Startelf)*: „Größe 1,15 ± 0,21 · Lineatur 87 % ·
Startpunkt 71 % · +0,4 Absetzer/Zeichen · auffällig: 3, S". Prozente nur hier (C4).

### Fallstricke

- **Handballen auf dem Display.** Ein schreibendes Kind legt die Hand ab. Heute filtert kein
  Spiel nach `pointerId` oder `pointerType` (`autogramme/index.tsx:67` u. a.), und der
  `SpielScreen` zeichnet jeden Zeiger auf. Startelf muss nach dem ersten `pen`-Ereignis
  **`touch` ignorieren** und nur den Zeiger des ersten Aufsetzens verfolgen. Für die Rohdaten
  bräuchte es denselben Filter im `SpielScreen`, sonst kippt dort die Strichzählung, und C#
  liefert dann (korrekt) `null`. Den Filter im `SpielScreen` muss die Person bauen, der die
  Datei gehört. Die anderen Spiele betrifft er auch.
- **`pointercancel` schreibt keinen Druck-0-Punkt** (`SpielScreen.tsx:128-130`). Zwei Striche
  verschmelzen dann in C#, die Zählung passt nicht mehr, und es kommt `null`. Das ist ehrlich,
  aber vermeidbar, wenn der `SpielScreen` dort ebenfalls `nimmAuf(e, 0)` aufruft.
- **Maus und Finger:** Die Geometrie gilt auch dort, beschreibt aber eine andere Motorik. Der
  Verlauf trennt nach `eingabegeraet`, der Druck ist synthetisch markiert (`eingabe.ts:44-47`).
- **Stufe:** Die Bandhöhe hängt von der Stufe ab. Größe und Formabweichung sind relativ zum
  Band, die Stufe bleibt im Verlauf trotzdem markiert.

## 5. Spielspaß

- **Rhythmus:** Eine Ziffer ist 1–2 Striche, also 2–4 s bis zum nächsten Klick. Auf Stufe 1
  kommt alle 5–8 s ein Spieler auf die Tafel. So kurze Belohnungsschleifen braucht ADHS.
- **Ritual statt Punkte:** Stadionsprecher und Kurve sind die Belohnung, keine Zahl.
- **Überraschung:** Je Tafel trägt ein Spieler (Startwert aus dem Tafelindex) die
  **Kapitänsbinde**: gelbe Binde am Magnet, doppelter Kurvenruf.
- **Steigerung:** Die Tafel füllt sich sichtbar von hinten nach vorn, der Torwart hat meist eine
  einstellige Nummer, die Stürmer zweistellige. Die Rückspiel-Tafel kehrt die Reihenfolge um.
- **Abwechslung (B3):** Ziffern, Groß- und Kleinbuchstaben wechseln sich ab. Nach jeder vollen
  Tafel kommen 2 s Einlauf ohne Stift. Hoher Dauerdruck wird nicht bestraft (das ist Aufgabe
  von „Platzwart"), aber für Thomas als Verkrampfungszeichen aufgezeichnet.
- **Vereinsbezug:** Der Profi gehört selbst zum Kader (HSV: Jonas Meffert, #6). Bei seinem
  Magneten sagt er „Das bin ich!", das ist ein Vergleich mit `profi.name`.
- **Lob (C5)** kommt aus dem bestehenden Ablauf nach dem Spiel. Im Spiel spricht der Profi nur
  bei Hilfe und bei seinem eigenen Magneten.

### Kein Game Over (C2), kritisch geprüft

Die Idee **hat** ein C2-Problem: Eine feste Vorlage kennt „richtig" und „falsch", und ein Kind,
das die 3 immer unten anfängt, kommt nach der Regel oben nie weiter. Das wäre ein
Verliererzustand, auch ohne dass „Game Over" auf dem Bildschirm steht. Lösungen:

1. **Hilfeleiter statt Stillstand**, je Strich: Beim 1. falschen Start pulsiert der grüne
   Punkt. Beim 2. rollt ein Ball einmal den Strich entlang, dazu die Sprechblase „Fang am
   grünen Punkt an". Ab dem 4. oder nach 8 s ohne Fortschritt kommt der **Mitfahrmodus**: Der
   Ball rollt langsam voraus, Ben fährt hinterher. Der Strich wird **nie** automatisch
   erledigt, das brächte nichts bei. Ben schafft aber jedes Zeichen, weil der Mitfahrmodus
   jede Bewegung zeigt.
2. **Kein Rot, kein Fehlerton.** Graue Kreide neben der Vorlage bleibt stehen, bis das Zeichen
   fertig ist, und blendet dann aus.
3. **Keine halbe Tafel** bei Abpfiff: Der Profi ergänzt (siehe Abschnitt 2).
4. **Spiegelschrift** (bei 7-Jährigen normal) wird nie als Fehler gezeigt. Sie landet als
   `gegenrichtung` im Extra und als Problemzeichen bei Thomas.
5. **20 s ohne Stift:** einmal „Wir schreiben zusammen weiter", danach nichts mehr. Kein
   Nörgeln, kein Abbruch.

## 6. Schwierigkeit und Einstellungen (B1)

Die Stufe bewegt sich auf zwei Achsen: **Inhalt** (Nummer → Kurzname → voller Name, wie
vorgesehen) und **Hilfe** (dicke Spur → dünne Spur → nur Geisterschrift). Werte in
Bühnen-Pixeln. Das sind Startwerte, keine Messwerte, und sie müssen mit echtem Pencil auf dem
Zielgerät nachgezogen werden (wie `linie/welt.ts:62-64`).

| Stufe | Inhalt je Spieler | Hilfe | Band b | Korridor (halbe Breite) | Startradius |
|---|---|---|---|---|---|
| **1** | Rückennummer | dicke Strichel, Pfeil, Strichnummer, Rechenkästchen | 90 | 0,45·b = 40 | 0,5·b = 45 |
| **2** | Rückennummer | dünne Strichel, Pfeil erst ab Hilfe 2 | 72 | 0,38·b = 27 | 0,45·b = 32 |
| **3** | Nummer + Trikotname in GROSSBUCHSTABEN („GLATZEL") | dünne Strichel, Startpunkt | ≤ 60 | 0,35·b ≈ 21 | 0,4·b = 24 |
| 4 | Nummer + Nachname in Groß/klein („Glatzel") | nur Geisterschrift (15 % Deckkraft) + Startpunkt | ≤ 48 | 0,4·b ≈ 19 | 0,4·b |
| 5 | Nummer + Vor- und Nachname, zwei Zeilen | wie 4 | ≤ 40 | 0,4·b = 16 | 0,4·b |

- „≤": Passt das Wort nicht in 570 px Zeilenbreite, wird das Band verkleinert, aber nie unter
  **36 px**. Ein Content-Test stellt sicher, dass es immer passt (Abschnitt 7).
- Der Korridor hat eine Untergrenze von 12 px wie bei „Linie malen". Auf Stufe 4–5 wird er
  relativ breiter, weil die Vorlage kaum sichtbar ist.
- **Freies Abschreiben ohne Vorlage gibt es auf keiner Stufe.** Das ließe sich nicht bewerten,
  Handschrift ist nicht auslesbar. Die Geisterschrift ist die kleinste Hilfe, die noch eine
  geometrische Prüfung erlaubt.
- Die Vorgabestufe ist 3 (`engine/tagesplan.ts:33`, `apps/api/Daten/Seed.cs:64`). Deshalb ist
  Stufe 3 so gelegt, dass sie für einen Zweitklässler machbar ist: Großbuchstaben, gerade
  Striche, sichtbare Spur.
- Fest und nicht einstellbar: Strich fertig bei **90 %** der Bogenlänge, Vorsprung je Abtastung
  höchstens **0,6·b** (siehe Abschnitt 8), Jubel 1,6 s.

**Befund für das ganze Projekt:** Toleranz, Zielgeschwindigkeit und Mindesttrefferquote sind
in der Therapeuten-App einstellbar (`apps/therapeut/src/screens/Einstellungen.tsx:141-154`) und
kommen bis `engine/tagesplan.ts:11-16`. Das Segment trägt aber nur die `stufe`
(`engine/tagesplan.ts:196`), und `SpielProps` kennt nur `stufe` (`spiele/index.ts:127-142`).
**Kein Spiel liest diese drei Werte.** Für Startelf wäre die Abbildung einfach:
`toleranz` × Korridor, `mindesttrefferquote` → Fertig-Schwelle statt fester 90 %,
`zielgeschwindigkeit` bewusst ungenutzt (Tempo ist das Kriterium der Stadionführung, und
Zeitdruck verschlechtert bei ADHS die Form). Das Durchreichen ist aber eine Änderung an Engine
und Schnittstelle. Die Gruppe sollte sie einmal für alle Spiele entscheiden, nicht in diesem
Spiel. Bis dahin folgt Startelf dem bestehenden Muster „alles aus der Stufe".

## 7. Content-Bedarf

**Schema** (`content/typen.ts:45`), eine additive Änderung:

```ts
/** Startelf: Namen und Rückennummern zum Schreiben. Reihenfolge = Aufstellung von hinten
 *  nach vorn (Torwart, 4 Abwehr, 3 Mittelfeld, 3 Sturm). */
kader: {
  nummer: number
  name: string
  /** Was auf dem Trikot steht, wenn der Nachname zu lang ist (max. 9 Zeichen). Sonst das
   *  letzte Wort von `name`. */
  trikotname?: string
}[]
```

Die Autogrammstunde liest weiterhin nur `nummer` und `name`, für sie ändert sich nichts. Ein
Positionsfeld ist nicht nötig, weil die Reihenfolge die Aufstellung festlegt.

**HSV** (`content/vereine/hsv.ts:29-36`, erweitert auf 11). Die fünf neuen Einträge sind
Beispiele, Nummern und Zugehörigkeit **vor dem Einbau prüfen**. Laut CLAUDE.md sind echte
Bezüge ohnehin nur Platzhalter.

```ts
kader: [
  { nummer: 1, name: 'Daniel Heuer Fernandes', trikotname: 'Heuer' },
  { nummer: 3, name: 'Moritz Heyer' },          // neu, prüfen
  { nummer: 4, name: 'Sebastian Schonlau' },
  { nummer: 28, name: 'Miro Muheim' },          // neu, prüfen
  { nummer: 15, name: 'Nicolas Capaldo' },      // neu, prüfen
  { nummer: 6, name: 'Jonas Meffert' },
  { nummer: 7, name: 'Immanuel Pherai' },
  { nummer: 10, name: 'Ludovit Reis' },
  { nummer: 18, name: 'Bakery Jatta' },         // neu, prüfen
  { nummer: 14, name: 'Robert Glatzel' },
  { nummer: 27, name: 'Davie Selke' },          // neu, prüfen
],
```

Ajax hat heute 4 Einträge (`content/vereine/ajax.ts:25-30`) und braucht ebenfalls 11.

**Schriftsatz ist kein Content**, sondern Code: `spiele/startelf/schrift.ts`. Er gehört zu
keinem Verein, und ein neuer Verein darf ihn nicht anfassen müssen. Format: y in Bandhöhen
(0 = Oberlinie, 1 = Mittellinie, 2 = Grundlinie, 3 = Unterlinie), x in Bandhöhen ab der
linken Zeichenkante, ein Strich ist eine Punktfolge in Schreibrichtung. **Ein Strich mit nur
einem Punkt ist ein Tupfer** (i-Punkt, Umlautpunkte). Er gilt als erledigt, sobald Ben im
Startradius aufsetzt.

```ts
'1': { breite: 0.8, striche: [[p(0.1, 0.5), p(0.7, 0), p(0.7, 2)]] },
'4': { breite: 1.0, striche: [[p(0.75, 0), p(0.05, 1.4), p(0.95, 1.4)], [p(0.75, 0.6), p(0.75, 2)]] },
'L': { breite: 0.9, striche: [[p(0.1, 0), p(0.1, 2), p(0.85, 2)]] },
'O': { breite: 1.4, striche: [bogen(0.7, 1, 0.65, 1, -90, 270)] }, // oben beginnend, gegen den Uhrzeigersinn
'ö': { breite: 1.0, striche: [bogen(0.5, 1.5, 0.45, 0.5, -90, 270), [p(0.3, 0.6)], [p(0.7, 0.6)]] },
```

Umfang: 0–9, A–Z, ÄÖÜ, a–z, äöüß. Zeichen ohne Vorlage (é, Ľ, Bindestrich) fängt der
Content-Test ab, dann muss ein `trikotname` gesetzt werden.

## 8. Umsetzung

| Datei | Inhalt | ca. Zeilen |
|---|---|---|
| `spiele/startelf/schrift.ts` | Schriftsatz, `p()`, `bogen()`, `zeileFuer(text, band, x0, y0)` → Zeichen mit Polylinien in Bühnenkoordinaten | 160 |
| `spiele/startelf/welt.ts` | Zustand, die eine Regel, Hilfeleiter, Tafel/Spielerfolge, `ergebnis()` | 300 |
| `spiele/startelf/zeichnen.ts` | siehe Abschnitt 3 | 250 |
| `spiele/startelf/index.tsx` | Kopie von `autogramme/index.tsx` plus Zeigerfilter, `massstab`, `vorlesen` | 160 |
| `spiele/startelf/klang.ts` | `ton()` nach `ballhochhalten/klang.ts`: Klick, Zeichen, Einlauf | 50 |
| `spiele/startelf/welt.test.ts`, `schrift.test.ts` | siehe unten | 260 |
| `apps/api/Auswertung/Schreibkennzahlen.cs` + `api.tests/SchreibkennzahlenTests.cs` | Abschnitt 4 | 120 + 100 |
| `spiele/index.ts`, `katalog.ts`, `content/typen.ts`, `hsv.ts`, `ajax.ts` | je 1–12 Zeilen | 30 |
| *Phase 2:* `Endpunkte/Bericht.cs`, `therapeut/src/screens/Bericht.tsx` | Schreibzeile anzeigen | 25 + 30 |

Insgesamt etwa 1.250 Zeilen ohne Phase 2. Der Schriftsatz ist Fleißarbeit, aber ohne Logik,
und lässt sich von einer zweiten Person parallel füllen.

**Kern von `welt.ts`, die Fortschrittsregel.** `aufBahn` aus dem Aufwärm-Parcours
(`origin/aufwaermen-parcours:apps/web/src/spiele/aufwaermen/welt.ts`, Funktion `aufBahn`) sucht
den nächsten Punkt auf der **ganzen** Polylinie. Für Buchstaben ist das falsch: Bei O, 0 und 8
liegen Anfang und Ende aufeinander, das erste Aufsetzen am Startpunkt würde den Fortschritt
sofort auf 100 % setzen. Deshalb wird nur im **Fenster [Fortschritt, Fortschritt + 0,6·b]**
gesucht:

```ts
/** Fortschritt in Bühnen-Pixeln Bogenlänge auf dem aktiven Strich. Gesucht wird nur knapp vor
 *  der Spitze: so springt ein geschlossenes O nicht beim ersten Punkt auf fertig, und
 *  quer durch die Schleife abzukürzen bringt nichts. */
function fahre(w: Welt, x: number, y: number) {
  const s = aktiverStrich(w)
  const { bogen, abstand } = naechsterPunkt(s, x, y, w.fortschritt, w.fortschritt + 0.6 * w.band)
  const drin = abstand <= korridor(w)
  // … proben zählen, Kreide merken …
  if (drin && bogen > w.fortschritt) w.fortschritt = bogen
  if (w.fortschritt >= 0.9 * s.laenge) strichFertig(w)
}
```

Beim Aufsetzen (`setzeAn`) wird `striche++` gezählt, immer, auch im Jubel. Liegt der Punkt
nicht im Startradius um die **Spitze** (`punktBei(s, w.fortschritt)`), steigt `falscheStarts`,
und die Hilfeleiter rückt vor. Liegt er nahe dem **Strichende** eines offenen Strichs, steigt
zusätzlich `gegenrichtung`.

**Testfälle `welt.test.ts`** (Muster: `autogramme/welt.test.ts`):

1. „1" in 5-px-Schritten nachfahren → fertig. 2. Am Strichende aufsetzen, zum Start fahren →
Fortschritt 0, `gegenrichtung` 1. 3. **„0": Aufsetzen am Start springt nicht auf fertig.**
4. „0" quer durchfahren → Fortschritt ≤ 0,6·b. 5. Mitten im Strich absetzen, an der Spitze
weiter → geht weiter, `striche` = 2. 6. Woanders aufsetzen → kein Fortschritt,
`falscheStarts` + 1, Kreide bleibt. 7. Tupfer im „ö" per Antippen. 8. Außerhalb des Korridors
zählt in `proben`, nicht `probenDrin`. 9. Hilfeleiter 2 → Ball, 4 → Mitfahren, Strich **nie**
von selbst fertig. 10. Stufe 1 „14", 3 „14 GLATZEL", 4 „14 Glatzel", 5 zwei Zeilen. 11. Langer
Name: Band schrumpft, nie unter 36 px, alles in x 310–880. 12. Nach 11 Spielern neue Tafel
rückwärts, ein kleinerer Kader wiederholt sich. 13. Aufsetzen im Jubel zählt in `striche`,
aber zu keinem Zeichen. 14. `strichVon`/`strichBis` lückenlos und aufsteigend, vom Profi
ergänzte Spieler nicht in `vollstaendigkeit`. 15. Ohne Verein: Ersatzkader, Standardfarben.

**`schrift.test.ts`:** jeder Punkt jedes Zeichens liegt in y 0–3 und x 0–`breite`. 0–9 sind
vollständig. **Jeder Kader-Eintrag jedes Vereins ist darstellbar**, als Nummer, Trikotname
(höchstens 9 Zeichen) und voller Name, und passt auf Stufe 5 mit Band ≥ 36 px in die Zeile. So
gibt ein Content-Fehler einen Testfehler statt eines leeren Kästchens.

**C#-Tests:** genau nachgefahrene Vorlage ergibt Größe ≈ 1, Formabweichung ≈ 0 und
Startpunkttreffer 1. Umgekehrt gefahrene Striche ergeben Startpunkttreffer 0. Strichanzahl ≠
`extra.striche` ergibt `null`. `massstabGeaendert` ergibt `null`. Die Umrechnung CSS → Bühne
stimmt mit `s = 0,5`, `dx = 20`.

**Katalog:** `katalog.ts` nur die neue Anweisung. `apps/api/Auswertung/Spielkatalog.cs:168`
steht schon richtig (`Normal`, `schreiben`). In `spiele/index.ts:155` kommt
`startelf: Startelf` dazu.

## 9. Risiken und offene Fragen

**Technisch**
- **Handschrift ist nicht auslesbar.** Das ganze Konzept beruht darauf, dass nie frei
  geschrieben wird. Wer später „ohne Vorlage" verlangt, verlangt Handschrifterkennung, und die
  ist ausgeschlossen.
- **Strichzuordnung zwischen Spiel und `SpielScreen`** hängt daran, dass beide dieselben
  Aufsetzer sehen. Handballen und `pointercancel` brechen das (Abschnitt 4). Ohne die zwei
  kleinen Korrekturen im `SpielScreen` liefert C# öfter `null` als nötig.
- **Latenz bei vielen Zeichen:** Die Kreide wird jedes Bild komplett neu gezeichnet. Bei
  3,5 min auf Stufe 5 sind das ~12.000 Punkte. Fertige Zeichen sollten deshalb in ein
  Offscreen-Canvas gezeichnet werden (einfacher Cache, ~15 Zeilen), sonst wackelt A1.
- **Zeilenhöhe in Pixeln.** Die Toleranz bleibt laut CLAUDE.md einheitenlos, aber eine
  Bandhöhe von 90 Bühnen-px ist auf iPad 10,9" und 12,9" physisch verschieden groß. Für den
  Verlauf eines Kindes auf einem Gerät ist das egal, ein Gerätewechsel verschiebt aber die
  Größenwerte.

**Therapeutisch**
- **Welche Schrift lernt Ben?** Strichfolge und Startpunkte unterscheiden sich zwischen
  Druckschrift und Grundschrift und zwischen Bundesländern. Den Schriftsatz muss **Thomas
  freigeben**, bevor er gebaut wird. Sonst trainiert das Spiel eine andere Bewegung als die
  Schule.
- **Lernt Ben Nachfahren statt Schreiben?** Nachspuren ist in der Ergotherapie üblich, aber
  ein Zwischenschritt. Die Stufen 4–5 mit Geisterschrift sind der Übergang. Ob das reicht,
  entscheidet Thomas über die Stufe.
- **Startpunktprüfung als Druck:** Für manche Kinder ist schon „falscher Start" belastend. Die
  Hilfeleiter fängt das auf. Falls Thomas es trotzdem lockern will, wäre „jeder Strich darf an
  beiden Enden beginnen" ein einzelner Schalter in `welt.ts`.

**Konflikte mit CLAUDE.md / entscheidungen.md**
- **Echte Spielernamen:** 11 statt 4–6 je Verein. Das Persönlichkeitsrecht-Thema wächst mit,
  bleibt aber reiner Content-Austausch.
- **Drei Schreibspiele unter `schreiben`:** Der Bereich mittelt im Wochenbericht Autogramm,
  Stadionführung, Startelf und Abschiedsgeschenk, also unterschiedliche Fähigkeiten. Ein
  eigener Bereich (`buchstabenform`) wäre sauberer, ändert aber `Kategorie`
  (`katalog.ts:17-24`), `Spielkatalog.cs` und die Therapeuten-App. Empfehlung: zunächst
  `schreiben`, die Frage mit Thomas klären. Positiv daran: der Tagesplan setzt Startelf und
  Autogramm wegen des gemeinsamen Bereichs selten direkt hintereinander.
- `docs/entscheidungen.md` nennt in Abschnitt 8 noch `Kategorien.cs`, heute heißt die Datei
  `Spielkatalog.cs`.

## 10. Anforderungs-Check

| ID | Status | Begründung |
|---|---|---|
| A1 | erfüllt | Kreide und Durchziehen ≤ 16 ms, Klick und Funken bei Strichende. Risiko: Neuzeichnen vieler Punkte → Offscreen-Cache |
| A2 | erfüllt | ≤ 5 Elemente, kein Punktestand, Tafel statt Zahl |
| A3 | erfüllt | Uhr des `SpielScreen`, Ende über `zeitAbgelaufen`, angehalten steht alles |
| A4 | erfüllt | nur Klick, Einlauf, Sprecher; alles über `tonLautstaerke`/`vorlesen` abschaltbar |
| A5 | erfüllt | ein Satz, vorgelesen; die Aufgabe ist immer genau ein Zeichen mit grünem Punkt |
| B1 | betroffen | 5 Stufen mit Werten. Toleranz/Mindesttrefferquote erreichen kein Spiel (projektweiter Befund, Abschnitt 6) |
| B2 | erfüllt | fünftes fertiges Spiel nach Ball hochhalten, Platzwart, Linie, Autogramm |
| B3 | erfüllt | Wechsel Ziffer/Groß/klein, Rückspiel umgekehrt, Einlauf als Mikropause |
| B4 | erfüllt | Rohdaten über den `SpielScreen`, Geometrie im Extra. Risiko: Handballen, `pointercancel` |
| C1 | erfüllt | Aufstellung an der Kabinentafel, Stadionsprecher |
| C2 | Risiko → gelöst | Vorlage kennt „falsch". Hilfeleiter, kein Rot, Profi ergänzt die Tafel |
| C3 | unberührt | Selbsteinschätzung läuft im bestehenden Ablauf nach dem Spiel |
| C4 | erfüllt | Tafel als Fortschritt im Spiel, Prozente nur bei Thomas |
| C5 | erfüllt | Lob danach. Profi spricht bei Hilfe und bei seinem eigenen Magneten |
| C6 | unberührt | Inhalt wechselt automatisch mit dem Verein (Kader) |
| D2 | erfüllt | keine sichtbare Aufzeichnung, Extra und Blob gehen mit dem Sitzungs-PUT |
| D4 | erfüllt | keine Bilder, keine Personendaten von Ben. Gespeichert werden nur Koordinaten, Spielernamen sind Content |
