using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Daten;

var builder = WebApplication.CreateBuilder(args);

// Absoluter Pfad, nicht relativ zum Arbeitsverzeichnis. Sonst legt Migrate() beim Start per
// Doppelklick still eine zweite, leere Datenbank an — und das Login gibt 401 ohne sichtbaren Grund.
var dbPfad = Path.Combine(AppContext.BaseDirectory, "travelkickers.db");
builder.Services.AddDbContext<TkContext>(o => o.UseSqlite($"Data Source={dbPfad}"));

builder.Services.AddSingleton<IPasswordHasher<Therapeut>, PasswordHasher<Therapeut>>();

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromHours(8);
        o.SlidingExpiration = true;

        // Ohne das antwortet ASP.NET auf einen nicht angemeldeten API-Aufruf mit einer
        // 302-Umleitung auf eine Anmeldeseite. Ein fetch() sieht dann 200 und HTML.
        o.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        o.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

// Alles ist geschützt, außer es steht ausdrücklich AllowAnonymous dran. Andersherum vergisst
// man irgendwann einen Endpunkt.
builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(
    new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build());

var app = builder.Build();

using (var start = app.Services.CreateScope())
{
    var db = start.ServiceProvider.GetRequiredService<TkContext>();
    db.Database.Migrate();
    Seed.Anlegen(db, start.ServiceProvider.GetRequiredService<IPasswordHasher<Therapeut>>());
}

app.UseAuthentication();
app.UseAuthorization();

// --- Anmeldung -------------------------------------------------------------------------

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

    var anspruch = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, therapeut.Id.ToString()),
            new Claim(ClaimTypes.Name, $"{therapeut.Vorname} {therapeut.Nachname}"),
        ],
        CookieAuthenticationDefaults.AuthenticationScheme);

    await http.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(anspruch));

    return Results.Ok(new { therapeut.Id, therapeut.Vorname, therapeut.Nachname });
}).AllowAnonymous();

app.MapPost("/api/abmeldung", async (HttpContext http) =>
{
    await http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok();
});

app.MapGet("/api/ich", (ClaimsPrincipal nutzer) => Results.Ok(new
{
    Id = TherapeutId(nutzer),
    Name = nutzer.Identity?.Name,
}));

// --- Klienten --------------------------------------------------------------------------

// Die TherapeutId kommt aus dem Cookie, nie aus dem Request. Erst dadurch ist der Satz
// "Zugriff steht in der Tabelle Betreuung" überhaupt wahr.
app.MapGet("/api/klienten", async (TkContext db, ClaimsPrincipal nutzer) =>
    Results.Ok(await Zugriff.KlientenFuer(db, TherapeutId(nutzer))
        .OrderBy(k => k.Nachname).ThenBy(k => k.Vorname)
        .Select(k => new { k.Id, k.Vorname, k.Nachname, k.Spielname })
        .ToListAsync()));

app.MapGet("/api/klienten/{id:int}", async (int id, TkContext db, ClaimsPrincipal nutzer) =>
{
    var klient = await Zugriff.KlientenFuer(db, TherapeutId(nutzer))
        .Where(k => k.Id == id)
        .Select(k => new { k.Id, k.Vorname, k.Nachname, k.Spielname, k.PausenDauerSek, k.PausenInhalt })
        .SingleOrDefaultAsync();

    // 403, nicht 404 und nicht eine leere Antwort: "kein Zugriff" und "hat nicht geübt"
    // dürfen sich nicht gleich anfühlen.
    return klient is null ? Results.Forbid() : Results.Ok(klient);
});

app.Run();

static int TherapeutId(ClaimsPrincipal nutzer) =>
    int.Parse(nutzer.FindFirstValue(ClaimTypes.NameIdentifier)!);

record AnmeldeDaten(string Email, string Passwort);
