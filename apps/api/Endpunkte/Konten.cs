using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Endpunkte;

public record AnmeldeDaten(string Email, string Passwort);

/// <summary>Anmeldung des Therapeuten. Das Tablet meldet sich nicht hier an, sondern über
/// sein Gerätetoken (siehe <see cref="GeraetHandler"/>).</summary>
public static class Konten
{
    public static void MapKonten(this WebApplication app)
    {
        app.MapPost("/api/anmeldung", async (
            AnmeldeDaten eingabe,
            TkContext db,
            IPasswordHasher<Therapeut> hasher,
            HttpContext http) =>
        {
            var therapeut = await db.Therapeuten.SingleOrDefaultAsync(t => t.Email == eingabe.Email);

            // Auch bei unbekannter E-Mail wird gehasht, damit die Antwortzeit nicht verrät,
            // welche Adressen es gibt.
            var pruefung = hasher.VerifyHashedPassword(
                therapeut ?? new Therapeut(),
                therapeut?.PasswortHash ?? "",
                eingabe.Passwort);

            if (therapeut is null || !therapeut.Aktiv || pruefung == PasswordVerificationResult.Failed)
                return Results.Unauthorized();

            var kennung = new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, therapeut.Id.ToString()),
                    new Claim(ClaimTypes.Name, $"{therapeut.Vorname} {therapeut.Nachname}"),
                ],
                CookieAuthenticationDefaults.AuthenticationScheme);

            await http.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(kennung));

            return Results.Ok(new { therapeut.Id, therapeut.Vorname, therapeut.Nachname });
        }).AllowAnonymous();

        app.MapPost("/api/abmeldung", async (HttpContext http) =>
        {
            await http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok();
        });

        app.MapGet("/api/ich", (ClaimsPrincipal nutzer) =>
            nutzer.TherapeutId() is not int id
                ? Results.Unauthorized()
                : Results.Ok(new { Id = id, Name = nutzer.Identity?.Name }));
    }
}
