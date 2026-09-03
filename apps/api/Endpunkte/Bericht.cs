using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auswertung;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record VerlaufPunkt(
    Guid SessionId,
    DateTime Datum,
    string SpielId,
    int Stufe,
    string Eingabegeraet,
    bool SynthetischerDruck,
    bool Abgebrochen,
    int? Selbsteinschaetzung,
    Kennzahl? Kennzahlen);

public record SpielZeile(
    string SpielId,
    int Anzahl,
    int Stufe,
    double UebungszeitMinuten,
    Kennzahl? Mittelwerte,
    int OhneRohdaten);

public record Wochenbericht(
    DateTime Von,
    DateTime Bis,
    string Klient,
    string? Spielname,
    int Einheiten,
    int Abgebrochen,
    double UebungszeitMinuten,
    IReadOnlyList<SpielZeile> ProSpiel,
    double? SelbsteinschaetzungMittel,
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

            var zeilen = await Zugriff.ErgebnisseFuer(db, therapeutId, id)
                .OrderBy(e => e.Session!.EmpfangenAm)
                .Select(e => new
                {
                    e.SessionId,
                    e.Session!.EmpfangenAm,
                    e.SpielId, e.Stufe, e.Eingabegeraet,
                    e.SynthetischerDruck, e.Abgebrochen, e.Selbsteinschaetzung,
                    Roh = e.Rohdaten!.Werte,
                })
                .ToListAsync();

            return Results.Ok(zeilen.Select(z => new VerlaufPunkt(
                z.SessionId, z.EmpfangenAm, z.SpielId, z.Stufe, z.Eingabegeraet,
                z.SynthetischerDruck, z.Abgebrochen, z.Selbsteinschaetzung,
                z.Roh is null ? null : Kennzahlen.Berechne(z.Roh))));
        });

        app.MapGet("/api/klienten/{id:int}/wochenbericht", async (
            int id, DateTime? von, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var start = (von ?? DateTime.UtcNow.AddDays(-7)).Date;
            var ende = start.AddDays(7);

            var klient = await db.Klienten
                .Where(k => k.Id == id)
                .Select(k => new { k.Vorname, k.Nachname, k.Spielname })
                .SingleAsync();

            var sessions = await Zugriff.SessionsFuer(db, therapeutId, id)
                .Where(s => s.EmpfangenAm >= start && s.EmpfangenAm < ende)
                .Select(s => new
                {
                    s.Id,
                    s.Status,
                    Ergebnisse = s.Ergebnisse.Select(e => new
                    {
                        e.SpielId, e.Stufe, e.DauerMs, e.Abgebrochen, e.Selbsteinschaetzung,
                        Roh = e.Rohdaten!.Werte,
                    }).ToList(),
                })
                .ToListAsync();

            var alleErgebnisse = sessions.SelectMany(s => s.Ergebnisse).ToList();

            var proSpiel = alleErgebnisse
                .GroupBy(e => e.SpielId)
                .OrderBy(g => g.Key)
                .Select(g =>
                {
                    var kennzahlen = g
                        .Select(e => e.Roh is null ? null : Kennzahlen.Berechne(e.Roh))
                        .Where(k => k is not null)
                        .Cast<Kennzahl>()
                        .ToList();

                    return new SpielZeile(
                        SpielId: g.Key,
                        Anzahl: g.Count(),
                        // Die Stufe wird nicht gemittelt: eine Änderung des Therapeuten würde
                        // sonst als halbe Stufe erscheinen. Es zählt die zuletzt geübte.
                        Stufe: g.Last().Stufe,
                        UebungszeitMinuten: Math.Round(g.Sum(e => e.DauerMs) / 60000.0, 1),
                        Mittelwerte: kennzahlen.Count == 0 ? null : Mitteln(kennzahlen),
                        // Nicht `Roh is null` zählen: auch eine Aufzeichnung mit zu wenigen
                        // Punkten liefert keine Kennzahl. Sonst fällt sie still aus dem
                        // Mittelwert und der Bericht rechnet über weniger Übungen, als er anzeigt.
                        OhneRohdaten: g.Count() - kennzahlen.Count);
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

            var stufenwechsel = alleErgebnisse.Select(e => e.Stufe).Distinct().Count();
            if (stufenwechsel > 1)
                hinweise.Add("Die Schwierigkeitsstufe wurde in diesem Zeitraum geändert — Werte sind nur eingeschränkt vergleichbar.");

            if (sessions.Count == 0)
                hinweise.Add("In diesem Zeitraum wurde nicht geübt.");

            return Results.Ok(new Wochenbericht(
                Von: start,
                Bis: ende.AddDays(-1),
                Klient: $"{klient.Vorname} {klient.Nachname}",
                Spielname: klient.Spielname,
                Einheiten: sessions.Count,
                Abgebrochen: abgebrochen,
                UebungszeitMinuten: Math.Round(alleErgebnisse.Sum(e => e.DauerMs) / 60000.0, 1),
                ProSpiel: proSpiel,
                SelbsteinschaetzungMittel: einschaetzungen.Count == 0
                    ? null
                    : Math.Round(einschaetzungen.Average(), 2),
                Hinweise: hinweise));
        });
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
