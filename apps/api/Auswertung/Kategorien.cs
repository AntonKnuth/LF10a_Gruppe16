namespace TravelKickers.Api.Auswertung;

/// <summary>
/// Fähigkeitsbereiche je Minispiel.
///
/// CLAUDE.md: „Zusätzlich Kategorie-Tags je Spiel, mehrere pro Spiel möglich, für die Auswertung
/// nach Fähigkeitsbereich." Ohne sie lässt sich im Bericht nur ablesen, *welche* Übung Ben
/// gemacht hat — nicht, ob sich seine Druckdosierung verbessert.
///
/// <b>Warum hier und nicht im Frontend:</b> die Tags stehen zwar auch in
/// <c>apps/web/src/spiele/index.ts</c>, aber die Zusammenfassung ist Auswertung, und die gehört
/// laut Techstack nach C#. Die Therapeuten-App bleibt dadurch reine Anzeige.
///
/// <b>Wenn ein neues Minispiel dazukommt, muss es hier eingetragen werden.</b> Vergisst man das,
/// verschwindet es nicht still: es landet unter <see cref="OhneZuordnung"/> und fällt im Bericht
/// sofort auf.
/// </summary>
public static class Kategorien
{
    public const string OhneZuordnung = "ohne-zuordnung";

    private static readonly Dictionary<string, string[]> ProSpiel = new()
    {
        ["aufwaermen"] = ["wellen", "hand-auge"],
        ["linie"] = ["gerade-striche"],
        ["autogramme"] = ["schreiben", "pinzettengriff"],
        ["rasenmaehen"] = ["druckdosierung"],
        ["stationentour"] = ["schreiben", "druckdosierung"],
        ["startelf"] = ["schreiben"],
        ["elfmeter"] = ["hand-auge", "druckdosierung"],
        ["dribbeln"] = ["inhibition", "wellen"],
        ["ballhochhalten"] = ["hand-auge", "druckdosierung"],
        ["abschiedsgeschenk"] = ["schreiben"],
    };

    public static IReadOnlyList<string> Fuer(string spielId) =>
        ProSpiel.TryGetValue(spielId, out var tags) ? tags : [OhneZuordnung];
}
