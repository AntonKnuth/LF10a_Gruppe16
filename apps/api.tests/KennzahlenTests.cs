using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Die Auswertung ist der Teil, den CLAUDE.md als „maßgeblich" bezeichnet — die Zahlen aus dem
/// Browser dürfen nie in einen Bericht. Also muss diese Rechnung belegt sein und nicht nur
/// plausibel aussehen. Die Blobs hier sind von Hand gebaut, die erwarteten Werte nachgerechnet.
/// </summary>
public class KennzahlenTests
{
    /// <summary>Baut einen Blob im verbindlichen Format: 4 Float32 je Abtastung.</summary>
    private static byte[] Blob(params (float T, float X, float Y, float Druck)[] punkte) =>
        punkte.SelectMany(p => new[] { p.T, p.X, p.Y, p.Druck })
            .SelectMany(BitConverter.GetBytes)
            .ToArray();

    [Fact]
    public void Blob_wird_wieder_als_dieselben_Punkte_gelesen()
    {
        var gelesen = Kennzahlen.Lies(Blob((0, 1, 2, 0.5f), (16, 3, 4, 0.6f)));

        Assert.Equal(2, gelesen.Count);
        Assert.Equal(new Abtastung(0, 1, 2, 0.5f), gelesen[0]);
        Assert.Equal(new Abtastung(16, 3, 4, 0.6f), gelesen[1]);
    }

    [Fact]
    public void Zu_wenige_Punkte_geben_null_statt_einer_erfundenen_Zahl()
    {
        Assert.Null(Kennzahlen.Berechne([]));
        Assert.Null(Kennzahlen.Berechne(Blob((0, 0, 0, 1))));
    }

    [Fact]
    public void Gerade_Linie_hat_kein_Zittern_und_gleichmaessiges_Tempo()
    {
        // Vier Punkte, je 100 px in 1000 ms nach rechts: 100 px/s, keine Richtungsänderung.
        var k = Kennzahlen.Berechne(Blob(
            (0, 0, 0, 0.5f), (1000, 100, 0, 0.5f), (2000, 200, 0, 0.5f), (3000, 300, 0, 0.5f)))!;

        Assert.Equal(300, k.Weglaenge, 3);
        Assert.Equal(100, k.TempoMittel, 3);
        Assert.Equal(0, k.TempoStreuung, 3);
        Assert.Equal(0, k.Zittern, 3);
        Assert.Equal(0.5, k.DruckMittel, 3);
        Assert.Equal(0, k.DruckStreuung, 3);
        Assert.Equal(0, k.Absetzer);
        Assert.Equal(3000, k.DauerMs, 3);
    }

    [Fact]
    public void Zickzack_zittert_messbar_mehr_als_eine_Gerade()
    {
        // Rechtwinklige Zacken: jede Abtastung dreht die Richtung um 90 Grad.
        var zacken = Kennzahlen.Berechne(Blob(
            (0, 0, 0, 0.5f), (100, 10, 0, 0.5f), (200, 10, 10, 0.5f),
            (300, 20, 10, 0.5f), (400, 20, 20, 0.5f)))!;

        var gerade = Kennzahlen.Berechne(Blob(
            (0, 0, 0, 0.5f), (100, 10, 0, 0.5f), (200, 20, 0, 0.5f),
            (300, 30, 0, 0.5f), (400, 40, 0, 0.5f)))!;

        Assert.Equal(90, zacken.Zittern, 1);
        Assert.Equal(0, gerade.Zittern, 3);
        Assert.True(zacken.Zittern > gerade.Zittern);
    }

    [Fact]
    public void Absetzen_wird_gezaehlt_und_der_Weg_durch_die_Luft_nicht_mitgerechnet()
    {
        // Strich, absetzen, weit weg neu ansetzen, zweiter Strich.
        var k = Kennzahlen.Berechne(Blob(
            (0, 0, 0, 0.5f),
            (100, 10, 0, 0.5f),
            (200, 10, 0, 0f),      // Stift hoch
            (300, 500, 0, 0f),     // durch die Luft — darf nicht in die Weglänge
            (400, 500, 0, 0.5f),   // wieder aufgesetzt
            (500, 510, 0, 0.5f)))!;

        Assert.Equal(1, k.Absetzer);
        Assert.Equal(20, k.Weglaenge, 3);
    }

    [Fact]
    public void Druckstreuung_unterscheidet_gleichmaessiges_von_schwankendem_Aufdruecken()
    {
        var gleichmaessig = Kennzahlen.Berechne(Blob(
            (0, 0, 0, 0.5f), (100, 10, 0, 0.5f), (200, 20, 0, 0.5f)))!;

        var schwankend = Kennzahlen.Berechne(Blob(
            (0, 0, 0, 0.2f), (100, 10, 0, 0.9f), (200, 20, 0, 0.2f)))!;

        Assert.Equal(0, gleichmaessig.DruckStreuung, 3);
        Assert.True(schwankend.DruckStreuung > 0.3);
        Assert.Equal(0.5, gleichmaessig.DruckMittel, 3);
    }
}
