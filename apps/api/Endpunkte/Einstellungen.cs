using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auswertung;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record EinstellungEingang(
    string SpielId,
    int Stufe,
    double Toleranz,
    double Zielgeschwindigkeit,
    double Mindesttrefferquote,
    int DauerSek,
    bool Aktiv,
    int Reihenfolge);

public record PauseEingang(int PausenDauerSek, string PausenInhalt);

public record VorfuehrmodusEingang(bool Vorfuehrmodus);

/// <summary>
/// Die Tagesform: wie viele Übungen welcher Rolle, und welche Spiele im Topf sind.
///
/// Beides zusammen in <b>einem</b> Aufruf, weil es nur zusammen gültig ist — würde man die
/// Anzahlen getrennt von den Spielen speichern, ließe sich ein Zustand herstellen, in dem für
/// eine Rolle Plätze eingestellt sind, für die es keine aktiven Spiele gibt.
/// </summary>
public record TagesformEingang(
    int AnzahlAufwaermen,
    int AnzahlUebungen,
    int AnzahlSonder,
    List<EinstellungEingang> Spiele);

public record TagesformAntwort(
    int AnzahlAufwaermen,
    int AnzahlUebungen,
    int AnzahlSonder,
    IReadOnlyList<EinstellungEingang> Spiele);

/// <summary>Der Reiter „Einstellungen" der Therapeuten-App: Tagesform und Regler, Tageslimit,
/// Vorführmodus und Pause eines Kindes. Jeder Endpunkt prüft zuerst die Betreuung.</summary>
public static class Einstellungen
{
    /// <summary>
    /// Gibt die Meldung zurück, warum nicht gespeichert werden darf — oder <c>null</c>.
    ///
    /// Der Tagesplan wird aus dem Topf gewürfelt. Sind für eine Rolle mehr Plätze eingestellt
    /// als Spiele aktiv, müsste sich dieselbe Übung mehrfach hintereinander wiederholen — dann
    /// ist die Einstellung nicht das, was der Therapeut meint, und wird abgelehnt.
    /// </summary>
    private static string? Pruefe(TagesformEingang e)
    {
        if (e.AnzahlAufwaermen < 0 || e.AnzahlUebungen < 0 || e.AnzahlSonder < 0)
            return "Die Anzahl der Übungen kann nicht negativ sein.";

        if (e.AnzahlAufwaermen + e.AnzahlUebungen + e.AnzahlSonder == 0)
            return "Eine Einheit braucht mindestens eine Übung.";

        // Ein geleertes Feld kommt als 0 an. Mit Toleranz oder Tempo 0 käme Ben im Spiel nicht
        // mehr voran, und das wäre der Verliererzustand, den es nicht geben soll (C2).
        if (e.Spiele.Any(s => s.Toleranz is < 0.1 or > 3 || s.Zielgeschwindigkeit is < 0.1 or > 3))
            return "Toleranz und Zieltempo müssen zwischen 0,1 und 3 liegen.";

        if (e.Spiele.Any(s => s.Mindesttrefferquote is < 0 or > 1))
            return "Die Mindesttrefferquote muss zwischen 0 und 1 liegen.";

        (Rolle rolle, int plaetze, string name)[] rollen =
        [
            (Rolle.Aufwaermen, e.AnzahlAufwaermen, "Aufwärmen"),
            (Rolle.Normal, e.AnzahlUebungen, "Übungen"),
            (Rolle.Sonder, e.AnzahlSonder, "Sonderspiele"),
        ];

        foreach (var (rolle, plaetze, name) in rollen)
        {
            var aktiv = e.Spiele.Count(s => s.Aktiv && Spielkatalog.IstSpielbar(s.SpielId)
                && Spielkatalog.RolleFuer(s.SpielId) == rolle);
            if (aktiv < plaetze)
                return $"{name}: {plaetze} pro Einheit eingestellt, aber nur {aktiv} " +
                       $"{(aktiv == 1 ? "Spiel ist" : "Spiele sind")} aktiv.";
        }

        return null;
    }

    /// <summary>
    /// Setzt den Haken „Vorführmodus" — nur, wenn der Therapeut das Kind betreut. Ohne HTTP, damit
    /// sich Speichern und Zugriffsprüfung mit xUnit belegen lassen. <c>false</c> heißt: kein Zugriff.
    /// </summary>
    public static async Task<bool> VorfuehrmodusSetzen(TkContext db, int therapeutId, int klientId, bool wert)
    {
        var klient = await Zugriff.KlientenFuer(db, therapeutId).SingleOrDefaultAsync(k => k.Id == klientId);
        if (klient is null) return false;

        klient.Vorfuehrmodus = wert;
        await db.SaveChangesAsync();
        return true;
    }

