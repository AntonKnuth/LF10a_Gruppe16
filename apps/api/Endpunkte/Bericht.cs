using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auswertung;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record VerlaufPunkt(
    Guid ErgebnisId,
    Guid SessionId,
    DateTime Datum,
    string SpielId,
    int Stufe,
    string Eingabegeraet,
    bool SynthetischerDruck,
    bool Abgebrochen,
    // Aus einer Vorführung: in der Tabelle sichtbar und markiert, in der Kurve nicht.
    bool Vorfuehrung,
    int? Selbsteinschaetzung,
    Kennzahl? Kennzahlen,
    UnterschriftKennzahl? Unterschrift,
    InhibitionKennzahl? Inhibition,
    ReglerWerte? Regler);

/// <summary>Alles, was die Therapeuten-App zum Zeichnen der Urkunde braucht. <c>Extra</c> geht
/// ungelesen als JSON-Text durch; <c>Werte</c> ist der Rohdaten-Blob (im JSON als Base64) und
/// fehlt, wenn nichts aufgezeichnet wurde.</summary>
public record UrkundeAntwort(
    DateTime Datum,
    int Stufe,
    string Eingabegeraet,
    bool SynthetischerDruck,
    string? Extra,
    byte[]? Werte);

public record SpielZeile(
    string SpielId,
    int Anzahl,
    int Stufe,
    double UebungszeitMinuten,
    Kennzahl? Mittelwerte,
    int OhneRohdaten);

/// <summary>
/// Zusammenfassung nach Fähigkeitsbereich. <b>Ein Spiel kann mehrere Bereiche tragen</b> — die
/// Summe der Anzahlen ist deshalb größer als die Zahl der Übungen. Der Bericht sagt das dazu,
/// sonst wirkt er falsch addiert.
///
/// <c>Inhibition</c> ist nur beim Bereich Impulskontrolle gefüllt: alle Pfiffe der Woche
/// zusammengefasst, als wären sie ein Spiel.
/// </summary>
public record KategorieZeile(
    string Kategorie,
    int Anzahl,
    double UebungszeitMinuten,
    Kennzahl? Mittelwerte,
    int OhneRohdaten,
    InhibitionKennzahl? Inhibition);

public record Wochenbericht(
    DateTime Von,
    DateTime Bis,
    string Klient,
    string? Spielname,
    int Einheiten,
    int Abgebrochen,
    double UebungszeitMinuten,
    IReadOnlyList<KategorieZeile> ProKategorie,
    IReadOnlyList<SpielZeile> ProSpiel,
    double? SelbsteinschaetzungMittel,
    FragebogenZeile Fragebogen,
    IReadOnlyList<string> Hinweise);

/// <summary>
/// Verlauf (C4) und Wochenbericht (D3).
///
/// <b>Beide rechnen ausschließlich aus den Rohdaten.</b> Die Felder <c>Genauigkeit</c> und
/// <c>Vollstaendigkeit</c> in <c>Spielergebnis</c> entstehen im Browser für das Sofortfeedback
/// aus A1 und sind ausdrücklich unmaßgeblich — sie tauchen hier nirgends auf. Wo keine Rohdaten
/// vorliegen, bleibt das Feld leer und der Bericht sagt es. Eine leere Stelle ist ehrlich, ein
/// eingesetzter Browser-Wert wäre es nicht.
/// </summary>
public static class Bericht
{
    public static void MapBericht(this WebApplication app)
    {
        app.MapGet("/api/klienten/{id:int}/verlauf", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            return Results.Ok(await Verlauf(db, therapeutId, id));
        });

        // Die Urkunde zum Ansehen und Drucken. Gezeichnet wird im Browser aus den Rohdaten —
        // ein Bild der Unterschrift gibt es nirgends.
        app.MapGet("/api/klienten/{id:int}/urkunden/{ergebnisId:guid}", async (
            int id, Guid ergebnisId, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var urkunde = await Zugriff.ErgebnisseFuer(db, therapeutId, id)
                .Where(e => e.Id == ergebnisId && e.SpielId == Spielkatalog.UrkundeId)
                .Select(e => new UrkundeAntwort(
                    e.Session!.EmpfangenAm, e.Stufe, e.Eingabegeraet, e.SynthetischerDruck,
                    e.Extra, e.Rohdaten!.Werte))
                .SingleOrDefaultAsync();

            return urkunde is null ? Results.NotFound() : Results.Ok(urkunde);
        });

