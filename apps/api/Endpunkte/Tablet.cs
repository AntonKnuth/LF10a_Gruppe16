using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record KopplungEingang(string Code, string Bezeichnung);

public record SpielnameEingang(string Spielname);

/// <summary>
/// Alles, was das Tablet aufruft.
///
/// Kein einziger Endpunkt hier nimmt eine <c>KlientId</c> entgegen — sie kommt aus dem
/// Gerätetoken. Ein Tablet kann dadurch gar nicht erst versuchen, Daten für ein fremdes Kind zu
/// schicken oder zu lesen; das muss nicht getestet werden, es ist nicht ausdrückbar.
/// </summary>
public static class Tablet
{
    public static void MapTablet(this WebApplication app)
    {
        // --- Kopplung ------------------------------------------------------------------

        // Anonym, weil das Tablet an dieser Stelle noch nichts hat, womit es sich ausweisen
        // könnte. Der Schutz ist der Code selbst.
        app.MapPost("/api/kopplung", async (KopplungEingang eingabe, TkContext db) =>
        {
            var code = await db.Kopplungscodes
                .SingleOrDefaultAsync(k => k.Code == eingabe.Code.ToUpperInvariant());

            // Ein falsch geratener Code findet gar keine Zeile — der eigentliche Schutz gegen
            // Raten sind die rund eine Milliarde Möglichkeiten und die halbe Stunde Gültigkeit,
            // nicht der Zähler. Der Zähler fängt den anderen Fall ab: jemand probiert einen
            // abgelaufenen oder bereits benutzten Code immer wieder. Eine Sperre pro IP wäre
            // hier falsch — in der Vorführung kommt alles von ::1 und würde sich selbst sperren.
            if (code is null) return Results.NotFound();

            if (code.EingeloestAm is not null || code.LaeuftAbAm < DateTime.UtcNow
                || code.Fehlversuche >= 10)
            {
                code.Fehlversuche++;
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status410Gone);
            }

            var token = Geheimnis.NeuesToken();
            db.Geraete.Add(new Geraet
            {
                KlientId = code.KlientId,
                Bezeichnung = eingabe.Bezeichnung,
                TokenHash = Geheimnis.Hash(token),
                ErstelltAm = DateTime.UtcNow,
            });
            code.EingeloestAm = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Das einzige Mal, dass der Server das Klartext-Token herausgibt.
            return Results.Ok(new { Token = token });
        }).AllowAnonymous();

        // --- Was das Tablet wissen muss ------------------------------------------------

        app.MapGet("/api/kind", async (TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.KlientId() is not int klientId) return Results.Unauthorized();

            var kind = await db.Klienten
                .Where(k => k.Id == klientId)
                .Select(k => new { k.Spielname, k.PausenDauerSek, k.PausenInhalt })
                .SingleAsync();

            var einstellungen = await db.Einstellungen
                .Where(e => e.KlientId == klientId)
                .OrderBy(e => e.Reihenfolge)
                .Select(e => new EinstellungEingang(
                    e.SpielId, e.Stufe, e.Toleranz, e.Zielgeschwindigkeit,
                    e.Mindesttrefferquote, e.DauerSek, e.Aktiv, e.Reihenfolge))
                .ToListAsync();

            // Der bürgerliche Name wird bewusst nicht mitgeschickt: im Kindmodus wird nur der
            // selbstgewählte Spielname ausgesprochen (C5).
            return Results.Ok(new
            {
                kind.Spielname, kind.PausenDauerSek, kind.PausenInhalt, Einstellungen = einstellungen,
            });
        }).RequireAuthorization("Geraet");

        app.MapPost("/api/kind/spielname", async (
            SpielnameEingang eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.KlientId() is not int klientId) return Results.Unauthorized();

            var kind = await db.Klienten.SingleAsync(k => k.Id == klientId);
            kind.Spielname = eingabe.Spielname;
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization("Geraet");

        // --- Datenannahme (D2, B4) -----------------------------------------------------

        app.MapPut("/api/sessions/{sessionId:guid}", async (
            Guid sessionId, SessionEingang eingabe, TkContext db, ClaimsPrincipal nutzer) =>
        {
            if (nutzer.KlientId() is not int klientId) return Results.Unauthorized();
            if (nutzer.GeraetId() is not int geraetId) return Results.Unauthorized();

            var ergebnis = await SessionAnnahme.Anwenden(db, sessionId, klientId, geraetId, eingabe);

            return ergebnis switch
            {
                Annahme.Angelegt => Results.Created($"/api/sessions/{sessionId}", null),
                Annahme.Aktualisiert => Results.NoContent(),
                Annahme.Konflikt => Results.Conflict("Sitzung gehört zu einem anderen Kind"),
                _ => Results.BadRequest("Unbekannter Status"),
            };
        }).RequireAuthorization("Geraet");
    }
}
