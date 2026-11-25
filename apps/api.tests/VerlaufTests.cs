using TravelKickers.Api.Daten;
using TravelKickers.Api.Endpunkte;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Die Reihenfolge im Verlauf. Sie steht nur im Ereignisprotokoll („spiel_ergebnis" mit
/// Folgenummer und Ergebnis-id in der Nutzlast). Läuft gegen echtes SQLite: eine Abfrage, die EF
/// Core in SQL APPLY übersetzt, würfe hier genauso wie im Betrieb.
/// </summary>
public class VerlaufTests
{
    // Absichtlich so gewählt, dass weder die Reihenfolge der Schlüssel noch die beim Einfügen
    // zufällig die Spielreihenfolge ergibt.
    private static readonly Guid Erstes = Guid.Parse("cccccccc-0000-0000-0000-000000000000");
    private static readonly Guid Zweites = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000000");
    private static readonly Guid Drittes = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000000");

    private static Session Einheit(int klientId, DateTime empfangen) => new()
    {
        Id = Guid.NewGuid(),
        KlientId = klientId,
        VereinId = "koeln",
        Tag = 1,
        Status = "fertig",
        EmpfangenAm = empfangen,
    };

    private static SessionEreignis SpielEreignis(Guid sessionId, int folgenummer, Guid ergebnisId) => new()
    {
        SessionId = sessionId,
        Folgenummer = folgenummer,
        Art = "spiel_ergebnis",
        // So schreibt es die Kind-App: das ganze Ergebnis unter „ergebnis".
        Nutzlast = $$$"""{"ergebnis":{"spielId":"linie","id":"{{{ergebnisId}}}"}}""",
    };

    [Fact]
    public async Task Uebungen_stehen_in_Spielreihenfolge_und_alte_Einheiten_bleiben_erhalten()
    {
        using var t = new TestDatenbank();
        var (thomasId, benId) = t.MitBetreuung();

        // Eine ältere Einheit von vor dem Protokoll: zwei Ergebnisse, kein einziges Ereignis.
        var alt = Einheit(benId, new DateTime(2026, 9, 1));
        var neu = Einheit(benId, new DateTime(2026, 9, 2));
        t.Db.Sessions.AddRange(alt, neu);
        t.Db.Spielergebnisse.AddRange(
            new Spielergebnis { Id = Guid.NewGuid(), SessionId = alt.Id, SpielId = "linie" },
            new Spielergebnis { Id = Guid.NewGuid(), SessionId = alt.Id, SpielId = "autogramme" },
            // Eingefügt in falscher Reihenfolge.
            new Spielergebnis { Id = Zweites, SessionId = neu.Id, SpielId = "linie" },
            new Spielergebnis { Id = Drittes, SessionId = neu.Id, SpielId = "linie" },
            new Spielergebnis { Id = Erstes, SessionId = neu.Id, SpielId = "linie" });
        t.Db.SessionEreignisse.AddRange(
            new SessionEreignis { SessionId = neu.Id, Folgenummer = 0, Art = "session_start" },
            SpielEreignis(neu.Id, 2, Erstes),
            // Kaputte Nutzlast: darf nichts abstürzen lassen.
            new SessionEreignis { SessionId = neu.Id, Folgenummer = 3, Art = "spiel_ergebnis", Nutzlast = "{" },
            SpielEreignis(neu.Id, 5, Zweites),
            SpielEreignis(neu.Id, 8, Drittes));
        await t.Db.SaveChangesAsync();

        var verlauf = await Bericht.Verlauf(t.Db, thomasId, benId);

        Assert.Equal(5, verlauf.Count);
        Assert.All(verlauf.Take(2), p => Assert.Equal(alt.Id, p.SessionId));
        Assert.Equal([Erstes, Zweites, Drittes], verlauf.Skip(2).Select(p => p.ErgebnisId));
    }

    [Fact]
    public async Task Ein_fremder_Therapeut_sieht_keinen_Verlauf()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung("thomas@test");
        var (fremderId, _) = t.MitBetreuung("fremd@test");

        var einheit = Einheit(benId, new DateTime(2026, 9, 2));
        t.Db.Sessions.Add(einheit);
        t.Db.Spielergebnisse.Add(new Spielergebnis { Id = Erstes, SessionId = einheit.Id, SpielId = "linie" });
        t.Db.SessionEreignisse.Add(SpielEreignis(einheit.Id, 1, Erstes));
        await t.Db.SaveChangesAsync();

        Assert.Empty(await Bericht.Verlauf(t.Db, fremderId, benId));
    }
}
