namespace TravelKickers.Api.Auswertung;

//Wozu ein Spiel im Tagesablauf dient.
public enum Rolle
{
    Aufwaermen,
    Normal,
    //Das Abschiedsgeschenk am letzten Tag eines Vereins.
    Sonder,
}

// Was der Server über die Minispiele wissen muss: ihre Rolle und ihre Fähigkeitsbereiche.
// Fähigkeitsbereiche braucht der Wochenbericht.

public static class Spielkatalog
{
    public const string OhneZuordnung = "ohne-zuordnung";

    private record Eintrag(Rolle Rolle, string[] Kategorien);

    private static readonly Dictionary<string, Eintrag> Spiele = new()
    {
        ["aufwaermen"] = new(Rolle.Aufwaermen, ["wellen", "hand-auge"]),
        ["linie"] = new(Rolle.Normal, ["gerade-striche"]),
        ["autogramme"] = new(Rolle.Normal, ["schreiben", "pinzettengriff"]),
        ["rasenmaehen"] = new(Rolle.Normal, ["druckdosierung"]),
        ["stationentour"] = new(Rolle.Normal, ["schreiben", "druckdosierung"]),
        ["startelf"] = new(Rolle.Normal, ["schreiben"]),
        ["elfmeter"] = new(Rolle.Normal, ["hand-auge", "druckdosierung"]),
        ["dribbeln"] = new(Rolle.Normal, ["inhibition", "wellen"]),
        ["ballhochhalten"] = new(Rolle.Normal, ["hand-auge", "druckdosierung"]),
        ["abschiedsgeschenk"] = new(Rolle.Sonder, ["schreiben"]),
    };

    public static IReadOnlyList<string> KategorienFuer(string spielId) =>
        Spiele.TryGetValue(spielId, out var e) ? e.Kategorien : [OhneZuordnung];

    //Unbekannte Spiele gelten als normale Übung — die Rolle mit den wenigsten
    // Sonderregeln.
    public static Rolle RolleFuer(string spielId) =>
        Spiele.TryGetValue(spielId, out var e) ? e.Rolle : Rolle.Normal;
}
