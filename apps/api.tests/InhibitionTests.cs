using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Belegt die Kennzahlen aus „Dribbeln mit Pfiff". Die Punktfolgen sind von Hand gebaut: beim
/// Dribbeln wandert die Spitze alle 20 ms um 5 Pixel nach rechts, beim Halten bleibt sie liegen.
/// Wenn nichts anderes dasteht, ist ein CSS-Pixel ein Bühnen-Pixel (k = 1).
///
/// Der Standardpfiff i beginnt bei 3000·i: Dribbeln bis +1300, Pfiff bei +1000, Halten bis
/// +2500, dort der Doppelpfiff. Die Reaktionszeit ist also 300 ms.
/// </summary>
public class InhibitionTests
{
    private sealed class Spiel
    {
        public readonly List<(float T, float X, float Y, float Druck)> Punkte = [];
        public readonly List<string> Pfiffe = [];
        private float _x;

        public void Dribbeln(float von, float bis, float druck = 0.5f)
        {
            for (var t = von; t <= bis; t += 20)
            {
                _x += 5;
                Punkte.Add((t, _x, 100, druck));
            }
        }

        public void Halten(float von, float bis, float druck = 0.5f)
        {
            for (var t = von; t <= bis; t += 20) Punkte.Add((t, _x, 100, druck));
        }

        public void Abheben(float t) => Punkte.Add((t, _x, 100, 0));

        public void Pfiff(double stopp, double ende, double? doppel, string art = "doppelpfiff",
            bool probe = false) =>
            Pfiffe.Add($$"""{"probe":{{(probe ? "true" : "false")}},"stoppMs":{{stopp}},"doppelMs":{{(doppel is null ? "null" : doppel.ToString())}},"endeMs":{{ende}},"ende":"{{art}}"}""");

        /// <summary>Ein sauberer Pfiff wie oben beschrieben.</summary>
        public void Standard(int i, bool probe = false)
        {
            var b = 3000 * i;
            Dribbeln(b, b + 1300);
            Halten(b + 1320, b + 2500);
            Pfiff(b + 1000, b + 2500, b + 2500, probe: probe);
        }

        public byte[] Blob() => Punkte
            .SelectMany(p => new[] { p.T, p.X, p.Y, p.Druck })
            .SelectMany(BitConverter.GetBytes)
            .ToArray();

        public string Extra(double k = 1, string pausen = "[]") =>
            $$"""{"version":1,"cssPxProBuehnenPx":{{k.ToString(System.Globalization.CultureInfo.InvariantCulture)}},"pfiffe":[{{string.Join(",", Pfiffe)}}],"pausen":{{pausen}}}""";

        public InhibitionKennzahl? Berechne(double k = 1, string geraet = "mouse", bool synthetisch = true) =>
            Inhibition.Berechne(Blob(), Extra(k), geraet, synthetisch);
    }

    private static Spiel FuenfSaubere()
    {
        var s = new Spiel();
        for (var i = 0; i < 5; i++) s.Standard(i);
        return s;
    }

    [Fact]
    public void Saubere_Stopps_haben_Reaktionszeit_300_und_volle_Stoppquote()
    {
        var k = FuenfSaubere().Berechne()!;

        Assert.Equal(5, k.Gewertet);
        Assert.Equal(300, k.ReaktionMedianMs!.Value, 3);
        Assert.Equal(0, k.ReaktionStreuungMs!.Value, 3);
        Assert.Equal(1, k.StoppQuote, 3);
        Assert.Equal(0, k.Abheber);
        Assert.Equal(0, k.Fehlstarts);
        Assert.Equal(0, k.NichtAngehalten);
        // 16 Schritte zu 5 Pixeln vom Pfiff bis zum Stillstand.
        Assert.Equal(80, k.NachlaufMedian!.Value, 3);
    }

    [Fact]
    public void Eine_Luecke_in_den_Daten_heisst_Stillstand()
    {
        // Ein ruhender Stift schickt keine Ereignisse: nach dem Stopp kommt bis zum Doppelpfiff
        // keine einzige Abtastung mehr.
        var s = new Spiel();
        for (var i = 0; i < 5; i++)
        {
            var b = 3000 * i;
            s.Dribbeln(b, b + 1300);
            s.Pfiff(b + 1000, b + 2500, b + 2500);
        }

        Assert.Equal(300, s.Berechne()!.ReaktionMedianMs!.Value, 3);
    }

