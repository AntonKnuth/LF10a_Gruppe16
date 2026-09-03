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

// Die gebauten Frontends liegen in wwwroot: die Kind-App unter /, die Therapeuten-App unter
// /therapeut/. Eine Origin für alles — dadurch gibt es kein CORS zu konfigurieren, und das
// Anmelde-Cookie wird ohne Sonderregeln mitgeschickt.
app.UseDefaultFiles();
app.UseStaticFiles();

// UseRouting MUSS hier ausdrücklich stehen, und zwar NACH den Dateien.
//
// Ohne diese Zeile fügt WebApplication das Routing automatisch ganz am Anfang der Kette ein.
// Dann wählt der Catch-all-Fallback weiter unten bereits einen Endpunkt aus, bevor
// UseStaticFiles überhaupt an die Reihe kommt — und die Static-Files-Middleware überspringt
// sich selbst, sobald ein Endpunkt gewählt ist. Ergebnis: jede .js- und .css-Datei liefert
// index.html mit Content-Type text/html, der Browser lehnt das Modul ab und die Seite bleibt
// weiß. Der Fehler sieht aus wie ein kaputter Build und ist keiner.
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapKonten();
app.MapKlienten();
app.MapTablet();
app.MapBericht();

// Beide Anwendungen holen sich ihre Zustände im Browser, nicht über Serverpfade. Alles, was
// kein Endpunkt und keine Datei ist, bekommt deshalb die passende index.html.
//
// `.AllowAnonymous()` ist hier Pflicht und keine Nachlässigkeit: die FallbackPolicy verlangt
// eine Anmeldung für jeden Endpunkt, und ein Fallback ist ein Endpunkt. Ohne diese Zeile
// bekäme niemand die Anmeldeseite ausgeliefert — es sähe aus wie ein kaputter Build.
app.MapFallbackToFile("/therapeut/{*pfad}", "/therapeut/index.html").AllowAnonymous();
app.MapFallbackToFile("/{*pfad}", "/index.html").AllowAnonymous();

app.Run();

/// <summary>Nur damit die Tests den Host hochfahren können.</summary>
public partial class Program;
