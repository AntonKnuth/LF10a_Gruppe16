using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

/// <summary>Der Reiter „Geräte" der Therapeuten-App: Kopplungscode, Geräteliste und Sperren.
/// Jeder Endpunkt prüft zuerst die Betreuung.</summary>
public static class Geraete
{
    public static void MapGeraete(this WebApplication app)
    {
        app.MapPost("/api/klienten/{id:int}/kopplungscode", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var code = new Kopplungscode
            {
                KlientId = id,
                Code = Geheimnis.NeuerCode(),
                // Kurz genug, dass ein liegengebliebener Zettel wertlos ist, lang genug für
                // die Übergabe in der Praxis.
                LaeuftAbAm = DateTime.UtcNow.AddMinutes(30),
            };
            db.Kopplungscodes.Add(code);
            await db.SaveChangesAsync();

            return Results.Ok(new { code.Code, code.LaeuftAbAm });
        });

        app.MapGet("/api/klienten/{id:int}/geraete", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            return Results.Ok(await db.Geraete
                .Where(g => g.KlientId == id)
                .OrderByDescending(g => g.ErstelltAm)
                .Select(g => new { g.Id, g.Bezeichnung, g.Aktiv, g.ErstelltAm, g.ZuletztGesehen })
                .ToListAsync());
        });

        // Sperren statt löschen: wirkt auch bei einem verlorenen Tablet, das nie zurückkommt.
        app.MapPost("/api/geraete/{id:int}/sperren", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();

            var geraet = await db.Geraete.SingleOrDefaultAsync(g => g.Id == id);
            if (geraet is null) return Results.NotFound();
            if (!await Zugriff.DarfSehen(db, therapeutId, geraet.KlientId)) return Results.Forbid();

            geraet.Aktiv = false;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
