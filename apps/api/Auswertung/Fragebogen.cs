using System.Text.Json;

namespace TravelKickers.Api.Auswertung;

/// <summary>Wie oft welche Antwort auf „Wie war das Training heute?" kam.</summary>
public record FragebogenZeile(int Gut, int Mittel, int Schwer);

/// <summary>
/// Der Abschluss-Fragebogen (C3). Er hat keine eigene Spalte: Ben antwortet mit denselben drei
/// Smileys wie nach jeder Übung, und die Antwort steht als <c>selbsteinschaetzung</c> im
/// Ereignisprotokoll. Die Einschätzungen der Übungen kommen zuerst, der Fragebogen zuletzt.
/// </summary>
public static class Fragebogen
{
    /// <summary>
    /// Die Antwort einer Einheit (1 bis 3) oder <c>null</c>, wenn es keine gibt.
    /// </summary>
    /// <param name="nutzlasten">Die Nutzlasten der <c>selbsteinschaetzung</c>-Ereignisse in der
    /// Reihenfolge des Protokolls.</param>
    public static int? Antwort(string status, int anzahlUebungen, IReadOnlyList<string?> nutzlasten)
    {
        // Nur eine fertige Einheit hat den Fragebogen erreicht. Bei einer abgebrochenen gehört die
        // letzte Einschätzung zur letzten Übung.
        if (status != "fertig") return null;

        // Je Übung eine Einschätzung, und eine mehr für den Fragebogen. Sind es nicht mehr als
        // Übungen, fehlt der Fragebogen — die letzte Antwort gehört dann zu einer Übung.
        if (nutzlasten.Count <= anzahlUebungen) return null;

        return LiesWert(nutzlasten[^1]);
    }

    public static FragebogenZeile Zaehle(IReadOnlyCollection<int?> antworten) => new(
        Gut: antworten.Count(a => a == 3),
        Mittel: antworten.Count(a => a == 2),
        Schwer: antworten.Count(a => a == 1));

    private static int? LiesWert(string? nutzlast)
    {
        if (string.IsNullOrWhiteSpace(nutzlast)) return null;

        try
        {
            using var dok = JsonDocument.Parse(nutzlast);
            var wert = dok.RootElement.GetProperty("wert").GetInt32();
            return wert is >= 1 and <= 3 ? wert : null;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException
            or KeyNotFoundException or FormatException)
        {
            // Eine unlesbare Antwort zählt nicht mit, der Bericht kommt trotzdem.
            return null;
        }
    }
}