    [Fact]
    public void Abheben_waehrend_des_Stopps_zaehlt_und_senkt_die_Stoppquote()
    {
        var s = new Spiel();
        for (var i = 0; i < 4; i++) s.Standard(i);
        // Pfiff 5: angehalten, dann bei +1800 abgehoben — der Pfiff endet damit.
        s.Dribbeln(12000, 13300);
        s.Halten(13320, 13800);
        s.Abheben(13800);
        s.Pfiff(13000, 13800, null, "abgehoben");

        var k = s.Berechne()!;
        Assert.Equal(1, k.Abheber);
        Assert.Equal(0.8, k.StoppQuote, 3);
    }

    [Fact]
    public void Weiterlaufen_vor_dem_Doppelpfiff_ist_ein_Fehlstart()
    {
        var s = new Spiel();
        for (var i = 0; i < 4; i++) s.Standard(i);
        // Pfiff 5: angehalten, ab +1800 wieder 4 × 5 = 20 Pixel weiter, Doppelpfiff erst bei +2500.
        s.Dribbeln(12000, 13300);
        s.Halten(13320, 13780);
        s.Dribbeln(13800, 13860);
        s.Halten(13880, 14500);
        s.Pfiff(13000, 14500, 14500);

        var k = s.Berechne()!;
        Assert.Equal(1, k.Fehlstarts);
        Assert.Equal(0.8, k.StoppQuote, 3);
        // Die Reaktionszeit selbst bleibt sauber.
        Assert.Equal(300, k.ReaktionMedianMs!.Value, 3);
    }

    [Fact]
    public void Wer_bis_zum_Ende_weiterlaeuft_hat_keine_Reaktionszeit()
    {
        var s = new Spiel();
        for (var i = 0; i < 4; i++) s.Standard(i);
        s.Dribbeln(12000, 14500);
        s.Pfiff(13000, 14500, 14500);

        var k = s.Berechne()!;
        Assert.Equal(1, k.NichtAngehalten);
        Assert.Equal(0.8, k.StoppQuote, 3);
    }

    [Fact]
    public void Wer_beim_Pfiff_schon_steht_geht_nicht_in_den_Median()
    {
        var s = new Spiel();
        for (var i = 0; i < 4; i++) s.Standard(i);
        // Pfiff 5: steht schon seit +900 still, Reaktionszeit 0.
        s.Dribbeln(12000, 12900);
        s.Halten(12920, 14500);
        s.Pfiff(13000, 14500, 14500);

        var k = s.Berechne()!;
        Assert.Equal(300, k.ReaktionMedianMs!.Value, 3);
        Assert.Equal(1, k.StoppQuote, 3);
    }

    [Fact]
    public void Probepfiff_und_Pfiff_mit_Pause_werden_nicht_gewertet()
    {
        var mitProbe = new Spiel();
        mitProbe.Standard(0, probe: true);
        for (var i = 1; i < 5; i++) mitProbe.Standard(i);
        // Nur vier gewertete Pfiffe: zu wenig für eine Aussage.
        Assert.Null(mitProbe.Berechne());

        var mitPause = FuenfSaubere();
        Assert.Null(Inhibition.Berechne(
            mitPause.Blob(), mitPause.Extra(pausen: """[{"vonMs":1500,"bisMs":null}]"""), "mouse", true));
    }

    [Fact]
    public void Wege_werden_mit_k_in_Buehnenpixel_umgerechnet()
    {
        // Bei k = 2 ist der Ruheradius 8 CSS-Pixel: der letzte 5-Pixel-Schritt bei +1300 gilt
        // schon als Stillstand, die Reaktionszeit ist 280. Davor liegen 15 Schritte, also
        // 75 CSS-Pixel oder 37,5 Bühnen-Pixel Nachlauf.
        var k = FuenfSaubere().Berechne(k: 2)!;

        Assert.Equal(280, k.ReaktionMedianMs!.Value, 3);
        Assert.Equal(37.5, k.NachlaufMedian!.Value, 3);
    }

