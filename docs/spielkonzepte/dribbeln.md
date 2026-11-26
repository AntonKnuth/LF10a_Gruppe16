# Spielkonzept: Dribbeln mit Pfiff (`dribbeln`)

Stand: 13.11.2026 · Konzept, noch kein Code · Bereiche `inhibition` + `wellen`

## 1. Kurzfassung

Ben dribbelt den Ball mit dem Stift über eine flache Wellenbahn zu einem Mitspieler. Pfeift
der Trainer (Ton **und** roter Ring um den Ball), muss die Stiftspitze stehen bleiben, ohne
abzuheben, bis der Doppelpfiff kommt. Es ist das einzige Spiel für **Reaktionshemmung** und
damit für Bens ADHS das therapeutisch wichtigste. Gemessen wird, wie schnell er eine laufende
Bewegung stoppt, wie weit er nachläuft, wie ruhig er hält und ob er vor dem Doppelpfiff
wieder losläuft. Die Pfiff-Zeitpunkte gehen als Ereignisliste ins `extra`-JSON, und C#
rechnet daraus zusammen mit der Rohdaten-Punktfolge die maßgeblichen Kennzahlen.

Katalogeintrag (`apps/web/src/spiele/katalog.ts:144-149`, nur die Anweisung ist neu):

```ts
dribbeln: {
  titel: 'Dribbeln mit Pfiff',
  anweisung: 'Dribble los – beim Pfiff bleibt der Stift stehen, aber auf dem Rasen.',
  rolle: 'normal',
  tags: ['inhibition', 'wellen'],
},
```

Die bisherige Anweisung sagt nicht, dass zuerst gedribbelt wird. Ein Kind wartet dann mit
ruhendem Stift auf einen Pfiff, der nie kommt (2.3). Den Doppelpfiff zeigt der Probepfiff (2.4).

## 2. Spielidee und Ablauf

### 2.1 Fußballhandlung (C1)

Die Übung ist „Dribbeln auf Pfiff“, die jedes Vereinskind kennt. Der Profi des Vereins
(`verein.profi.name`, beim HSV „Jonas“) steht als Trainer mit Pfeife am oberen Rand. Ben
führt den Ball durch eine leicht geschwungene Hütchengasse zu einem Mitspieler mit echter
Rückennummer (`verein.kader`). Kommt der Ball an, ist das ein Pass: kurzer Jubel, neue Gasse,
nächster Mitspieler.

### 2.2 Die eine Regel, aus der alles folgt

> **Beim Pfiff friert alles ein, die Stiftspitze auch. Der Ball bleibt am Fuß, solange der
> Stift auf dem Rasen liegt.**

- **Stift läuft nach dem Pfiff weiter:** Der Ball bleibt, wo er beim Pfiff war. Der Stift
  entfernt sich sichtbar von ihm, mehr passiert nicht.
- **Stift steht still:** Der Ring wird fest, es klackt leise („gestoppt“).
- **Stift wandert beim Halten los (Fehlstart):** Der Ball kullert 24 px vor und bleibt
  liegen. Die Haltephase läuft weiter.
- **Stift hebt ab:** Der Ball rollt höchstens 80 px die Gasse entlang, bremst ab und wartet
  leuchtend. Ben holt ihn, indem er am Ball aufsetzt (Fangradius 45 px), und dribbelt
  ohne Doppelpfiff weiter.
- **Doppelpfiff:** Der Ring wird grün und zum Pfeil, es geht weiter.

Der Fortschritt ist **monoton** wie in „Linie malen“ (`spiele/linie/welt.ts:8-13`). Der Ball
rollt nie zurück, „weggerollt“ kostet nur Sekunden (C2). Abheben **beim Dribbeln** hat keine
Folge, der Ball wartet einfach. Das Wegrollen gehört zur Anweisung „beim Pfiff nicht
abheben“. Folgte es auf jedes Absetzen, würde die Feinmotorikstörung selbst bestraft.

### 2.3 Ablauf eines Pfiff-Durchgangs

```
dribbeln ─(Dribbelzeit ≥ Vorperiode, Stift unten, Tempo ≥ vMin, Ball < 90 % der Gasse)─▶ PFIFF
stopp    ─(150 ms innerhalb stillRadius)──────────▶ halten   [Ereignis „gestoppt“]
stopp    ─(Frist abgelaufen ohne Stillstand)──────▶ halten   (nicht sauber)
halten   ─(Haltedauer vorbei)──────────────────────▶ DOPPELPFIFF → dribbeln
stopp/halten ─(Abheben)─▶ weggerollt ─(Stift am Ball)─▶ dribbeln
stopp/halten ─(Pausenmenü)─▶ Durchgang ungültig, danach dribbeln
```

- **Vorperiode** zählt nur Zeit mit aufliegendem Stift und Tempo ≥ `vMin`. Ein Pfiff, wenn
  Ben ohnehin steht oder abgehoben hat, misst nichts.
- **Haltedauer** beginnt beim erkannten Stillstand, bei verpasster Frist am Fristende. So
  hält auch ein Kind, das spät stoppt, die volle Dauer, und der Doppelpfiff hängt nicht von
  der Reaktion ab.
