using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Belegt den Satz, mit dem die Zugriffsregel im Kolloquium verteidigt wird: „Zugriff steht in
/// der Tabelle Betreuung, nicht in einer Spalte Praxis." Ohne diesen Test ist das eine Behauptung.
/// </summary>
public class ZugriffTests
{
    [Fact]
    public void Therapeut_sieht_nur_betreute_Kinder()
    {
        using var t = new TestDatenbank();
        var (thomasId, benId) = t.MitBetreuung("thomas@test");

        // Ein zweiter Therapeut und ein zweites Kind, ohne Betreuung zwischen ihnen.
        var fremder = new Therapeut { Email = "fremd@test", PasswortHash = "x" };
        var fremdesKind = new Klient { Vorname = "Mia", Nachname = "Wolf" };
        t.Db.Therapeuten.Add(fremder);
        t.Db.Klienten.Add(fremdesKind);
        t.Db.SaveChanges();

        var seineKinder = Zugriff.KlientenFuer(t.Db, thomasId).Select(k => k.Id).ToList();

        Assert.Equal([benId], seineKinder);
        Assert.DoesNotContain(fremdesKind.Id, seineKinder);
        Assert.Empty(Zugriff.KlientenFuer(t.Db, fremder.Id).ToList());
    }

    [Fact]
    public async Task DarfSehen_ist_falsch_ohne_Betreuungszeile()
    {
        using var t = new TestDatenbank();
        var (thomasId, benId) = t.MitBetreuung();

        var fremdesKind = new Klient { Vorname = "Mia", Nachname = "Wolf" };
        t.Db.Klienten.Add(fremdesKind);
        await t.Db.SaveChangesAsync();

        Assert.True(await Zugriff.DarfSehen(t.Db, thomasId, benId));
        Assert.False(await Zugriff.DarfSehen(t.Db, thomasId, fremdesKind.Id));
    }
}