    [Fact]
    public void Zittern_innerhalb_des_Ruheradius_gilt_als_Stillstand()
    {
        // Nach dem Stopp wackelt die Spitze um 3 Pixel hin und her (Ruheradius 4).
        var s = new Spiel();
        for (var i = 0; i < 5; i++)
        {
            var b = 3000 * i;
            s.Dribbeln(b, b + 1300);
            var x = s.Punkte[^1].X;
            for (var t = b + 1320; t <= b + 2500; t += 20)
                s.Punkte.Add((t, x + (t % 40 == 0 ? 3 : 0), 100, 0.5f));
            s.Pfiff(b + 1000, b + 2500, b + 2500);
        }

        var k = s.Berechne(geraet: "pen", synthetisch: false)!;
        Assert.Equal(300, k.ReaktionMedianMs!.Value, 3);
        Assert.Equal(3, k.HalteausschlagMedian!.Value, 3);
        Assert.Equal(0, k.Fehlstarts);
    }

    [Fact]
    public void Halteausschlag_und_Haltedruck_nur_mit_echtem_Stift()
    {
        var s = new Spiel();
        // Weiter auseinander als sonst: die zwei Sekunden vor dem Pfiff sollen nur Dribbeln
        // enthalten, nicht das Halten des vorigen Pfiffs.
        for (var i = 0; i < 5; i++)
        {
            var b = 5000 * i;
            s.Dribbeln(b, b + 1300, druck: 0.4f);
            s.Halten(b + 1320, b + 2500, druck: 0.6f);
            s.Pfiff(b + 1000, b + 2500, b + 2500);
        }

        var maus = s.Berechne(geraet: "mouse", synthetisch: true)!;
        Assert.Null(maus.HalteausschlagMedian);
        Assert.Null(maus.HaltedruckVerhaeltnis);

        var stift = s.Berechne(geraet: "pen", synthetisch: false)!;
        Assert.Equal(0, stift.HalteausschlagMedian!.Value, 3);
        // Haltedruck 0,6 gegen 0,4 vorher — beim Halten fester gedrückt. Der Stillstandspunkt
        // selbst (0,4) zählt zum Halten, deshalb etwas unter 1,5.
        Assert.InRange(stift.HaltedruckVerhaeltnis!.Value, 1.4, 1.5);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("kein json")]
    [InlineData("{}")]
    [InlineData("""{"cssPxProBuehnenPx":1e999,"pfiffe":[]}""")]
    [InlineData("""{"cssPxProBuehnenPx":0,"pfiffe":[]}""")]
    [InlineData("""{"cssPxProBuehnenPx":1,"pfiffe":3}""")]
    [InlineData("""{"cssPxProBuehnenPx":1,"pfiffe":[{"probe":false,"stoppMs":"bald","endeMs":5,"ende":"doppelpfiff"}]}""")]
    [InlineData("""{"cssPxProBuehnenPx":1,"pfiffe":[{"probe":false,"stoppMs":1e999,"endeMs":1e999,"ende":"doppelpfiff"}]}""")]
    [InlineData("""{"cssPxProBuehnenPx":1,"pfiffe":[],"pausen":[{"bisMs":3}]}""")]
    public void Kaputtes_extra_gibt_null_statt_einer_Ausnahme(string? extra)
    {
        Assert.Null(Inhibition.Berechne(FuenfSaubere().Blob(), extra, "pen", false));
    }

    [Fact]
    public void Ohne_Rohdaten_und_mit_unendlichen_Abtastungen_stuerzt_nichts_ab()
    {
        var s = FuenfSaubere();
        Assert.Null(Inhibition.Berechne(null, s.Extra(), "pen", false));
        Assert.Null(Inhibition.Berechne([], s.Extra(), "pen", false));

        // Eine kaputte Abtastung mitten im Halten wird übersprungen.
        s.Punkte.Insert(80, (1400, float.PositiveInfinity, float.NaN, 0.5f));
        Assert.Equal(300, s.Berechne()!.ReaktionMedianMs!.Value, 3);
    }
}
