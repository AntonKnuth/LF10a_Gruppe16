using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auth;
using TravelKickers.Api.Daten;
using TravelKickers.Api.Endpunkte;

var builder = WebApplication.CreateBuilder(args);

// Absoluter Pfad, nicht relativ zum Arbeitsverzeichnis. Sonst legt Migrate() beim Start per
// Doppelklick still eine zweite, leere Datenbank an — und das Login gibt 401 ohne sichtbaren Grund.
var dbPfad = Path.Combine(AppContext.BaseDirectory, "travelkickers.db");
builder.Services.AddDbContext<TkContext>(o => o.UseSqlite($"Data Source={dbPfad}"));

builder.Services.AddSingleton<IPasswordHasher<Therapeut>, PasswordHasher<Therapeut>>();

// Zwei Anmeldeverfahren nebeneinander: Cookie für den Menschen am Laptop, Bearer-Token für das
// Tablet. Beides über denselben Weg zu machen ginge, wäre aber schlechter — ein Cookie schickt
// der Browser überallhin mit, ein Gerätetoken lässt sich einzeln sperren.
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
    })
    .AddScheme<GeraetOptionen, GeraetHandler>(GeraetHandler.Schema, _ => { });

// Die Verfahren werden ausdrücklich je Richtlinie benannt. Ohne das würde ein Tablet-Token auch
// auf Therapeuten-Endpunkten akzeptiert, sobald irgendwo beide Verfahren aktiv sind.
var nurTherapeut = new AuthorizationPolicyBuilder(CookieAuthenticationDefaults.AuthenticationScheme)
    .RequireAuthenticatedUser().Build();
var nurGeraet = new AuthorizationPolicyBuilder(GeraetHandler.Schema)
    .RequireAuthenticatedUser().Build();

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Therapeut", nurTherapeut)
    .AddPolicy("Geraet", nurGeraet)
    // Wer eine Richtlinie zu setzen vergisst, landet beim Therapeuten-Cookie — der strengere
    // Fall. Andersherum wäre ein vergessener Endpunkt offen.
    .SetFallbackPolicy(nurTherapeut);

var app = builder.Build();

using (var start = app.Services.CreateScope())
{
    var db = start.ServiceProvider.GetRequiredService<TkContext>();
    db.Database.Migrate();
    Seed.Anlegen(db, start.ServiceProvider.GetRequiredService<IPasswordHasher<Therapeut>>());
}

app.UseAuthentication();
app.UseAuthorization();

app.MapKonten();
app.MapKlienten();
app.MapTablet();

app.Run();

/// <summary>Nur damit die Tests den Host hochfahren können.</summary>
public partial class Program;
