using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Auswertung;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Der Abschluss-Fragebogen steckt nur im Ereignisprotokoll: die letzte Einschätzung einer
/// fertigen Einheit, und nur, wenn es eine mehr gibt als Übungen.
/// </summary>
public class FragebogenTests
{
    private static string Wert(int wert) => $$"""{"wert":{{wert}}}""";

    [Fact]
    public void Die_letzte_Einschaetzung_einer_fertigen_Einheit_ist_der_Fragebogen()
    {
        Assert.Equal(3, Fragebogen.Antwort("fertig", 2, [Wert(1), Wert(2), Wert(3)]));
    }

    [Theory]
    [InlineData("abgebrochen")]
    [InlineData("laeuft")]
    public void Nur_fertige_Einheiten_haben_einen_Fragebogen(string status)
    {
        Assert.Null(Fragebogen.Antwort(status, 1, [Wert(1), Wert(2)]));
    }

    [Fact]
    public void Ohne_die_zusaetzliche_Einschaetzung_gibt_es_keine_Antwort()
    {
        // Sonst zählte die Einschätzung der letzten Übung als Fragebogen.
        Assert.Null(Fragebogen.Antwort("fertig", 2, [Wert(1), Wert(2)]));
        Assert.Null(Fragebogen.Antwort("fertig", 0, []));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("kein json")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("""{"wert":"3"}""")]
    [InlineData("""{"wert":2.5}""")]
    [InlineData("""{"wert":4}""")]
    public void Unlesbare_Antworten_zaehlen_nicht(string? nutzlast)
    {
        Assert.Null(Fragebogen.Antwort("fertig", 1, [Wert(2), nutzlast]));
    }

    [Fact]
    public void Zaehlt_jede_Antwort_und_laesst_fehlende_aus()
    {
        Assert.Equal(new FragebogenZeile(2, 1, 1), Fragebogen.Zaehle([3, 3, 2, 1, null]));
    }

    [Fact]
    public async Task Die_Ereignisse_lassen_sich_mit_SQLite_abfragen_und_nur_vom_Betreuer()
    {
        using var t = new TestDatenbank();
        var (thomasId, benId) = t.MitBetreuung();
        var (fremderId, miaId) = t.MitBetreuung("fremd@test");

        foreach (var kind in new[] { benId, miaId })
        {
            t.Db.Sessions.Add(new Session
            {
                Id = Guid.NewGuid(),
                KlientId = kind,
                Status = "fertig",
                EmpfangenAm = DateTime.UtcNow,
                Ereignisse =
                [
                    new SessionEreignis { Folgenummer = 0, Art = "session_start" },
                    new SessionEreignis { Folgenummer = 1, Art = "selbsteinschaetzung", Nutzlast = Wert(1) },
                    new SessionEreignis { Folgenummer = 2, Art = "selbsteinschaetzung", Nutzlast = Wert(3) },
                ],
            });
        }
        await t.Db.SaveChangesAsync();

        // Dieselbe Abfrage wie im Wochenbericht — sie muss ohne SQL APPLY auskommen.
        var heute = DateTime.UtcNow.Date;
        var nutzlasten = await Zugriff.EinschaetzungenFuer(t.Db, thomasId, benId)
            .Where(e => e.Session!.EmpfangenAm >= heute && e.Session.EmpfangenAm < heute.AddDays(2))
            .OrderBy(e => e.Folgenummer)
            .Select(e => e.Nutzlast)
            .ToListAsync();

        Assert.Equal([Wert(1), Wert(3)], nutzlasten);
        Assert.Empty(await Zugriff.EinschaetzungenFuer(t.Db, fremderId, benId).ToListAsync());
    }
}