- Kein Pfiff während des Jubels oder in den letzten 10 % der Gasse.

### 2.4 Pfiffzeitpunkte: Zufall mit fester Verteilung

**Ein vorhersagbarer Pfiff misst keine Hemmung**, weil Ben dann schon vorher abbremst.
Freier Zufall macht dagegen Sitzungen unvergleichbar. Lösung: **Blockpermutation.** Die
Vorperioden stammen aus einer festen Liste mit 8 Werten je Stufe. Jeder 8er-Block nutzt
jeden Wert genau einmal, gemischt. Für Ben ist der Pfiff unvorhersehbar, und doch hat jede
Sitzung dieselbe Verteilung. Die Liste enthält **mehr kurze als lange Werte**
(`[1.5, 2, 2, 2.5, 3, 3.5, 4.5, 6]` s). Bei gleichverteilten 2–6 s wüsste ein Kind nach 5 s,
dass der Pfiff gleich kommen muss. Die Haltedauer kommt ebenso aus einer gemischten Liste,
sonst messen Fehlstarts nur das Mitzählen.

Zufall: Mulberry32 aus `engine/tagesplan.ts:80-88` (7 Zeilen kopieren). Die `saat` wird
einmal per `Math.random()` gesetzt und im `extra` gespeichert, Tests geben sie fest vor.
Anders als beim Tagesplan soll ein Neustart **nicht** dieselben Pfiffe bringen.

