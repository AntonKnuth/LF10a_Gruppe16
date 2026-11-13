using Microsoft.AspNetCore.Identity;
using TravelKickers.Api.Auswertung;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Der Seed legt nicht nur das Demo-Konto an, er ergänzt bei **jedem** Start die fehlenden
/// Einstellungszeilen.
///
/// Der Grund steht in der Projektgeschichte: „Brezelverkauf" kam dazu, die Datenbank existierte
/// schon, und damit fehlte dem Kind die Zeile für dieses Spiel. Gespielt wurde es trotzdem — die
/// Kind-App nimmt für Unbekanntes ihre Vorgabe — aber der Therapeut sah es nicht und konnte es
/// weder einstellen noch abwählen. Ohne diesen Test kommt genau das beim nächsten Spiel wieder.
/// </summary>
public class SeedTests
{
    private static readonly IPasswordHasher<Therapeut> Hasher = new PasswordHasher<Therapeut>();

    [Fact]
    public void Leere_Datenbank_bekommt_Demokonto_und_alle_Einstellungen()
    {
        using var t = new TestDatenbank();

        Seed.Anlegen(t.Db, Hasher);

        var thomas = Assert.Single(t.Db.Therapeuten.ToList());
        Assert.Equal("thomas@praxis.test", thomas.Email);

        var ben = Assert.Single(t.Db.Klienten.ToList());
        var spiele = t.Db.Einstellungen.Where(e => e.KlientId == ben.Id).Select(e => e.SpielId);
        Assert.Equal([.. Spielkatalog.AlleIds.Order()], [.. spiele.ToList().Order()]);
    }

    [Fact]
    public void Ein_neu_dazugekommenes_Spiel_bekommt_bei_bestehendem_Kind_eine_Zeile()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();

        // Der Stand vor dem neuen Spiel: alles außer einem.
        var neuesSpiel = Spielkatalog.AlleIds[^2];
        t.Db.Einstellungen.AddRange(Spielkatalog.AlleIds
            .Where(id => id != neuesSpiel)
            .Select((id, i) => new Einstellung { KlientId = benId, SpielId = id, Reihenfolge = i }));
        t.Db.SaveChanges();

        Seed.Anlegen(t.Db, Hasher);

        var zeile = t.Db.Einstellungen.Single(e => e.KlientId == benId && e.SpielId == neuesSpiel);
        // Hinten angehängt, damit die bestehende Reihenfolge nicht durcheinandergerät.
        Assert.Equal(Spielkatalog.AlleIds.Count - 1, zeile.Reihenfolge);
        Assert.True(zeile.Aktiv);
    }

    [Fact]
    public void Was_der_Therapeut_eingestellt_hat_ueberlebt_den_Neustart()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();

        t.Db.Einstellungen.Add(new Einstellung
        {
            KlientId = benId, SpielId = "linie", Stufe = 5, DauerSek = 60, Aktiv = false,
        });
        t.Db.SaveChanges();

        Seed.Anlegen(t.Db, Hasher);
        Seed.Anlegen(t.Db, Hasher); // zweiter Start: nichts darf sich verdoppeln

        var linie = t.Db.Einstellungen.Single(e => e.KlientId == benId && e.SpielId == "linie");
        Assert.Equal(5, linie.Stufe);
        Assert.Equal(60, linie.DauerSek);
        Assert.False(linie.Aktiv);
        Assert.Equal(Spielkatalog.AlleIds.Count, t.Db.Einstellungen.Count(e => e.KlientId == benId));
    }

    [Fact]
    public void Zweiter_Start_legt_kein_zweites_Demokonto_an()
    {
        using var t = new TestDatenbank();

        Seed.Anlegen(t.Db, Hasher);
        Seed.Anlegen(t.Db, Hasher);

        Assert.Single(t.Db.Therapeuten.ToList());
        Assert.Single(t.Db.Klienten.ToList());
    }
}
