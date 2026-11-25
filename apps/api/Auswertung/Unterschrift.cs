using System.Text.Json;

namespace TravelKickers.Api.Auswertung;

/// <summary>
/// Die Form der Schrift bei der Urkunde. Alle Längen sind relativ zur Bandhöhe, damit Bildschirm
/// und Stufe keine Rolle spielen. <c>Schraeglage</c> ist positiv, wenn die Schrift nach rechts
/// ansteigt.
/// </summary>
public record UnterschriftKennzahl(
    double Hoehe,
    double Breite,
    double Grundlinienabweichung,
    double Schraeglage,
    int Neustarts);

/// <summary>
/// Auswertung der Urkunden-Unterschrift. Liest das spielspezifische <c>extra</c> der Urkunde; den
/// Teil, den jedes Spiel mitschickt, liest <see cref="Regler"/>.
///
/// Das <c>extra</c> kommt als JSON-Text; das Format steht in Ticket #3. Gebraucht werden
/// <c>band</c> (Koordinaten wie die Rohdaten) und <c>neustartsMs</c>.
/// Die Grundlinie ist die Unterkante des Bands — das <c>extra</c> enthält keine eigene Linie.
/// </summary>
public static class Unterschrift
{
    /// <summary>Gibt <c>null</c> zurück, wenn kein lesbares Band da ist oder nichts geschrieben
    /// wurde. Dann gibt es nur die Standardkennzahlen.</summary>
    public static UnterschriftKennzahl? Berechne(byte[] blob, string? extra)
    {
        if (!LiesExtra(extra, out var bandY, out var bandHoehe, out var neustarts))
            return null;

        // Nur der letzte Versuch zählt: alles ab dem letzten Neustart.
        var ab = neustarts.Count == 0 ? 0 : neustarts.Max();
        var alle = Kennzahlen.Lies(blob).Where(p => p.T >= ab).ToList();
        var punkte = alle.Where(p => p.Druck > 0).ToList();
        if (punkte.Count == 0) return null;

        var hoehe = (punkte.Max(p => p.Y) - punkte.Min(p => p.Y)) / bandHoehe;
        var breite = (punkte.Max(p => p.X) - punkte.Min(p => p.X)) / bandHoehe;

        // Je Strich der tiefste Punkt. Y wächst auf dem Bildschirm nach unten, tief = großes Y.
        // Ein Strich endet, sobald eine Abtastung mit Druck 0 kommt (Stift abgesetzt).
        var tiefpunkte = new List<Abtastung>();
        Abtastung? tiefster = null;
        foreach (var p in alle)
        {
            if (p.Druck > 0)
            {
                if (tiefster is null || p.Y > tiefster.Value.Y) tiefster = p;
            }
            else if (tiefster is not null)
            {
                tiefpunkte.Add(tiefster.Value);
                tiefster = null;
            }
        }
        if (tiefster is not null) tiefpunkte.Add(tiefster.Value);

        var grundlinie = bandY + bandHoehe;
        var abweichung = tiefpunkte.Average(p => Math.Abs(p.Y - grundlinie)) / bandHoehe;

        return new UnterschriftKennzahl(hoehe, breite, abweichung, Schraeglage(tiefpunkte), neustarts.Count);
    }

    /// <summary>Steigung der Regressionsgeraden durch die Tiefpunkte, in Grad. Bei weniger als
    /// zwei Punkten oder gleichem X gibt es keine Gerade: dann 0.</summary>
    private static double Schraeglage(List<Abtastung> punkte)
    {
        if (punkte.Count < 2) return 0;

        var mx = punkte.Average(p => (double)p.X);
        var my = punkte.Average(p => (double)p.Y);
        var nenner = punkte.Sum(p => (p.X - mx) * (p.X - mx));
        if (nenner == 0) return 0;

        var steigung = punkte.Sum(p => (p.X - mx) * (p.Y - my)) / nenner;

        // Minus, weil Y nach unten wächst: sinkendes Y heißt „steigt nach oben".
        return -Math.Atan(steigung) * 180 / Math.PI;
    }

    private static bool LiesExtra(
        string? extra, out double bandY, out double bandHoehe, out List<double> neustarts)
    {
        bandY = 0;
        bandHoehe = 0;
        neustarts = [];
        if (string.IsNullOrWhiteSpace(extra)) return false;

        try
        {
            using var dok = JsonDocument.Parse(extra);
            var wurzel = dok.RootElement;

            if (!wurzel.TryGetProperty("band", out var band)) return false;
            if (!band.TryGetProperty("y", out var y) || !y.TryGetDouble(out bandY)) return false;
            if (!band.TryGetProperty("hoehe", out var h) || !h.TryGetDouble(out bandHoehe)) return false;
            // Wie in Regler.cs: 1e999 wird zu „unendlich" und ließe sich nicht als JSON schreiben.
            if (!double.IsFinite(bandY) || !double.IsFinite(bandHoehe) || bandHoehe <= 0) return false;

            if (wurzel.TryGetProperty("neustartsMs", out var liste))
                foreach (var n in liste.EnumerateArray())
                    neustarts.Add(n.GetDouble());

            return true;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or FormatException)
        {
            // Ungültiges extra ist kein Serverfehler: die Urkunde hat dann nur die Standardwerte.
            return false;
        }
    }
}
