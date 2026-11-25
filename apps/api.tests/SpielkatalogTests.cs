using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Tests;

public class SpielkatalogTests
{
    [Theory]
    [InlineData("ballhochhalten", "hand-auge", "druckdosierung")]
    [InlineData("rasenmaehen", "druckdosierung")]
    [InlineData("linie", "gerade-striche")]
    [InlineData("autogramme", "schreiben", "pinzettengriff")]
    public void Bekannte_Spiele_tragen_ihre_Faehigkeitsbereiche(string spielId, params string[] erwartet)
    {
        Assert.Equal(erwartet, Spielkatalog.KategorienFuer(spielId));
    }

    /// <summary>
    /// Der wichtige Fall: ein neues Minispiel, das jemand hier einzutragen vergessen hat, darf
    /// aus dem Bericht nicht verschwinden. Es landet sichtbar unter „ohne Zuordnung", und der
    /// Wochenbericht schreibt einen Hinweis dazu.
    /// </summary>
    [Theory]
    [InlineData("aufwaermen", Rolle.Aufwaermen)]
    [InlineData("linie", Rolle.Normal)]
    [InlineData("abschiedsgeschenk", Rolle.Sonder)]
    public void Spiele_tragen_ihre_Rolle(string spielId, Rolle erwartet)
    {
        Assert.Equal(erwartet, Spielkatalog.RolleFuer(spielId));
    }

    [Fact]
    public void Unbekanntes_Spiel_verschwindet_nicht_sondern_faellt_auf()
    {
        var tags = Spielkatalog.KategorienFuer("gibtsnochnicht");

        Assert.Equal([Spielkatalog.OhneZuordnung], tags);
        Assert.NotEmpty(tags);
    }
}
