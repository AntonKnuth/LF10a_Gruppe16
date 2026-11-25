using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Belegt die Kennzahlen der Urkunden-Unterschrift (Ticket #9). Die Punktfolgen sind von Hand
/// gebaut. Das Band steht überall bei y = 100, Höhe 100 — die Grundlinie liegt also bei y = 200.
/// </summary>
public class UnterschriftTests
{
    private const string Extra = """{"band":{"x":0,"y":100,"breite":400,"hoehe":100},"neustartsMs":[]}""";

    private static byte[] Blob(params (float T, float X, float Y, float Druck)[] punkte) =>
        punkte.SelectMany(p => new[] { p.T, p.X, p.Y, p.Druck })
            .SelectMany(BitConverter.GetBytes)
            .ToArray();

    [Fact]
    public void Waagerechte_Schrift_auf_der_Grundlinie_hat_keine_Abweichung_und_keine_Schraeglage()
    {
        // Zwei Striche, beide unten bei y = 200, dazwischen abgesetzt.
        var u = Unterschrift.Berechne(Blob(
            (0, 10, 200, 0.5f), (100, 60, 200, 0.5f), (200, 60, 200, 0f),
            (300, 110, 200, 0.5f), (400, 160, 200, 0.5f)), Extra)!;

        Assert.Equal(0, u.Grundlinienabweichung, 3);
        Assert.Equal(0, u.Schraeglage, 3);
    }

    [Fact]
    public void Ansteigende_Folge_hat_positive_Schraeglage()
    {
        // Y sinkt von Strich zu Strich: die Schrift wandert nach oben.
        var u = Unterschrift.Berechne(Blob(
            (0, 10, 200, 0.5f), (100, 20, 200, 0.5f), (200, 20, 200, 0f),
            (300, 110, 180, 0.5f), (400, 120, 180, 0.5f), (500, 120, 180, 0f),
            (600, 210, 160, 0.5f), (700, 220, 160, 0.5f)), Extra)!;

        Assert.True(u.Schraeglage > 0);
    }

    [Theory]
    [InlineData("""{"band":{"x":0,"y":1e999,"breite":400,"hoehe":100}}""")]
    [InlineData("""{"band":{"x":0,"y":100,"breite":400,"hoehe":1e999}}""")]
    public void Unendliches_Band_gilt_als_nicht_lesbar(string extra)
    {
        Assert.Null(Unterschrift.Berechne(Blob((0, 10, 200, 0.5f), (100, 60, 200, 0.5f)), extra));
    }

    [Fact]
    public void Strich_doppelt_so_hoch_wie_das_Band_hat_Hoehe_2()
    {
        var u = Unterschrift.Berechne(Blob(
            (0, 10, 300, 0.5f), (100, 10, 100, 0.5f)), Extra)!;

        Assert.Equal(2, u.Hoehe, 3);
    }

    [Fact]
    public void Breite_ist_relativ_zur_Bandhoehe()
    {
        var u = Unterschrift.Berechne(Blob(
            (0, 10, 200, 0.5f), (100, 260, 200, 0.5f)), Extra)!;

        Assert.Equal(2.5, u.Breite, 3);
    }

    [Fact]
    public void Abtastungen_vor_dem_letzten_Neustart_werden_ignoriert()
    {
        var extra = """{"band":{"x":0,"y":100,"breite":400,"hoehe":100},"neustartsMs":[150,400]}""";

        // Der erste Versuch ist riesig (Höhe 3), der letzte ab t = 400 nur 50 px hoch.
        var u = Unterschrift.Berechne(Blob(
            (0, 10, 400, 0.5f), (100, 10, 100, 0.5f),
            (400, 10, 200, 0.5f), (500, 10, 150, 0.5f)), extra)!;

        Assert.Equal(0.5, u.Hoehe, 3);
        Assert.Equal(2, u.Neustarts);
    }

    [Fact]
    public void Fehlendes_band_gibt_null()
    {
        var blob = Blob((0, 10, 200, 0.5f), (100, 60, 200, 0.5f));

        Assert.Null(Unterschrift.Berechne(blob, """{"neustartsMs":[]}"""));
        Assert.Null(Unterschrift.Berechne(blob, null));
    }

    [Fact]
    public void Ungueltiges_extra_gibt_null()
    {
        var blob = Blob((0, 10, 200, 0.5f), (100, 60, 200, 0.5f));

        Assert.Null(Unterschrift.Berechne(blob, "das ist kein json"));
        Assert.Null(Unterschrift.Berechne(blob, """{"band":{"y":"oben","hoehe":100}}"""));
        Assert.Null(Unterschrift.Berechne(blob, """{"band":{"y":100,"hoehe":0}}"""));
    }
}
