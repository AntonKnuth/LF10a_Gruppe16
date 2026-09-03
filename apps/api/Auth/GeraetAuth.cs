using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Auth;

public class GeraetOptionen : AuthenticationSchemeOptions;

/// <summary>
/// Zweites Anmeldeverfahren, nur für Tablets: <c>Authorization: Bearer &lt;Gerätetoken&gt;</c>.
///
/// Der Therapeut meldet sich mit einem Cookie an, das Tablet mit einem Token — bewusst nicht
/// beides gleich. Ein Cookie wird vom Browser automatisch mitgeschickt; für eine App, die nur
/// eigene Aufrufe macht, ist ein Token einfacher und lässt sich einzeln sperren.
///
/// Entscheidend ist der letzte Schritt: aus dem Token folgt die <c>KlientId</c>. Endpunkte für
/// das Tablet nehmen deshalb <b>keine</b> KlientId entgegen — ein Gerät kann gar nicht erst
/// versuchen, Daten für ein fremdes Kind zu schicken.
/// </summary>
public class GeraetHandler(
    IOptionsMonitor<GeraetOptionen> optionen,
    ILoggerFactory protokoll,
    UrlEncoder kodierer,
    TkContext db) : AuthenticationHandler<GeraetOptionen>(optionen, protokoll, kodierer)
{
    public const string Schema = "Geraet";
    public const string KlientAnspruch = "klientId";
    public const string GeraetAnspruch = "geraetId";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var kopf = Request.Headers.Authorization.ToString();
        if (!kopf.StartsWith("Bearer ", StringComparison.Ordinal))
            return AuthenticateResult.NoResult();

        var hash = Geheimnis.Hash(kopf["Bearer ".Length..].Trim());
        var geraet = await db.Geraete.SingleOrDefaultAsync(g => g.TokenHash == hash && g.Aktiv);

        // Gesperrtes Gerät und unbekanntes Token sind dieselbe Antwort: ein verlorenes Tablet
        // soll nicht herausfinden können, ob es gesperrt wurde oder nie gültig war.
        if (geraet is null) return AuthenticateResult.Fail("Unbekanntes oder gesperrtes Gerät");

        geraet.ZuletztGesehen = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var kennung = new ClaimsIdentity(
            [
                new Claim(KlientAnspruch, geraet.KlientId.ToString()),
                new Claim(GeraetAnspruch, geraet.Id.ToString()),
            ],
            Schema);

        return AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(kennung), Schema));
    }
}

/// <summary>
/// Wer fragt, steht in der Anmeldung — nie im Request. Überall <c>TryParse</c>: ein gültiges,
/// aber altes Cookie ohne den Anspruch gäbe sonst 500 statt 401, und ein 500 sieht in einer
/// Vorführung aus wie ein Absturz.
/// </summary>
public static class Ansprueche
{
    public static int? TherapeutId(this ClaimsPrincipal nutzer) =>
        int.TryParse(nutzer.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static int? KlientId(this ClaimsPrincipal nutzer) =>
        int.TryParse(nutzer.FindFirstValue(GeraetHandler.KlientAnspruch), out var id) ? id : null;

    public static int? GeraetId(this ClaimsPrincipal nutzer) =>
        int.TryParse(nutzer.FindFirstValue(GeraetHandler.GeraetAnspruch), out var id) ? id : null;
}