        app.MapGet("/api/klienten/{id:int}/wochenbericht", async (
            int id, DateTime? von, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            // Sieben Tage mit heute: start bis start + 6.
            var start = (von ?? DateTime.UtcNow.AddDays(-6)).Date;
            return Results.Ok(await Woche(db, therapeutId, id, start));
        });
    }

    /// <summary>
    /// Der Wochenbericht ab <paramref name="start"/>, sieben Tage. Ohne HTTP, damit sich mit xUnit
    /// prüfen lässt, was mitzählt. Die Betreuung prüft der Endpunkt vorher; die Abfragen
    /// selbst gehen trotzdem über <see cref="Zugriff"/>.
    /// </summary>
    public static async Task<Wochenbericht> Woche(TkContext db, int therapeutId, int klientId, DateTime start)
    {
        var ende = start.AddDays(7);

        var klient = await db.Klienten
            .Where(k => k.Id == klientId)
            .Select(k => new { k.Vorname, k.Nachname, k.Spielname })
            .SingleAsync();

        var sessions = await Zugriff.SessionsFuer(db, therapeutId, klientId)
            .Where(s => s.EmpfangenAm >= start && s.EmpfangenAm < ende)
            // Vorführungen zählen nicht: 30 Sekunden je Spiel in einer Präsentation sind kein
            // Training. Alles Weitere unten — Fragebogen, Bereiche, Hinweise — baut auf dieser
            // Liste auf, deshalb genügt der Filter hier.
            .Where(s => !s.Vorfuehrung)
            .Select(s => new
            {
                s.Id,
                s.Status,
                Ergebnisse = s.Ergebnisse.Select(e => new
                {
                    e.SpielId,
                    e.Stufe,
                    e.DauerMs,
                    e.Abgebrochen,
                    e.Selbsteinschaetzung,
                    e.Eingabegeraet,
                    e.SynthetischerDruck,
                    e.Extra,
                    Roh = e.Rohdaten!.Werte,
                }).ToList(),
            })
            .ToListAsync();

        // C3: Die Antworten auf „Wie war das Training heute?". Eine eigene, flache Abfrage statt
        // einer zweiten Liste im Select oben: zwei Listen auf einmal werden in SQL miteinander
        // multipliziert, und jede Zeile schleppt dann die Rohdaten-Blobs mit.
        var einschaetzungEreignisse = await Zugriff.EinschaetzungenFuer(db, therapeutId, klientId)
            .Where(e => e.Session!.EmpfangenAm >= start && e.Session.EmpfangenAm < ende)
            .OrderBy(e => e.Folgenummer)
            .Select(e => new { e.SessionId, e.Nutzlast })
            .ToListAsync();

        var fragebogenAntworten = sessions
            .Select(s => Fragebogen.Antwort(
                s.Status,
                s.Ergebnisse.Count,
                einschaetzungEreignisse
                    .Where(e => e.SessionId == s.Id).Select(e => e.Nutzlast).ToList()))
            .ToList();

        // Jede Punktfolge wird genau einmal ausgewertet und dann zweimal gruppiert —
        // nach Übung und nach Fähigkeitsbereich. Sonst rechnet man dieselben Blobs doppelt.
        var alleErgebnisse = sessions
            .SelectMany(s => s.Ergebnisse)
            .Select(e => new
            {
                e.SpielId,
                e.Stufe,
                e.DauerMs,
                e.Selbsteinschaetzung,
                Kennzahl = e.Roh is null ? null : Kennzahlen.Berechne(e.Roh),
                // Leer bei allen anderen Spielen. Hier noch je Pfiff, zusammengefasst wird erst
                // für den Bereich — fünf Pfiffe aus zwei Spielen zählen dann gemeinsam.
                Pfiffe = e.SpielId == Inhibition.SpielId
                    ? Inhibition.Messe(e.Roh, e.Extra, e.Eingabegeraet, e.SynthetischerDruck)
                    : [],
            })
            .ToList();

        var proSpiel = alleErgebnisse
            .GroupBy(e => e.SpielId)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var kennzahlen = g.Select(e => e.Kennzahl).Where(k => k is not null)
                    .Cast<Kennzahl>().ToList();

                return new SpielZeile(
                    SpielId: g.Key,
                    Anzahl: g.Count(),
                    // Die Stufe wird nicht gemittelt: eine Änderung des Therapeuten würde
                    // sonst als halbe Stufe erscheinen. Es zählt die zuletzt geübte.
                    Stufe: g.Last().Stufe,
                    UebungszeitMinuten: Math.Round(g.Sum(e => e.DauerMs) / 60000.0, 1),
                    Mittelwerte: kennzahlen.Count == 0 ? null : Mitteln(kennzahlen),
                    // Nicht die fehlende Aufzeichnung zählen: auch eine mit zu wenigen
                    // Punkten liefert keine Kennzahl. Sonst fällt sie still aus dem
                    // Mittelwert und der Bericht rechnet über weniger Übungen, als er anzeigt.
                    OhneRohdaten: g.Count() - kennzahlen.Count);
            })
            .ToList();

        var proKategorie = alleErgebnisse
            .SelectMany(e => Spielkatalog.KategorienFuer(e.SpielId).Select(k => new { Kategorie = k, e }))
            .GroupBy(x => x.Kategorie)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var kennzahlen = g.Select(x => x.e.Kennzahl).Where(k => k is not null)
                    .Cast<Kennzahl>().ToList();

                return new KategorieZeile(
                    Kategorie: g.Key,
                    Anzahl: g.Count(),
                    UebungszeitMinuten: Math.Round(g.Sum(x => x.e.DauerMs) / 60000.0, 1),
                    Mittelwerte: kennzahlen.Count == 0 ? null : Mitteln(kennzahlen),
                    OhneRohdaten: g.Count() - kennzahlen.Count,
                    Inhibition: g.Key == Inhibition.Kategorie
                        ? Inhibition.Zusammenfassen(g.SelectMany(x => x.e.Pfiffe).ToList())
                        : null);
            })
            .ToList();

        var einschaetzungen = alleErgebnisse
            .Where(e => e.Selbsteinschaetzung is not null)
            .Select(e => (double)e.Selbsteinschaetzung!.Value)
            .ToList();

        var hinweise = new List<string>();
        var abgebrochen = sessions.Count(s => s.Status == "abgebrochen");

        // Ein Abbruch ist laut CLAUDE.md ein Befund, keine Datenpanne — er gehört sichtbar
        // in den Bericht und nicht in eine Fußnote.
        if (abgebrochen > 0)
            hinweise.Add($"{abgebrochen} von {sessions.Count} Einheiten wurden abgebrochen.");

        var ohneRoh = proSpiel.Sum(p => p.OhneRohdaten);
        if (ohneRoh > 0)
            hinweise.Add(
                $"{ohneRoh} von {alleErgebnisse.Count} Übungen ohne verwertbare Aufzeichnung — " +
                "sie sind in den Mittelwerten nicht enthalten.");

        if (proKategorie.Any(k => k.Kategorie == Spielkatalog.OhneZuordnung))
            hinweise.Add(
                "Für mindestens eine Übung fehlt die Zuordnung zu einem Fähigkeitsbereich — " +
                "sie ist in Auswertung/Spielkatalog.cs nicht eingetragen.");

        var stufenwechsel = alleErgebnisse.Select(e => e.Stufe).Distinct().Count();
        if (stufenwechsel > 1)
            hinweise.Add("Die Schwierigkeitsstufe wurde in diesem Zeitraum geändert — Werte sind nur eingeschränkt vergleichbar.");

        if (sessions.Count == 0)
            hinweise.Add("In diesem Zeitraum wurde nicht geübt.");

        return new Wochenbericht(
            Von: start,
            Bis: ende.AddDays(-1),
            Klient: $"{klient.Vorname} {klient.Nachname}",
            Spielname: klient.Spielname,
            Einheiten: sessions.Count,
            Abgebrochen: abgebrochen,
            UebungszeitMinuten: Math.Round(alleErgebnisse.Sum(e => e.DauerMs) / 60000.0, 1),
            ProKategorie: proKategorie,
            ProSpiel: proSpiel,
            SelbsteinschaetzungMittel: einschaetzungen.Count == 0
                ? null
                : Math.Round(einschaetzungen.Average(), 2),
            Fragebogen: Fragebogen.Zaehle(fragebogenAntworten),
            Hinweise: hinweise);
    }

    /// <summary>
    /// Alle Übungen eines Kindes, nach Einheit und darin in Spielreihenfolge. Ohne HTTP, damit
    /// sich Reihenfolge und Abfrage mit xUnit gegen SQLite prüfen lassen. Die Betreuung prüft
    /// der Endpunkt vorher; die Abfragen selbst gehen trotzdem über <see cref="Zugriff"/>.
    /// </summary>
    public static async Task<List<VerlaufPunkt>> Verlauf(TkContext db, int therapeutId, int klientId)
    {
        var zeilen = await Zugriff.ErgebnisseFuer(db, therapeutId, klientId)
            .Select(e => new
            {
                e.Id,
                e.SessionId,
                e.Session!.EmpfangenAm,
                e.SpielId,
                e.Stufe,
                e.Eingabegeraet,
                e.SynthetischerDruck,
                e.Abgebrochen,
                e.Session.Vorfuehrung,
                e.Selbsteinschaetzung,
                Roh = e.Rohdaten!.Werte,
                e.Extra,
            })
            .ToListAsync();

        // Die Spielreihenfolge steht nicht am Ergebnis, sondern im Ereignisprotokoll: jedes
        // „spiel_ergebnis" trägt seine Folgenummer und in der Nutzlast die Ergebnis-id. Eine
        // eigene, flache Abfrage statt eines Joins über die Session — das wären zwei
        // verschachtelte SelectMany, und daraus macht EF Core ein SQL APPLY, das SQLite nicht kennt.
        var ereignisse = await Zugriff.SpielErgebnisseImProtokoll(db, therapeutId, klientId)
            .Select(e => new { e.Folgenummer, e.Nutzlast })
            .ToListAsync();

        var position = new Dictionary<Guid, int>();
        foreach (var e in ereignisse)
            if (ErgebnisIdAus(e.Nutzlast) is Guid ergebnisId)
                position[ergebnisId] = e.Folgenummer;

        // Erst die Einheit, dann die Stelle darin. Ein Ergebnis ohne passendes Ereignis (ältere
        // Einheiten) kommt ans Ende seiner Einheit, statt zu verschwinden. OrderBy ist stabil:
        // untereinander bleiben solche Ergebnisse, wie die Datenbank sie liefert.
        return zeilen
            .OrderBy(z => z.EmpfangenAm)
            .ThenBy(z => z.SessionId)
            .ThenBy(z => position.GetValueOrDefault(z.Id, int.MaxValue))
            .Select(z => new VerlaufPunkt(
                z.Id, z.SessionId, z.EmpfangenAm, z.SpielId, z.Stufe, z.Eingabegeraet,
                z.SynthetischerDruck, z.Abgebrochen, z.Vorfuehrung, z.Selbsteinschaetzung,
                z.Roh is null ? null : Kennzahlen.Berechne(z.Roh),
                // Spielspezifische Kennzahlen nur beim passenden Spiel, auch wenn das extra
                // anderer Spiele ebenfalls ein JSON ist.
                z.Roh is null || z.SpielId != Spielkatalog.UrkundeId
                    ? null
                    : Unterschrift.Berechne(z.Roh, z.Extra),
                z.SpielId != Inhibition.SpielId
                    ? null
                    : Inhibition.Berechne(z.Roh, z.Extra, z.Eingabegeraet, z.SynthetischerDruck),
                Regler.Lies(z.Extra)))
            .ToList();
    }

    /// <summary>Die Ergebnis-id aus der Nutzlast eines „spiel_ergebnis":
    /// <c>{"ergebnis":{"id":"…", …}}</c> (<c>apps/web/src/api.ts</c>, <c>nutzlast</c>).
    /// Fehlt sie oder ist die Nutzlast kaputt, gibt es keine Position — kein Serverfehler.</summary>
    private static Guid? ErgebnisIdAus(string? nutzlast)
    {
        if (string.IsNullOrWhiteSpace(nutzlast)) return null;
        try
        {
            using var dok = JsonDocument.Parse(nutzlast);
            return dok.RootElement.GetProperty("ergebnis").GetProperty("id").GetGuid();
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException
            or KeyNotFoundException or FormatException)
        {
            return null;
        }
    }

    private static Kennzahl Mitteln(IReadOnlyCollection<Kennzahl> k) => new(
        Punkte: (int)k.Average(x => x.Punkte),
        DauerMs: Math.Round(k.Average(x => x.DauerMs)),
        Weglaenge: Math.Round(k.Average(x => x.Weglaenge), 1),
        TempoMittel: Math.Round(k.Average(x => x.TempoMittel), 1),
        TempoStreuung: Math.Round(k.Average(x => x.TempoStreuung), 1),
        Zittern: Math.Round(k.Average(x => x.Zittern), 2),
        DruckMittel: Math.Round(k.Average(x => x.DruckMittel), 3),
        DruckStreuung: Math.Round(k.Average(x => x.DruckStreuung), 3),
        Absetzer: (int)Math.Round(k.Average(x => x.Absetzer)));
}
