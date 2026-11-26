# Spielkonzepte — fehlende Minispiele

Stand 13.11.2026. Je Spiel eine Analyse zu Spielidee, Grafik, Datenerfassung, Spielspaß,
Stufen (B1), Content, Umsetzung, Risiken und Anforderungs-Check. Das sind Entwürfe, noch nichts
davon ist gebaut.

## Bestand

| Spiel | ID | Stand |
|---|---|---|
| Ball hochhalten | `ballhochhalten` | in `main` |
| Platzwart | `rasenmaehen` | in `main` |
| Linie malen | `linie` | in `main` |
| Autogrammstunde | `autogramme` | in `main` |
| Aufwärm-Parcours | `aufwaermen` | gebaut, **nur auf `origin/aufwaermen-parcours`**, nicht gemergt |
| Brezelverkauf | `brezelverkauf` | gebaut, **nur auf `origin/aufwaermen-parcours`**, nicht gemergt |

Nach dem Merge des Branches sind es sechs gebaute Spiele, B2 ist damit der Zahl nach erfüllt.
Inhaltlich fehlt dann noch ein Spiel, das den **Pinzettengriff** wirklich trainiert: die
Autogrammstunde trägt das Tag, trainiert ihn aber kaum (siehe `security-und-ufo.md`).

## Fehlende Spiele

| Spiel | ID | Rolle | Bereiche | Konzept | Kernidee |
|---|---|---|---|---|---|
| Stadionführung | `stationentour` | normal | schreiben, druckdosierung | [stationentour.md](stationentour.md) | Schlüsselwort eines Stadionfakts auf der Anzeigetafel nachspuren; die Besuchergruppe reagiert aufs Tempo |
| Startelf | `startelf` | normal | schreiben | [startelf.md](startelf.md) | Aufstellung an die Kabinentafel nachschreiben, Nummer → Kurzname → Name über die Stufen; Stadionsprecher ruft jeden Spieler auf |
| Elfmeter | `elfmeter` | normal | hand-auge, druckdosierung | [elfmeter.md](elfmeter.md) | Strich bestimmt die Flugbahn; Tempofenster und Druckkonstanz entscheiden, Torwart ist Trainingspartner |
| Dribbeln mit Pfiff | `dribbeln` | normal | inhibition, wellen | [dribbeln.md](dribbeln.md) | Welle dribbeln, beim Pfiff (Ton **und** roter Ring am Ball) stehen bleiben ohne abzuheben |
| Abschiedsgeschenk: Urkunde | `abschiedsgeschenk` | sonder | schreiben | [abschiedsgeschenk.md](abschiedsgeschenk.md) | Urkunde „Probetraining bestanden"; Ben unterschreibt auf dem Tablet mit seinem Spielnamen, nach der Smiley-Frage unterschreibt der Profi und stempelt. Thomas druckt sie aus den Rohdaten, ohne Kamera und ohne Bild-Upload |
| Einlasskontrolle (Idee „Security") | `einlass` (neu) | normal | pinzettengriff, druckdosierung | [security-und-ufo.md](security-und-ufo.md) | Markierte Dinge aus der Fantasche greifen und mit dosiertem Druck in die Kiste tragen |
| Platz aufräumen (Idee „UFO/Müll") | `muell` (neu) | normal | wellen, hand-auge | [security-und-ufo.md](security-und-ufo.md) | Müll umkreisen, die Seilkamera holt ihn — das UFO ist ersetzt, es verletzt C1 |

Alle Konzepte schlagen eine **neue Katalog-Anweisung** vor; die heutigen versprechen zum Teil
etwas, das sich nicht bewerten lässt (freies Abschreiben) oder nicht gebaut wird (Foto).

**Entschieden am 13.11.2026:** Das Abschiedsgeschenk ist eine Urkunde, die Ben auf dem Tablet
unterschreibt und Thomas ausdruckt. CLAUDE.md beschreibt es noch als Foto einer Papieraufgabe
und muss angepasst werden (siehe `abschiedsgeschenk.md`, Abschnitt 9).

## Querschnittsfunde (im Code nachgeprüft)

Diese Punkte betreffen nicht ein einzelnes Spiel, sondern das ganze Projekt:

1. **B1 kommt in keinem Spiel an.** Toleranz, Zielgeschwindigkeit und Mindesttrefferquote
   werden vom Server geladen (`apps/web/src/engine/tagesplan.ts:14`), aber `SpielProps`
   (`apps/web/src/spiele/index.ts`) reicht nur `stufe` durch. Was Thomas dort einstellt, wirkt
   nicht. Von vier der sechs Analysen unabhängig gefunden.
2. **Platzhalter schreiben Kennzahlen.** Der `SpielScreen` hängt immer Rohdaten an
   (`apps/web/src/screens/SpielScreen.tsx:80`); ein Tipp auf „Fertig" liefert Abtastungen, aus
   denen `apps/api/Endpunkte/Bericht.cs:129` Kennzahlen rechnet.
3. **`pointercancel` schreibt keinen Absetzpunkt** in die Rohdaten. Die Spiele behandeln es
   selbst, die Aufzeichnung nicht. Dazu kommt: es gibt keine Handballen-Erkennung — jeder Zeiger
   wird aufgezeichnet.
4. **`extra` wird vom Server nirgends gelesen.** Dribbeln (Pfiffzeiten) und Startelf (Maßstab,
   Strichzuordnung) brauchen das erstmals.
5. **Kader zu kurz:** HSV hat 6, Ajax 4 Einträge. Startelf braucht 11.
6. **Zwei Konzepte bauen dieselbe Schrift.** Stadionführung und Startelf entwerfen je eine
   Einstrich-Schrift zum Nachspuren. Das gehört in **ein** gemeinsames Modul (z. B.
   `apps/web/src/spiele/schrift.ts`), sonst wird die aufwendigste Arbeit doppelt gemacht.
7. **Neue Spiele brauchen mehr als zwei Einträge.** CLAUDE.md nennt `katalog.ts` und
   `Spielkatalog.cs`; dazu kommen `spiele/index.ts`, die Einstellungszeile in der DB (sonst ist
   ein Spiel aktiv, aber für Thomas unsichtbar) und die Therapeuten-Einstellungen.
8. `docs/entscheidungen.md` nennt noch `Kategorien.cs`; die Datei heißt `Spielkatalog.cs`.

## Empfohlene Reihenfolge

1. **`origin/aufwaermen-parcours` mergen.** Sonst baut jemand gegen einen veralteten Stand;
   die Stadionführung ändert z. B. `fakten` zu `{text, wort}`, was `koeln.ts` auf dem Branch bricht.
2. **Querschnittsfunde 1–3 beheben** — klein, aber ohne sie sind B1 und B4 nicht ehrlich erfüllt.
3. **Einlasskontrolle** — schließt die Pinzettengriff-Lücke aus B2.
4. **Dribbeln mit Pfiff** — einziges Inhibitionsspiel, für ADHS therapeutisch am wichtigsten.
5. **Elfmeter** — eigenständig, Startwerte müssen am echten Pencil nachgezogen werden.
6. **Gemeinsame Schrift**, dann **Startelf** und **Stadionführung** (zwei Personen parallel).
7. **Urkunde** (etwa 450 Zeilen Kind-App, 110 Server, 150 Therapeuten-App; keine Migration).
   Setzt den `pointercancel`-Fix aus Punkt 2 voraus, sonst verbinden sich auf dem Ausdruck
   zwei Striche zu einem.
8. **Platz aufräumen** zuletzt — fachlich am schwächsten begründet.