**Probepfiff:** Vor dem ersten Pfiff jedes Spiels hebt der Trainer 1 s lang die Pfeife zum
Mund (`probe: true`, C# wertet ihn nicht). So führt das Spiel die Regel vor, solange das
Onboarding aus Phase 1 fehlt.

### 2.5 Endbedingung

**Zeit** (A3): `dauerSek`, Vorgabe 210 s (`engine/tagesplan.ts:34`), über `zeitAbgelaufen`
wie in „Linie malen“. Ein laufender Durchgang endet als `ende: 'zeit'` (nicht gewertet).
210 s ergeben etwa **28–32 Pfiffe**, das reicht für einen stabilen Median.

## 3. Grafik

Bühne **900 × 640** (`linie/welt.ts:25-26`). `berechneSicht` und `rundRect` werden aus
`linie/zeichnen.ts:31-51` kopiert. Draufsicht auf den Trainingsplatz:

```
┌──────────────────────────────────────────────────────────────────────────┐ 0
│                          ( Trainer )   Profi mit Pfeife; bei Pfiff        │
│                            /|\         Arm oben, Hand flach               │ ~110
│                                                                    ┌──┐   │
│  ▲        ▲          ▲           ▲          ▲          ▲           │14│   │ Mitspieler
│ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ └──┘   │ (kader)
│  ▼     ◯⚽◯        ▼           ▼          ▼          ▼                    │ ~360
└──────────────────────────────────────────────────────────────────────────┘ 640
  x 110 ── Gasse, flache Welle (Amplitude 35–70), ◯ = Stopp-Ring ── 760 | 820
```

- **Rasen** mit Streifen (`#3f9d1e`/`#4cb327`, `linie/zeichnen.ts:14-23`). **Gasse**: helle
  Bahn in Korridorbreite, Hütchen alle ~90 px in `verein.farben.primaer`/`sekundaer`.
- **Trainer** oben mittig (x 450, ca. 80 px hoch), Trikot `primaer`. Ruhig: Arme unten.
  Bei Pfiff: ein Arm oben, Hand flach.
- **Mitspieler** am Gassenende (x ~820), Rückennummer `kader[…].nummer` in `sekundaer`. Nur
  die Nummer, kein Name: Lesen ist hier nicht die Aufgabe.
- **Ball** (Radius 16) unter der Stiftspitze. Die Flecken drehen sich mit der Strecke.
- **Flache Wellen**, Muster `[boegen, amplitude]`: `[2,50] [3,40] [2,70] [3,55] [2,35]`.
  Der Aufwärm-Parcours nutzt Amplituden von 80 bis 155
  (`origin/aufwaermen-parcours:…/aufwaermen/welt.ts:46-52`). Ist das Lenken schwer, enthält
  die Reaktionszeit die Kosten der Doppelaufgabe. Lenken ist hier Nebenaufgabe.

**Das Stopp-Signal muss dort sein, wo Ben hinschaut**, nämlich auf die Stiftspitze. Ein
Signal nur am Trainer oben wäre peripher, und die Reaktionszeit würde messen, wann Ben
hochschaut. Darum zwei Ebenen:

| Signal | am Ball (maßgeblich) | am Trainer | Ton (abschaltbar, A4) |
|---|---|---|---|
| Pfiff | Ring r 34, Strich 6, `#ff5a3c`; 120 ms einblenden (Maßstab 1,3 → 1,0), **kein Blinken** | Arm oben | Trillerpfiff 1,5 kHz, 0,35 s, leise (Vorbild `ballhochhalten/klang.ts:112-116`) |
| gestoppt | Ring gefüllt (25 % Deckkraft) | – | „Tock“ 520 Hz, 60 ms |
| Doppelpfiff | Ring → grüner **Pfeil** nach vorn (`#2fd06a`), 300 ms ausblenden | Arm runter | 2 × 0,12 s |

- **Ring und Ton kommen immer zusammen** und sind keine zwei Betriebsarten. Sonst wäre der
  Reiz je nach Tonschalter ein anderer, und Sitzungen ließen sich nicht vergleichen. Auf den
  Ton reagiert man trotzdem 30–50 ms schneller, deshalb wird je Pfiff `tonAn` gespeichert.
- **Farbfehlsichtigkeit** (ca. 8 % der Jungen): Stopp und Weiter unterscheiden sich in der
  **Form** (Ring gegen Pfeil).
- **Reizarm (A2):** kein Blitz, kein Wackeln, kein Text, kein Zähler. **Die Haltedauer wird
  nicht angezeigt.** Ein sich füllender Ring würde den Doppelpfiff ankündigen, und dann gäbe
  es keine Fehlstarts mehr zu messen.

**Sofortfeedback (A1):**
- Der Ball folgt der Spitze im nächsten Frame (< 16 ms). Die Spur der letzten 1,2 s ist
  blass in `sekundaer`. Beim Passieren eines Hütchens kommt ein Piep wie im Aufwärm-Parcours.
- „Gestoppt“ (gefüllter Ring + Tock) kommt im Frame nach der Erkennung. Die Erkennung
  braucht ein Fenster von 150 ms, denn Stillstand ist erst nach einer Weile Stillstand. Ab
  Fensterende bleibt die Rückmeldung unter 100 ms.
- Ein sauberer Stopp löst beim Doppelpfiff 6–8 Sternpartikel in Vereinsfarben aus (0,5 s).
- Beim angekommenen Pass hebt der Mitspieler die Arme, und 1,5 s lang steht ein Spruch aus
  `verein.sprueche` mit Übersetzung im Bild. Dazu kommt der Dreiklang.

**`zeichnen.ts`** liest nur aus der Welt (`linie/zeichnen.ts:1-3`). Reihenfolge: Rasen →
Gasse → Hütchen → Mitspieler → Spur → Ball (inkl. Kullern/Wegrollen) → Ring/Pfeil →
Trainer → Sterne → Spruchband → Mauszeiger.

## 4. Datenerfassung

### 4.1 Kernfelder (Browser, **unmaßgeblich**, `engine/segmente.ts:35-38`)

| Feld | Bedeutung hier |
|---|---|
| `vollstaendigkeit` | Anteil der gewerteten Pfiffe, auf die Ben innerhalb der Frist angehalten hat |
| `genauigkeit` | Anteil **sauberer** Stopps (rechtzeitig, kein Abheben, kein Fehlstart) |
| `druckMittel/-Streuung` | alle Stiftpunkte, wie in allen Spielen (`eingabe.ts:59-64`) |
| `eingabegeraet`, `synthetischerDruck` | aus `geraetVon`/`druckVon` (`eingabe.ts:44-50`) |
| `stufe` | eingestellte Stufe; die Messschwellen in C# hängen **nicht** davon ab (4.3) |
| `abgebrochen` | wie überall |

### 4.2 Schema des `extra`-JSON

```jsonc
{
  "version": 1,
  "saat": 912334,
  "cssPxProBuehnenPx": 1.21,        // sicht.s / devicePixelRatio; Rohdaten sind CSS-px
  "parameter": { "stillRadius": 6, "stillFensterMs": 150, "fristMs": 1000,
                 "fehlstartRadius": 14, "vMin": 80, "korridor": 44 },
  "pfiffe": [
    { "nr": 1, "probe": true,  "stoppMs": 4210.5, "doppelMs": 6890.0,
      "endeMs": 6890.0,  "ende": "doppelpfiff", "tonAn": true },
    { "nr": 2, "probe": false, "stoppMs": 9875.2, "doppelMs": null,
      "endeMs": 10630.8, "ende": "abgehoben",   "tonAn": true }
  ],                                // ende: doppelpfiff | abgehoben | pause | zeit
  "pausen":   [ { "vonMs": 81200.0, "bisMs": 93400.0 } ],
  "hinweise": [ 120400.0 ],         // Profi-Hilfe (5.2)
  "paesse": 4,
  "saubereStopps": 11               // {wert} fürs Bestleistungslob
}
```

**Die Zeitbasis ist der heikelste Punkt.** Rohdaten-`t` ist `PointerEvent.timeStamp − beginn`,
wobei `beginn` beim ersten Render des `SpielScreen` mit `performance.now()` gesetzt wird
(`screens/SpielScreen.tsx:45, 62`). Die Pfiffe müssen **auf derselben Uhr** liegen:

1. **Nicht `w.zeitGesamt` nehmen.** Es steht im Pausenmenü still (`spiele/index.ts:25-30`),
   die Rohdatenzeit nicht. *Geplant* wird auf Spielzeit, damit die Vorperiode im Menü nicht
   abläuft. *Protokolliert* wird mit rAF-Zeitstempel minus Segmentstart, also auf derselben
   Uhr wie `PointerEvent.timeStamp`.
2. **Woher kennt das Spiel `beginn`?** Vorschlag: neues Feld `SpielProps.segmentStartMs`,
   gefüllt mit `beginn.current` (3 Zeilen, gemeinsame Schnittstelle, also absprechen).
   Notlösung: eigenes `useRef(performance.now())`, das im selben Renderdurchgang weniger als
   1 ms abweicht. Das ist schwerer zu verteidigen.

`welt.ts` bleibt ohne Uhr: `aktualisiere(w, dt, tMs)` und `ziehe(w, x, y, d, tMs)` bekommen
die Zeit übergeben. Restversatz (Anzeige einen Frame später, ≤ 8 ms; WebAudio-Latenz
10–30 ms) ist konstant und verschiebt nur das Niveau.

### 4.3 Kennzahlen in C# (`apps/api/Auswertung/Inhibition.cs`, neu)

`Kennzahlen.Berechne` (`Kennzahlen.cs:60-117`) läuft unverändert mit. Dazu kommt eine zweite
reine Rechenklasse ohne EF und HTTP:

```csharp
public record Pfiff(bool Probe, double StoppMs, double? DoppelMs, double EndeMs, string Ende, bool TonAn);
public record InhibitionKennzahl(int Pfiffe, int Gewertet,
    double? ReaktionMedianMs, double? ReaktionStreuungMs, double? NachlaufMedian,
    double? HalteausschlagMedian, int Abheber, int Fehlstarts,
    double? StoppQuote, double? HaltedruckVerhaeltnis);
public static InhibitionKennzahl? Berechne(IReadOnlyList<Abtastung> p, IReadOnlyList<Pfiff> pfiffe,
    IReadOnlyList<(double Von, double Bis)> pausen, double k, bool echterStift);
```

**Messschwellen sind fest, unabhängig von der Stufe.** Die Stufe bestimmt, was das *Spiel*
als gestoppt akzeptiert. Die *Messung* bleibt gleich, sonst verschöbe ein Stufenwechsel die
Reaktionszeit, ohne dass Ben sich verändert hat. Das ist der Gedanke hinter „Stufe
mitspeichern“, eine Ebene tiefer. Konstanten in Bühnen-px, mit `k = cssPxProBuehnenPx`
umgerechnet: Ruheradius `M = 4`, Ruhefenster `F = 200 ms`, Fehlstartradius `R = 12`,
Frist 1000 ms, Untergrenze 100 ms.

`pos(t)` ist die Position der letzten Abtastung bei oder vor `t`, man tastet also ab und hält
den Wert. Steht der Stift wirklich still, schickt der Browser kaum Ereignisse. Eine Lücke
heißt dann „keine Bewegung“, nicht „keine Daten“. **Gewertet** wird ein Pfiff mit `!Probe`,
`Ende ∈ {doppelpfiff, abgehoben}` und ohne Pause in `[S, E]` (`S = StoppMs`, `E = EndeMs`).
`dist` ist der Abstand nach Pythagoras wie in `Kennzahlen.cs:79-81`.

| Kennzahl | Formel | Thomas liest daraus |
|---|---|---|
| **Reaktionszeit** RT | frühestes `c ∈ {S} ∪ {t_j : S < t_j < E}` mit `c+F ≤ E` und für alle `c < t_j ≤ c+F`: `dist(P_j, pos(c)) ≤ M·k` und `druck_j > 0`; `RT = c − S`. Kein `c` → „nicht angehalten“; `RT < 100` → „stand schon“, nicht im Median | Median: wie schnell die Hemmung greift |
| **RT-Streuung** | Standardabweichung (`Kennzahlen.cs:122-127`) | schwankende Aufmerksamkeit; bei ADHS oft aussagekräftiger als der Mittelwert, **kein Diagnosewert** |
| **Nachlauf** | `Σ dist(P_j, P_{j−1}) / k` für `S ≤ t_j ≤ S+RT`, `druck > 0` | wie weit die Bewegung „durchrutscht“ |
| **Halteausschlag** | `max dist(P_j, pos(S+RT)) / k` für `S+RT ≤ t_j ≤ E`, bis zum ersten `druck = 0`; `null` ohne echten Stift | Haltestabilität der Spitze |
| **Abheben** | gibt es ein `j` mit `S ≤ t_j ≤ E` und `druck_j = 0`? | löst Ben „anhalten“ durch Wegnehmen? |
| **Fehlstart** | gibt es ein `j` mit `S+RT < t_j < (DoppelMs ?? E)` und `dist(P_j, pos(S+RT)) > R·k`? | Kernfehler: Wiederanlauf vor dem Signal |
| **Stoppquote** | `Anzahl(RT ≤ 1000, ohne Abheben, ohne Fehlstart) / Gewertet` | Prozent, also nur im Therapeutenbereich (C4) |
| **Haltedruck-Verhältnis** | `mittel(druck in [S+RT, E]) / mittel(druck in [S−2000, S])`, nur bei Pen ohne synthetischen Druck | deutlich > 1: beim Halten wird fester gedrückt, Verkrampfungshinweis (B3) |

Bei weniger als 5 gewerteten Pfiffen kommt `null` zurück, aus dem Grund in
`Kennzahlen.cs:57-59`. Umfang ~140 Zeilen, dazu ein Record `DribbelExtra` für
`System.Text.Json`.

**Anzeige.** „Nur der Kern geht in den Verlaufsgraphen“ (CLAUDE.md), deshalb stehen diese
Werte **neben** dem Graphen. Im Verlauf bekommt jeder dribbeln-Punkt eine Zusatzzeile („RT
480 ms (±120) · 2 Fehlstarts · 1× abgehoben“). Im Wochenbericht bekommt die Bereichszeile
`inhibition` eine Unterzeile mit Median-RT, Stoppquote, Fehlstarts und Abhebern. Dafür muss
`Extra` in die Abfragen in `Endpunkte/Bericht.cs:72-85` und `:107-120` aufgenommen werden,
`VerlaufPunkt` und `KategorieZeile` bekommen ein nullbares `InhibitionKennzahl?`, und
`apps/therapeut/src/api.ts` plus zwei Bildschirme werden angepasst. Damit liest der Server
`Extra` **zum ersten Mal** aus, bisher speichert er es nur (`Daten/Entitaeten.cs:216-217`).

### 4.4 Fallstricke

- **Bei `pointercancel` fehlt das Abheben.** `SpielScreen.tsx:122-127` schreibt beim
  `pointerup` einen Punkt mit Druck 0, `:128-130` beim `pointercancel` nicht. Auf dem iPad
  löst die Handballen-Erkennung genau das aus. Fix: dort ebenfalls `nimmAuf(e, 0)`. Das ist
  eine Zeile, hilft der Absetzhäufigkeit aller Spiele und muss abgesprochen werden.
- **Das Pausenmenü erzeugt ein falsches Abheben.** Für den Anhalte-Knopf hebt Ben den Stift,
  und das landet als Druck 0 in den Rohdaten. Deshalb gibt es `pausen` im `extra`, und
  solche Pfiffe werden nicht gewertet.
- **Maus:** Stillhalten ist trivial, denn sie zittert nicht und sendet keine Ereignisse. Die
  RT ist messbar, der Halteausschlag nicht (`null`). Neben dem vorhandenen
  Stufenwechsel-Hinweis (`Bericht.cs:216-218`) braucht es einen gleichartigen Hinweis bei
  gemischten Eingabegeräten.
- **Synthetischer Druck:** Das Haltedruck-Verhältnis ist dann `null`. Sonst stünde dort das
  Verhältnis zweier Tastendrücke.
- **Die allgemeinen Kennzahlen werden verfälscht.** `Zittern` (`Kennzahlen.cs:89-101`) misst
  Richtungswechsel. In Haltephasen springen Subpixel-Bewegungen in alle Richtungen, dribbeln
  wirkt zittriger und zieht die Bereichszeile `wellen` hoch. `TempoMittel` sinkt durch die
  Stillstände. Vorschlag: `strecke > 0` → `strecke >= 1` im Zittern-Teil. Das betrifft alle
  Spiele und braucht einen eigenen xUnit-Test.
- **Rohdaten sind CSS-px** (`SpielScreen.tsx:17-19`). Deshalb gibt es `cssPxProBuehnenPx`.
  Browser und C# weichen ab (Stufenradius und 150 ms gegen feste 4 px und 200 ms). Das ist
  gewollt.

## 5. Spielspaß

### 5.1 Warum Ben dranbleibt

- **Bekanntes Prinzip** (Stopptanz, „Ochs am Berg“): Einfrieren auf Signal ist ein Spiel.
- **Rhythmus mit Überraschung:** Ein Zyklus dauert 5–7 s, das ist kurz genug für ADHS, und
  der Pfiffzeitpunkt bleibt spannend. Sterne gibt es nach sauberem Stopp, alle 30–40 s einen
  Pass mit Vereinsspruch.
- **Steigerung nur über die Szenerie:** neuer Mitspieler je Gasse, wechselnde Wellenform (B3).
  Vorperiode, Frist und Radien bleiben im Spiel fest wie die Toleranz in
  `linie/welt.ts:57-64`, sonst wäre der Verlauf nicht lesbar.
- **Vereinsbezug:** Der Profi pfeift, die Mitspieler tragen echte Nummern, Hütchen in
  Vereinsfarben, beim Pass ein Vereinsspruch. Im nächsten Verein pfeift ein anderer Trainer.
- **Lob (C5):** `saubereStopps` passt als `{wert}` ins Bestleistungslob („{name}, 14-mal
  sauber gestoppt – so oft wie noch nie!“). Es ist eine Anzahl und kein Prozentwert (C4).
  `profi.bestleistung` ist im Code derzeit nirgends verdrahtet.

### 5.2 Verstößt die Idee gegen C2?

**In der Rohfassung ja.** „Beim Abheben rollt der Ball weg“ ist eine Strafe, und sie trifft
genau die Fähigkeit, die Ben fehlt. Rollt der Ball dreimal hintereinander weg, erlebt Ben
Versagen in Dauerschleife. Das Wort „Fehlstart“ darf im Kindmodus nirgends auftauchen.
Lösung:

1. **Wegrollen ist kurz, langsam und endet.** Höchstens 80 px, nur die Gasse entlang, nie aus
   dem Bild, nie zurück, mit 0,6 s Abbremsen. Danach leuchtet der Ball. Kein Fehlerton, nur
   ein leises Kullern.
2. **Nichts geht verloren.** Der Fortschritt bleibt, kein Stern wird abgezogen, es gibt
   keinen Zähler. Es kostet nur Sekunden.
3. **Ein Fehlstart heißt nur Kullern (24 px).** Die Haltephase läuft weiter und endet normal
   mit dem Doppelpfiff, nur ohne Sterne.
4. **Hilfe statt Abbruch.** Nach 3 nicht sauberen Stopps in Folge zeigt der Profi einmal eine
   Hilfe und liest sie vor: „Lass den Stift kleben wie Kaugummi.“ Frühestens nach 60 s
   wieder. Sie ändert **keine** Messparameter, also keine Vorwarnung. Die Zeitpunkte stehen
   in `extra.hinweise`.
5. **Kein Kommentar zur Leistung**, weder vom Profi noch vom Trainer. Stufe 1 ist so
   großzügig, dass über 70 % saubere Stopps erreichbar sein sollten. Auf dem Gerät
   nachmessen.

## 6. Schwierigkeit und Einstellungen (B1)

Stufe 1–5 (`apps/therapeut/src/screens/Einstellungen.tsx:141`), Vorgabe 3
(`engine/tagesplan.ts:33`). Die Werte sind Startannahmen und müssen mit echtem Pencil und
mit Ben nachgezogen werden.

| Parameter | Stufe 1 | Stufe 2 | Stufe 3 | Stufe 4 | Stufe 5 |
|---|---|---|---|---|---|
| Stillradius (Bühnen-px, Spiel) | 10 | 8 | 6 | 5 | 4 |
| Frist bis Stillstand (ms) | 1500 | 1200 | 1000 | 850 | 700 |
| Fehlstartradius (Bühnen-px) | 20 | 17 | 14 | 12 | 10 |
| Haltedauer-Liste (s) | 1,0–2,0 | 1,2–2,5 | 1,5–3,0 | 1,5–3,5 | 2,0–4,0 |
| Vorperioden-Liste (s) | 2,5–6,5 | 2–6 | 1,5–6 | 1,2–5,5 | 1–5 |
| Korridor, halbe Breite (px) | 52 | 48 | 44 | 40 | 36 |
| Mindesttempo `vMin` (px/s) | 60 | 70 | 80 | 90 | 100 |

**Toleranz, Zielgeschwindigkeit, Mindesttrefferquote:** Sie werden gespeichert
(`Daten/Entitaeten.cs:127-131`), erreichen aber **kein Spiel**. Das Segment trägt nur `stufe`
(`engine/tagesplan.ts:196`), und `SpielProps` hat kein Feld dafür (`spiele/index.ts:18-33`).
Das ist eine B1-Lücke aller Spiele. Wird sie geschlossen, bekommt dieses Spiel folgende
Zuordnung: Toleranz als Faktor auf Stillradius und Korridor, Zielgeschwindigkeit als Faktor
auf `vMin`, und Mindesttrefferquote als Schwelle sauberer Stopps, ab der Thomas den Hinweis
„Stufe erhöhen?“ bekommt. Eine Selbstjustierung gibt es nicht.

## 7. Content-Bedarf

**Kein neues Pflichtfeld in `content/typen.ts`.** Genutzt werden `profi.name`, `farben`,
`kader[].nummer` und `sprueche`. Der Hilfesatz ist für alle Vereine gleich und steht als
Konstante in `welt.ts`. Erst wenn ein zweites Spiel Profi-Tipps braucht, käme optional
`Profi.tipps?: Dialog[]` dazu (additiv).

Beispiel HSV (`content/vereine/hsv.ts`), nur vorhandene Daten: Trainer „Jonas“ in `#0a3a82`.
Die Gassen enden bei Nr. 14, dann 10, dann 7 …, also `kader` rückwärts, damit nicht Torwart
Nr. 1 den ersten Pass bekommt. Pass-Jubel: „Dat löppt!“, darunter klein „Das läuft!“.

## 8. Umsetzung

### 8.1 Dateien und Umfang

| Datei | Inhalt | Zeilen |
|---|---|---|
| `apps/web/src/spiele/dribbeln/welt.ts` | Phasen, Pfiffplanung, Stillstandserkennung, Ergebnis | ~320 |
| `…/dribbeln/zeichnen.ts` | Bild aus Abschnitt 3, davon ~60 für zwei Figuren | ~260 |
| `…/dribbeln/index.tsx` | Canvas, Eingabe, Bildschleife (Vorbild `linie/index.tsx`) | ~160 |
| `…/dribbeln/klang.ts` | Pfiff, Doppelpfiff, Tock, Kullern, Piep, Dreiklang | ~80 |
| `…/dribbeln/welt.test.ts` | vitest (8.3) | ~250 |
| `spiele/index.ts:46-51` | `dribbeln: DribbelnMitPfiff` in `KOMPONENTEN` | +2 |
| `spiele/katalog.ts:146` | neue Anweisung | 1 |
| `spiele/index.ts` + `screens/SpielScreen.tsx` | `segmentStartMs`; `pointercancel` → Druck 0 (abstimmen) | +5 |
| `apps/api/Auswertung/Inhibition.cs` | Kennzahlen aus 4.3 | ~140 |
| `apps/api.tests/InhibitionTests.cs` | xUnit mit erzeugten Punktfolgen | ~160 |
| `apps/api/Endpunkte/Bericht.cs` | `Extra` laden, `Inhibition.Berechne` | +35 |
| `apps/therapeut/src/api.ts`, `Verlauf.tsx`, `Bericht.tsx` | Zusatzzeile | +50 |

`Spielkatalog.cs:42` enthält `dribbeln` mit `["inhibition", "wellen"]` bereits. **Es braucht
keine EF-Migration**, denn die Spalte `Extra` gibt es schon.

### 8.2 Wiederverwendung und Abgrenzung zum Aufwärm-Parcours

| | Aufwärm-Parcours | Dribbeln mit Pfiff |
|---|---|---|
| Rolle | `aufwaermen` | `normal` |
| Aufgabe | Slalom lenken | auf Signal anhalten, Lenken ist Nebensache |
| Wellen | ausgeprägt (80–155) | flach (35–70) |
| Ende | 5 Durchgänge | Zeit |
| Messung | Korridortreue, Tempo | RT, Nachlauf, Halten, Fehlstarts |

Hintereinander kommen die beiden nicht: sie teilen `wellen`, also gewinnt nach dem Aufwärmen
jedes Spiel ohne `wellen` (`engine/tagesplan.ts:126-136`).

**Wiederverwendbar** sind `bahnPunkte` (`:60-71`), `aufBahn` (`:166-178`) und `punktAuf`
(`:181-189`) aus `origin/aufwaermen-parcours:apps/web/src/spiele/aufwaermen/welt.ts`, rund
40 Zeilen. **Jetzt kopieren**, mit einem Kommentar wie in `aufwaermen/klang.ts:9-12`. Der
Branch ist nicht gemergt, und ein Import aus einem fremden Spielordner koppelt zwei Personen.
Nach dem Merge gibt es drei Bahnnutzer (`linie` als gerader Sonderfall), dann lohnt
`spiele/bahn.ts` als eigener Commit. Auch `ton()` wird kopiert. Laut demselben Kommentar ist
das dritte Spiel mit eigenem Klang der vereinbarte Anlass für ein gemeinsames `spiele/klang.ts`.

**Absichtlich anders als „Linie malen“:** Dort springt der Ball vor, wenn der Stift irgendwo
weiter vorn im Korridor aufsetzt (`linie/welt.ts:169`). Hier bewegt er sich nur innerhalb des
Fangradius. Sonst ließe sich der weggerollte Ball „überholen“.

### 8.3 Testfälle für `welt.test.ts`

Hilfen wie in `linie/welt.test.ts:8-20` (`laufe`, `zieheAuf`), mit Zeitparameter.

1. **Stufe:** Stillradius und Frist werden strenger, im Spiel bleiben sie fest.
2. **Planung:** Gleiche Saat ergibt gleiche Vorperioden, jeder 8er-Block nutzt jeden Wert
   genau einmal. Kein Pfiff ohne Bewegung, im Jubel oder in den letzten 10 % der Gasse.
3. **Stopp:** Stillstand nach 400 ms ergibt `halten` und `gestoppt`. Ohne Stillstand geht es
   nach `fristMs` nicht sauber in `halten`. Der Ball bleibt beim Pfiff liegen.
4. **Fehlstart:** Der Ball kullert 24 px, gezählt wird einmal je Pfiff, das Halten läuft weiter.
5. **Abheben:** In `stopp`/`halten` folgt `weggerollt` mit höchstens 80 px. Aufsetzen geht
   nur im Fangradius, danach `ende: 'abgehoben'`. Beim Dribbeln rollt nichts weg. Der
   Fortschritt bleibt monoton.
6. **Pause/Zeitbasis:** Eine Pause in `halten` ergibt `ende: 'pause'` plus Eintrag in
   `pausen`. `stoppMs` ist der übergebene `tMs`, **nicht** `zeitGesamt` (Test mit 10-s-Pause).
7. **Probe/Hilfe:** Nur der erste Pfiff hat `probe: true`. Nach 3 unsauberen Stopps kommt
   genau ein `hinweise`-Eintrag, der nächste frühestens nach 60 s.
8. **Ergebnis:** `genauigkeit` = saubere/gewertete, `extra` folgt dem Schema 4.2.

xUnit-Fälle: Ein Stopp nach 400 ms ergibt RT ≈ 400. Eine Lücke ohne Ereignisse gilt als
Stillstand. Druck 0 zählt als Abheben. 15 px Drift vor dem Doppelpfiff sind ein Fehlstart.
Eine Pause im Intervall heißt nicht gewertet. Unter 5 gewerteten Pfiffen kommt `null`. Bei
Maus ist der Halteausschlag `null`. Kaputtes `Extra` ergibt `null` statt einer Ausnahme.

## 9. Risiken und offene Fragen

**Technisch**
- **Sendet Safari auf dem iPad bei ruhendem Pencil weiter `pointermove`?** Unklar. Die
  Auswertung kommt mit beidem zurecht, ohne Ereignisse ist der Halteausschlag aber zu
  klein. Auf dem Gerät prüfen.
- **Pencil-Hover** erzeugt Ereignisse ohne Kontakt. Der `SpielScreen` zeichnet nur bei
  `unten` auf (`SpielScreen.tsx:121`), die Welt rechnet ebenso nur bei `zieht`.
- **Ton-Latenz** ist geräteabhängig, aber konstant. `tonAn` steht je Pfiff in den Daten.

**Therapeutisch**
- **Kein Diagnoseinstrument.** RT und RT-Streuung verleiten dazu, sie wie einen Test zu
  lesen. Gezeigt wird deshalb nur Bens eigener Verlauf, ohne Normwerte und ohne Ampel.
- **Tagesform und Medikation** verschieben die Werte stark. Gespeichert wird dazu nichts
  (D4), Thomas ordnet es ein. **Gewöhnung** an die Vorperioden wird durch die
  Blockpermutation begrenzt, aber nicht verhindert.
- **Das Frustrationsrisiko ist das höchste aller Spiele** (5.2). Liegt die Stoppquote in der
  ersten Woche unter 50 %, sollte die Stufe sinken.

**Konflikte mit CLAUDE.md**
1. `SpielProps.segmentStartMs` ändert die gemeinsame Schnittstelle, das muss abgesprochen werden.
2. Der Server liest `Extra` zum ersten Mal aus. Mit „nur der Kern im Graphen“ ist das
   vereinbar, solange die Werte *neben* dem Graphen stehen. Im Bericht begründen.
3. Haltephasen verfälschen `Zittern`/`TempoMittel` der Zeile `wellen` (4.4). Die Formel
   sollte angepasst werden, statt `wellen` zu streichen, denn der Tagesplan braucht die Tags.
4. Die B1-Lücke (Toleranz und Co. erreichen kein Spiel) steht bisher nirgends.
5. `docs/entscheidungen.md` nennt noch `Auswertung/Kategorien.cs` (heute `Spielkatalog.cs`).

**Offen:** Ein Täuschsignal auf Stufe 5 (Tröte, bei der Ben **nicht** stoppt, also echtes
Go/No-Go) ist bewusst nicht im ersten Umfang. Die Stufenwerte aus Abschnitt 6 müssen mit
Thomas abgestimmt werden.

## 10. Anforderungs-Check

| ID | Status | Begründung |
|---|---|---|
| A1 | erfüllt | Ball folgt im nächsten Frame; „gestoppt“ im Frame nach der Erkennung; Sterne beim Doppelpfiff |
| A2 | erfüllt | keine Zahl, kein Zähler, keine Haltedauer-Anzeige, kein Blinken |
| A3 | erfüllt | zeitbasiert über `dauerSek`, Timer im `SpielScreen`; Pausenmenü hält Planung und Halten an |
| A4 | **betroffen** | Der Pfiff ist funktional und über `tonLautstaerke` (`bedienung.ts:48`) abschaltbar. Gleichwertig ist er nur, weil der Ring am Ball **immer** erscheint. `tonAn` je Pfiff |
| A5 | erfüllt (neuer Satz) | ein Satz, vorgelesen; Doppelpfiff über den Probepfiff gezeigt |
| B1 | Risiko | Stufe 1–5 wirkt; Toleranz/Zielgeschwindigkeit/Trefferquote erreichen kein Spiel (projektweit) |
| B2 | erfüllt | fünftes Spiel, einziges mit `inhibition` |
| B3 | erfüllt | Wechsel Bewegung/Ruhe, wechselnde Wellen, Haltedruck als Verkrampfungshinweis |
| B4 | erfüllt, erweitert | Rohdaten wie überall; Pfiffe und Pausen im `extra` auf Rohdaten-Zeitbasis; `pointercancel`-Fix empfohlen |
| C1 | erfüllt | „Dribbeln auf Pfiff“ ist echte Trainingsübung, Pass zum Mitspieler |
| C2 | **Risiko, gelöst** | kurzes Wegrollen nach vorn ohne Verlust, Fehlstart nur Kullern, Hilfe nach 3 Fehlversuchen |
| C3 | unberührt | macht die Engine nach dem Spiel |
| C4 | erfüllt | Stoppquote nur für Thomas; Ben sieht Sterne und eine Anzahl |
| C5 | erfüllt | Profi pfeift, hilft, lobt mit `saubereStopps` (Verdrahtung von `bestleistung` fehlt projektweit) |
| C6 | unberührt | Spiel kennt nur den aktuellen Verein |
| D2 | erfüllt | Pfiffe, Pausen, Hilfen unsichtbar im `extra` |
| D4 | erfüllt | keine neuen personenbezogenen Daten, nur Zeiten und Parameter |
