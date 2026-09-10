namespace TravelKickers.Api.Auswertung;

/// <summary>Wozu ein Spiel im Tagesablauf dient.</summary>
public enum Rolle
{
    Aufwaermen,
    Normal,
    /// <summary>Das Abschiedsgeschenk am letzten Tag eines Vereins.</summary>
    Sonder,
}

/// <summary>
/// Was der Server über die Minispiele wissen muss: ihre Rolle und ihre Fähigkeitsbereiche.
///
/// <b>Rollen</b> braucht die Prüfung beim Speichern — sind weniger Spiele einer Rolle aktiv als
/// Plätze eingestellt, bliebe der Tagesplan lückenhaft, also lehnt der Server die Einstellung ab.
///
/// <b>Fähigkeitsbereiche</b> braucht der Wochenbericht (CLAUDE.md: „Kategorie-Tags … für die
/// Auswertung nach Fähigkeitsbereich"). Die Zusammenfassung ist Auswertung, und die gehört nach
/// C# — die Therapeuten-App bleibt dadurch reine Anzeige.
///
/// <b>Wenn ein neues Minispiel dazukommt, muss es hier und in
/// <c>apps/web/src/spiele/katalog.ts</c> eingetragen werden.</b> Vergisst man es hier,
/// verschwindet es nicht still: es zählt als normales Spiel ohne Bereich, landet im Bericht
/// unter „Ohne Zuordnung" und ein Hinweis sagt es.
/// </summary>
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
        ["brezelverkauf"] = new(Rolle.Normal, ["gerade-striche", "hand-auge"]),
        ["ballhochhalten"] = new(Rolle.Normal, ["hand-auge", "druckdosierung"]),
        ["abschiedsgeschenk"] = new(Rolle.Sonder, ["schreiben"]),
    };

    /// <summary>Alle bekannten Spiel-IDs in Katalogreihenfolge. Daraus legt der Seed die
    /// Einstellungszeilen an — eine zweite Liste im Seed würde beim nächsten neuen Spiel
    /// auseinanderlaufen.</summary>
    public static IReadOnlyList<string> AlleIds => [.. Spiele.Keys];

    public static IReadOnlyList<string> KategorienFuer(string spielId) =>
        Spiele.TryGetValue(spielId, out var e) ? e.Kategorien : [OhneZuordnung];

    /// <summary>Unbekannte Spiele gelten als normale Übung — die Rolle mit den wenigsten
    /// Sonderregeln.</summary>
    public static Rolle RolleFuer(string spielId) =>
        Spiele.TryGetValue(spielId, out var e) ? e.Rolle : Rolle.Normal;
}