    public static void MapEinstellungen(this WebApplication app)
    {
        // --- Einstellungen (B1, B3) ----------------------------------------------------

        app.MapGet("/api/klienten/{id:int}/einstellungen", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var klient = await db.Klienten.SingleAsync(k => k.Id == id);

            var spiele = await db.Einstellungen
                .Where(e => e.KlientId == id)
                .OrderBy(e => e.Reihenfolge)
                .Select(e => new EinstellungEingang(
                    e.SpielId, e.Stufe, e.Toleranz, e.Zielgeschwindigkeit,
                    e.Mindesttrefferquote, e.DauerSek, e.Aktiv, e.Reihenfolge))
                .ToListAsync();

            // Zeilen von Spielen in Arbeit bleiben in der Datenbank, werden aber nicht angezeigt.
            spiele = spiele.Where(s => Spielkatalog.IstSpielbar(s.SpielId)).ToList();

            return Results.Ok(new TagesformAntwort(
                klient.AnzahlAufwaermen, klient.AnzahlUebungen, klient.AnzahlSonder, spiele));
        });

        app.MapPut("/api/klienten/{id:int}/einstellungen", async (
            int id, TagesformEingang eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            // Die eigentliche Regel steht hier und nicht nur in der Oberfläche: die Oberfläche
            // ist die Bequemlichkeit, der Server die Regel.
            // Als reiner Text, nicht als JSON: `Results.BadRequest(string)` verpackt die
            // Meldung in Anführungszeichen, und die stünden dann in der Oberfläche.
            if (Pruefe(eingabe) is string fehler)
                return Results.Text(fehler, "text/plain; charset=utf-8", statusCode: 400);

            var klient = await db.Klienten.SingleAsync(k => k.Id == id);
            klient.AnzahlAufwaermen = eingabe.AnzahlAufwaermen;
            klient.AnzahlUebungen = eingabe.AnzahlUebungen;
            klient.AnzahlSonder = eingabe.AnzahlSonder;

            var vorhanden = await db.Einstellungen.Where(e => e.KlientId == id).ToListAsync();

            foreach (var e in eingabe.Spiele)
            {
                var zeile = vorhanden.SingleOrDefault(v => v.SpielId == e.SpielId);
                if (zeile is null)
                {
                    zeile = new Einstellung { KlientId = id, SpielId = e.SpielId };
                    db.Einstellungen.Add(zeile);
                }

                zeile.Stufe = e.Stufe;
                zeile.Toleranz = e.Toleranz;
                zeile.Zielgeschwindigkeit = e.Zielgeschwindigkeit;
                zeile.Mindesttrefferquote = e.Mindesttrefferquote;
                zeile.DauerSek = e.DauerSek;
                zeile.Aktiv = e.Aktiv;
                zeile.Reihenfolge = e.Reihenfolge;
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // B3: Das Tageslimit von einer Einheit gilt auf dem Tablet. Ging etwas schief — Absturz,
        // versehentlich abgebrochen, falsches Kind am Gerät — gibt Thomas hier einen weiteren
        // Durchgang frei. Wirkt genau einmal: das Tablet merkt sich den Zeitpunkt, den es zuletzt
        // beachtet hat, und ein zweiter Start am selben Tag findet keinen neueren mehr.
        app.MapPost("/api/klienten/{id:int}/tageslimit", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var klient = await db.Klienten.SingleAsync(k => k.Id == id);
            klient.LimitFreigabeAm = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { klient.LimitFreigabeAm });
        });

        // Vorführmodus für Präsentationen. Ein eigener Aufruf und nicht Teil der Tagesform: der
        // Haken hat mit Anzahlen und Topf nichts zu tun und soll sich auch setzen lassen, wenn
        // die Tagesform gerade nicht speicherbar ist.
        app.MapPut("/api/klienten/{id:int}/vorfuehrmodus", async (
            int id, VorfuehrmodusEingang eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();

            return await VorfuehrmodusSetzen(db, therapeutId, id, eingabe.Vorfuehrmodus)
                ? Results.NoContent()
                : Results.Forbid();
        });

        app.MapPut("/api/klienten/{id:int}/pause", async (
            int id, PauseEingang eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var klient = await db.Klienten.SingleAsync(k => k.Id == id);
            klient.PausenDauerSek = eingabe.PausenDauerSek;
            klient.PausenInhalt = eingabe.PausenInhalt;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
