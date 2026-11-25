using System.Text.Json;

namespace TravelKickers.Api.Auswertung;

/// <summary>Die drei Regler aus B1, so wie sie bei einer Übung galten.</summary>
public record ReglerWerte(double Toleranz, double Zielgeschwindigkeit, double Mindesttrefferquote);

/// <summary>
/// Liest die verwendeten Regler aus dem <c>extra</c> eines Spielergebnisses. Die Kind-App schreibt
/// sie bei jedem Spiel dort hinein (<c>SpielScreen.tsx</c>). Maßgeblich sind diese Werte und nicht
/// die heutigen Einstellungen: der Therapeut kann sie seitdem geändert haben.
/// </summary>
public static class Regler
{
    /// <summary>Gibt <c>null</c> zurück, wenn die Regler fehlen (Ergebnisse von früher) oder nicht
    /// lesbar sind. Ein kaputtes <c>extra</c> darf den ganzen Verlauf nicht ausfallen lassen.</summary>
    public static ReglerWerte? Lies(string? extra)
    {
        if (string.IsNullOrWhiteSpace(extra)) return null;

        try
        {
            using var dok = JsonDocument.Parse(extra);
            var regler = dok.RootElement.GetProperty("regler");

            var werte = new ReglerWerte(
                regler.GetProperty("toleranz").GetDouble(),
                regler.GetProperty("zielgeschwindigkeit").GetDouble(),
                regler.GetProperty("mindesttrefferquote").GetDouble());

            // Eine Zahl wie 1e999 wird beim Lesen zu „unendlich". Die lässt sich nicht wieder als
            // JSON schreiben, die Antwort des Servers bräche also erst ganz am Ende ab.
            return double.IsFinite(werte.Toleranz)
                && double.IsFinite(werte.Zielgeschwindigkeit)
                && double.IsFinite(werte.Mindesttrefferquote)
                    ? werte
                    : null;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException
            or KeyNotFoundException or FormatException)
        {
            // Der Reihe nach: kein JSON, falscher Typ, Feld fehlt, keine lesbare Zahl.
            return null;
        }
    }
}
