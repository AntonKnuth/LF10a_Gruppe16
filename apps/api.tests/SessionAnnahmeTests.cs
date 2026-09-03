using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Die Absicherung gegen einen Verbindungsabbruch besteht aus einem einzigen Gedanken: alle
/// Schlüssel kommen vom Tablet, also ist ein Wiederholversuch ein Upsert. Diese Tests belegen
/// das — sonst verdoppelt ein abgebrochener Upload später still den Wochenbericht.
/// </summary>
public class SessionAnnahmeTests
{
    private static SessionEingang Einheit(Guid ergebnisId, string status = "fertig") => new(
        VereinId: "hsv",
        Tag: 1,
        BegonnenAmMs: 1_700_000_000_000,
        BeendetAmMs: 1_700_000_240_000,
        Status: status,
        Ereignisse:
        [
            new EreignisEingang(0, "session_start", 0, null),
            new EreignisEingang(1, "segment_start", 120, null),
        ],
        Ergebnisse:
        [
            new ErgebnisEingang(
                ergebnisId, "ballhochhalten", 210_000, 1.0, 0.8, 0.5, 0.1,
                "pen", false, 3, false, 2, null,
                new RohdatenEingang(Convert.ToBase64String([1, 2, 3, 4]), 60, 1)),
        ]);

    [Fact]
    public async Task Derselbe_Upload_zweimal_legt_nichts_doppelt_an()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();
        var geraet = new Geraet { KlientId = benId, Bezeichnung = "iPad", TokenHash = "h" };
        t.Db.Geraete.Add(geraet);
        await t.Db.SaveChangesAsync();

        var sessionId = Guid.NewGuid();
        var eingabe = Einheit(Guid.NewGuid());

        var erste = await SessionAnnahme.Anwenden(t.Db, sessionId, benId, geraet.Id, eingabe);
        var zweite = await SessionAnnahme.Anwenden(t.Db, sessionId, benId, geraet.Id, eingabe);

        Assert.Equal(Annahme.Angelegt, erste);
        Assert.Equal(Annahme.Aktualisiert, zweite);

        Assert.Equal(1, await t.Db.Sessions.CountAsync());
        Assert.Equal(2, await t.Db.SessionEreignisse.CountAsync());
        Assert.Equal(1, await t.Db.Spielergebnisse.CountAsync());
        Assert.Equal(1, await t.Db.Rohdaten.CountAsync());
    }

    [Fact]
    public async Task Nachgereichte_Ereignisse_werden_ergaenzt()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();
        var geraet = new Geraet { KlientId = benId, Bezeichnung = "iPad", TokenHash = "h" };
        t.Db.Geraete.Add(geraet);
        await t.Db.SaveChangesAsync();

        var sessionId = Guid.NewGuid();
        var ergebnisId = Guid.NewGuid();

        await SessionAnnahme.Anwenden(t.Db, sessionId, benId, geraet.Id, Einheit(ergebnisId, "laeuft"));

        var spaeter = Einheit(ergebnisId) with
        {
            Ereignisse = [.. Einheit(ergebnisId).Ereignisse, new EreignisEingang(2, "session_ende", 900, null)],
        };
        await SessionAnnahme.Anwenden(t.Db, sessionId, benId, geraet.Id, spaeter);

        Assert.Equal(3, await t.Db.SessionEreignisse.CountAsync());
        Assert.Equal(1, await t.Db.Spielergebnisse.CountAsync());
        Assert.Equal("fertig", (await t.Db.Sessions.SingleAsync()).Status);
    }

    [Fact]
    public async Task Fremde_SessionId_wird_abgewiesen_statt_die_Akte_zu_mischen()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();
        var geraet = new Geraet { KlientId = benId, Bezeichnung = "iPad", TokenHash = "h" };
        var mia = new Klient { Vorname = "Mia", Nachname = "Wolf" };
        t.Db.Geraete.Add(geraet);
        t.Db.Klienten.Add(mia);
        await t.Db.SaveChangesAsync();

        var sessionId = Guid.NewGuid();
        await SessionAnnahme.Anwenden(t.Db, sessionId, benId, geraet.Id, Einheit(Guid.NewGuid()));

        var ergebnis = await SessionAnnahme.Anwenden(
            t.Db, sessionId, mia.Id, geraet.Id, Einheit(Guid.NewGuid()));

        Assert.Equal(Annahme.Konflikt, ergebnis);
        Assert.Equal(benId, (await t.Db.Sessions.SingleAsync()).KlientId);
    }

    [Fact]
    public async Task Unbekannter_Status_wird_abgelehnt()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();
        var geraet = new Geraet { KlientId = benId, Bezeichnung = "iPad", TokenHash = "h" };
        t.Db.Geraete.Add(geraet);
        await t.Db.SaveChangesAsync();

        var ergebnis = await SessionAnnahme.Anwenden(
            t.Db, Guid.NewGuid(), benId, geraet.Id, Einheit(Guid.NewGuid(), "quatsch"));

        Assert.Equal(Annahme.UngueltigerStatus, ergebnis);
        Assert.Empty(await t.Db.Sessions.ToListAsync());
    }
}
