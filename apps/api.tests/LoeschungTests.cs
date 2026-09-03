using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Tests;

/// <summary>
/// D4 / Art. 17 DSGVO. Der Nachweis besteht nicht darin, dass ein DELETE durchläuft, sondern
/// darin, dass danach in <b>jeder</b> Tabelle keine Zeile mehr steht. Eine vergessene Kaskade
/// fällt sonst erst auf, wenn jemand nachsieht.
/// </summary>
public class LoeschungTests
{
    [Fact]
    public async Task Klient_loeschen_entfernt_restlos_alles()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();

        var geraet = new Geraet { KlientId = benId, Bezeichnung = "iPad", TokenHash = "hash" };
        t.Db.Geraete.Add(geraet);
        t.Db.Kopplungscodes.Add(new Kopplungscode
        {
            KlientId = benId, Code = "ABC234", LaeuftAbAm = DateTime.UtcNow.AddMinutes(30),
        });
        t.Db.Einstellungen.Add(new Einstellung { KlientId = benId, SpielId = "linie" });
        await t.Db.SaveChangesAsync();

        var anhang = new Anhang
        {
            KlientId = benId, Art = "handschriftprobe", ContentType = "image/png", Laenge = 3,
        };
        t.Db.Anhaenge.Add(anhang);
        await t.Db.SaveChangesAsync();
        t.Db.AnhangDaten.Add(new AnhangDaten { AnhangId = anhang.Id, Bytes = [1, 2, 3] });

        var sessionId = Guid.NewGuid();
        var ergebnisId = Guid.NewGuid();
        t.Db.Sessions.Add(new Session
        {
            Id = sessionId,
            KlientId = benId,
            GeraetId = geraet.Id,
            VereinId = "hsv",
            Tag = 1,
            Status = "fertig",
            Ereignisse = [new SessionEreignis { SessionId = sessionId, Folgenummer = 0, Art = "session_start" }],
            Ergebnisse =
            [
                new Spielergebnis
                {
                    Id = ergebnisId,
                    SessionId = sessionId,
                    SpielId = "linie",
                    Eingabegeraet = "pen",
                    Rohdaten = new Rohdaten { SpielergebnisId = ergebnisId, Werte = [1, 2, 3, 4] },
                },
            ],
        });
        await t.Db.SaveChangesAsync();

        // Vorbedingung: es liegt wirklich etwas da. Sonst prüft der Test hinterher nichts.
        Assert.Equal(1, await t.Db.Sessions.CountAsync());
        Assert.Equal(1, await t.Db.Rohdaten.CountAsync());
        Assert.Equal(1, await t.Db.AnhangDaten.CountAsync());

        var klient = await t.Db.Klienten.SingleAsync(k => k.Id == benId);
        t.Db.Klienten.Remove(klient);
        await t.Db.SaveChangesAsync();

        Assert.Empty(await t.Db.Klienten.ToListAsync());
        Assert.Empty(await t.Db.Betreuungen.ToListAsync());
        Assert.Empty(await t.Db.Geraete.ToListAsync());
        Assert.Empty(await t.Db.Kopplungscodes.ToListAsync());
        Assert.Empty(await t.Db.Einstellungen.ToListAsync());
        Assert.Empty(await t.Db.Sessions.ToListAsync());
        Assert.Empty(await t.Db.SessionEreignisse.ToListAsync());
        Assert.Empty(await t.Db.Spielergebnisse.ToListAsync());
        Assert.Empty(await t.Db.Rohdaten.ToListAsync());
        Assert.Empty(await t.Db.Anhaenge.ToListAsync());
        Assert.Empty(await t.Db.AnhangDaten.ToListAsync());

        // Der Therapeut bleibt — gelöscht wird das Kind, nicht die Praxis.
        Assert.Single(await t.Db.Therapeuten.ToListAsync());
    }

    /// <summary>
    /// Der Grund, warum Session.GeraetId nullbar mit SET NULL ist und nicht RESTRICT: sonst
    /// scheitert genau die Löschung oben, weil SQLite RESTRICT sofort prüft.
    /// </summary>
    [Fact]
    public async Task Geraet_loeschen_behaelt_die_Sitzungen_des_Kindes()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();

        var geraet = new Geraet { KlientId = benId, Bezeichnung = "iPad", TokenHash = "hash" };
        t.Db.Geraete.Add(geraet);
        await t.Db.SaveChangesAsync();

        t.Db.Sessions.Add(new Session
        {
            Id = Guid.NewGuid(), KlientId = benId, GeraetId = geraet.Id,
            VereinId = "hsv", Tag = 1, Status = "fertig",
        });
        await t.Db.SaveChangesAsync();

        t.Db.Geraete.Remove(geraet);
        await t.Db.SaveChangesAsync();

        var session = await t.Db.Sessions.SingleAsync();
        Assert.Null(session.GeraetId);
        Assert.Equal(benId, session.KlientId);
    }
}
