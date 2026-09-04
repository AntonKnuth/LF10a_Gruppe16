using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Tests;

public class KategorienTests
{
    [Theory]
    [InlineData("ballhochhalten", "hand-auge", "druckdosierung")]
    [InlineData("rasenmaehen", "druckdosierung")]
    [InlineData("linie", "gerade-striche")]
    [InlineData("autogramme", "schreiben", "pinzettengriff")]
    public void Bekannte_Spiele_tragen_ihre_Faehigkeitsbereiche(string spielId, params string[] erwartet)
    {
        Assert.Equal(erwartet, Kategorien.Fuer(spielId));
    }

    /// <summary>
    /// Der wichtige Fall: ein neues Minispiel, das jemand hier einzutragen vergessen hat, darf
    /// aus dem Bericht nicht verschwinden. Es landet sichtbar unter „ohne Zuordnung", und der
    /// Wochenbericht schreibt einen Hinweis dazu.
    /// </summary>
    [Fact]
    public void Unbekanntes_Spiel_verschwindet_nicht_sondern_faellt_auf()
    {
        var tags = Kategorien.Fuer("gibtsnochnicht");

        Assert.Equal([Kategorien.OhneZuordnung], tags);
        Assert.NotEmpty(tags);
    }
}
