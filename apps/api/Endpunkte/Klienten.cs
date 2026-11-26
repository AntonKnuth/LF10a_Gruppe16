using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record NeuerKlient(string Vorname, string Nachname);

/// <summary>Klienten anlegen, lesen und löschen — der Reiter „Klienten" der Therapeuten-App.
/// Jeder Endpunkt prüft zuerst die Betreuung — der Join steht sichtbar im Code, nicht in einem
/// unsichtbaren Filter. Einstellungen und Geräte eines Kindes stehen in <c>Einstellungen.cs</c>
/// und <c>Geraete.cs</c>.</summary>
public static class Klienten
{
    public static void MapKlienten(this WebApplication app)
    {
        // --- Lesen ---------------------------------------------------------------------

        app.MapGet("/api/klienten", async (TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();

            return Results.Ok(await Zugriff.KlientenFuer(db, therapeutId)
                .OrderBy(k => k.Nachname).ThenBy(k => k.Vorname)
                .Select(k => new { k.Id, k.Vorname, k.Nachname, k.Spielname })
                .ToListAsync());
        });

        app.MapGet("/api/klienten/{id:int}", async (int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();

            var klient = await Zugriff.KlientenFuer(db, therapeutId)
                .Where(k => k.Id == id)
                .Select(k => new
                {
                    k.Id,
                    k.Vorname,
                    k.Nachname,
                    k.Spielname,
                    k.PausenDauerSek,
                    k.PausenInhalt,
                    k.Vorfuehrmodus,
                })
                .SingleOrDefaultAsync();

            // 403, nicht 404 und nicht eine leere Antwort: „kein Zugriff" und „hat nicht geübt"
            // dürfen sich nicht gleich anfühlen, sonst lügt der Wochenbericht.
            return klient is null ? Results.Forbid() : Results.Ok(klient);
        });

        // --- Anlegen und löschen -------------------------------------------------------

        app.MapPost("/api/klienten", async (
            NeuerKlient eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();

            var klient = new Klient
            {
                Vorname = eingabe.Vorname,
                Nachname = eingabe.Nachname,
                ErstelltAm = DateTime.UtcNow,
            };
            db.Klienten.Add(klient);
            await db.SaveChangesAsync();

            // Wer ein Kind anlegt, betreut es. Ohne diese Zeile hätte der Therapeut auf den
            // gerade angelegten Klienten sofort keinen Zugriff mehr.
            db.Betreuungen.Add(new Betreuung
            {
                TherapeutId = therapeutId,
                KlientId = klient.Id,
                Von = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();

            return Results.Created($"/api/klienten/{klient.Id}", new { klient.Id });
        });

        // D4 / Art. 17 DSGVO. Die Löschung passiert hier und nicht auf dem Tablet: dort läge
        // sie hinter einer Kindersicherung, und die Daten liegen ohnehin auf dem Server.
        app.MapDelete("/api/klienten/{id:int}", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var klient = await db.Klienten.SingleOrDefaultAsync(k => k.Id == id);
            if (klient is null) return Results.NotFound();

            db.Klienten.Remove(klient);
            await db.SaveChangesAsync();

            // Ohne VACUUM stehen die gelöschten Bytes noch in der Freelist und im WAL. Das ist
            // die unangenehmste Rückfrage zu Art. 17, und sie kostet eine Zeile.
            // VACUUM läuft nicht innerhalb einer Transaktion, muss also nach SaveChanges kommen.
            await db.Database.ExecuteSqlRawAsync("VACUUM");

            return Results.NoContent();
        });
    }
}
