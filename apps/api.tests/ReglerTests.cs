using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Die Regler stehen im freien <c>extra</c>. Ältere Ergebnisse haben sie nicht, und ein kaputter
/// Text darf den Verlauf nicht ausfallen lassen.
/// </summary>
public class ReglerTests
{
    [Fact]
    public void Liest_die_Regler_neben_anderen_Feldern()
    {
        var r = Regler.Lies(
            """{"runden":4,"regler":{"toleranz":1.5,"zielgeschwindigkeit":0.8,"mindesttrefferquote":0.7}}""");

        Assert.Equal(new ReglerWerte(1.5, 0.8, 0.7), r);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("kein json")]
    [InlineData("null")]
    [InlineData("[1,2]")]
    [InlineData("\"text\"")]
    [InlineData("{}")]
    [InlineData("""{"regler":null}""")]
    [InlineData("""{"regler":5}""")]
    [InlineData("""{"regler":{"toleranz":1}}""")]
    [InlineData("""{"regler":{"toleranz":"1","zielgeschwindigkeit":1,"mindesttrefferquote":0.5}}""")]
    [InlineData("""{"regler":{"toleranz":1e999,"zielgeschwindigkeit":1,"mindesttrefferquote":0.5}}""")]
    public void Fehlende_oder_kaputte_Regler_ergeben_null(string? extra)
    {
        Assert.Null(Regler.Lies(extra));
    }
}
