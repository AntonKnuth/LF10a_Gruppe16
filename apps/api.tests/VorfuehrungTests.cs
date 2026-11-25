using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Daten;
using TravelKickers.Api.Endpunkte;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Vorführmodus: der Haken am Klienten, die Markierung der Session beim Upload und dass
/// Vorführungen im Wochenbericht nicht mitzählen, im Verlauf aber sichtbar bleiben.
/// </summary>
public class VorfuehrungTests
{
    private static SessionEingang Einheit(bool vorfuehrung) => new(
        VereinId: "koeln",
        Tag: 1,
        BegonnenAmMs: 1_700_000_000_000,
        BeendetAmMs: 1_700_000_030_000,
        Status: "fertig",
        Ereignisse: [new EreignisEingang(0, "session_start", 0, null)],
        Ergebnisse:
        [
            new ErgebnisEingang(
                Guid.NewGuid(), "linie", 30_000, 1.0, 0.8, 0.5, 0.1,
                "mouse", true, 3, false, 2, null, null),
        ],
        Vorfuehrung: vorfuehrung);

    private static async Task<int> GeraetFuer(TestDatenbank t, int klientId)
    {
        var geraet = new Geraet { KlientId = klientId, Bezeichnung = "iPad", TokenHash = "h" };
        t.Db.Geraete.Add(geraet);
        await t.Db.SaveChangesAsync();
        return geraet.Id;
    }

    [Fact]
    public async Task Der_Haken_wird_gespeichert_aber_nur_vom_betreuenden_Therapeuten()
    {
        using var t = new TestDatenbank();
        var (thomasId, benId) = t.MitBetreuung("thomas@test");
        var (fremderId, _) = t.MitBetreuung("fremd@test");

        Assert.False(await Klienten.VorfuehrmodusSetzen(t.Db, fremderId, benId, true));
        Assert.False((await t.Db.Klienten.AsNoTracking().SingleAsync(k => k.Id == benId)).Vorfuehrmodus);

        Assert.True(await Klienten.VorfuehrmodusSetzen(t.Db, thomasId, benId, true));
        Assert.True((await t.Db.Klienten.AsNoTracking().SingleAsync(k => k.Id == benId)).Vorfuehrmodus);

        Assert.True(await Klienten.VorfuehrmodusSetzen(t.Db, thomasId, benId, false));
        Assert.False((await t.Db.Klienten.AsNoTracking().SingleAsync(k => k.Id == benId)).Vorfuehrmodus);
    }

    [Fact]
    public async Task Der_Upload_markiert_die_Session_als_Vorfuehrung()
    {
        using var t = new TestDatenbank();
        var (_, benId) = t.MitBetreuung();
        var geraetId = await GeraetFuer(t, benId);

        var vorfuehrung = Guid.NewGuid();
        var training = Guid.NewGuid();
        await SessionAnnahme.Anwenden(t.Db, vorfuehrung, benId, geraetId, Einheit(true));
        await SessionAnnahme.Anwenden(t.Db, training, benId, geraetId, Einheit(false));

        Assert.True((await t.Db.Sessions.SingleAsync(s => s.Id == vorfuehrung)).Vorfuehrung);
        Assert.False((await t.Db.Sessions.SingleAsync(s => s.Id == training)).Vorfuehrung);
    }

    [Fact]
    public void Eine_alte_Nutzlast_ohne_das_Feld_ist_keine_Vorfuehrung()
    {
        // So sendet die Kind-App einen Schnappschuss aus der Zeit vor dem Vorführmodus nach.
        const string json = """
            {"vereinId":"koeln","tag":2,"begonnenAmMs":1,"beendetAmMs":2,"status":"fertig",
             "ereignisse":[],"ergebnisse":[]}
            """;

        var eingang = JsonSerializer.Deserialize<SessionEingang>(
            json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(eingang);
        Assert.False(eingang.Vorfuehrung);
    }

    [Fact]
    public async Task Vorfuehrungen_zaehlen_nicht_im_Wochenbericht_bleiben_aber_im_Verlauf()
    {
        using var t = new TestDatenbank();
        var (thomasId, benId) = t.MitBetreuung();
        var geraetId = await GeraetFuer(t, benId);

        await SessionAnnahme.Anwenden(t.Db, Guid.NewGuid(), benId, geraetId, Einheit(false));
        await SessionAnnahme.Anwenden(t.Db, Guid.NewGuid(), benId, geraetId, Einheit(true));
        await SessionAnnahme.Anwenden(t.Db, Guid.NewGuid(), benId, geraetId, Einheit(true));

        var bericht = await Bericht.Woche(t.Db, thomasId, benId, DateTime.UtcNow.Date.AddDays(-6));

        Assert.Equal(1, bericht.Einheiten);
        Assert.Equal(1, Assert.Single(bericht.ProSpiel).Anzahl);
        Assert.Equal(0.5, bericht.UebungszeitMinuten);

        var verlauf = await Bericht.Verlauf(t.Db, thomasId, benId);
        Assert.Equal(3, verlauf.Count);
        Assert.Equal(2, verlauf.Count(p => p.Vorfuehrung));
    }
}
