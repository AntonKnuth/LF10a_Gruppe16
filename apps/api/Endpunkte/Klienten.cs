using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record NeuerKlient(string Vorname, string Nachname);

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

/// <summary>Alles, was der Therapeut an seinem Laptop tut. Jeder Endpunkt hier prüft zuerst
/// die Betreuung — der Join steht sichtbar im Code, nicht in einem unsichtbaren Filter.</summary>
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
                    k.Id, k.Vorname, k.Nachname, k.Spielname, k.PausenDauerSek, k.PausenInhalt,
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

        // --- Einstellungen (B1, B3) ----------------------------------------------------

        app.MapGet("/api/klienten/{id:int}/einstellungen", async (
            int id, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            return Results.Ok(await db.Einstellungen
                .Where(e => e.KlientId == id)
                .OrderBy(e => e.Reihenfolge)
                .Select(e => new EinstellungEingang(
                    e.SpielId, e.Stufe, e.Toleranz, e.Zielgeschwindigkeit,
                    e.Mindesttrefferquote, e.DauerSek, e.Aktiv, e.Reihenfolge))
                .ToListAsync());
        });

        app.MapPut("/api/klienten/{id:int}/einstellungen", async (
            int id, List<EinstellungEingang> eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.TherapeutId() is not int therapeutId) return Results.Unauthorized();
            if (!await Zugriff.DarfSehen(db, therapeutId, id)) return Results.Forbid();

            var vorhanden = await db.Einstellungen.Where(e => e.KlientId == id).ToListAsync();

            foreach (var e in eingabe)
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

        // --- Geräte --------------------------------------------------------------------

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
