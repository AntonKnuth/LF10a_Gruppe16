namespace TravelKickers.Api.Auswertung;

/// <summary>Eine Abtastung der Stiftbewegung. <c>T</c> ist Millisekunden seit Segmentstart.</summary>
public readonly record struct Abtastung(float T, float X, float Y, float Druck);

/// <summary>
/// Die <b>maßgeblichen</b> Kennzahlen. Anders als die Zahlen in <c>Spielergebnis</c>, die im
/// Browser für das Sofortfeedback aus A1 entstehen, werden diese hier aus der Rohdaten-Punktfolge
/// gerechnet — und nur diese dürfen in einen Bericht.
/// </summary>
public record Kennzahl(
    int Punkte,
    double DauerMs,
    double Weglaenge,
    double TempoMittel,
    double TempoStreuung,
    double Zittern,
    double DruckMittel,
    double DruckStreuung,
    int Absetzer);

/// <summary>
/// Auswertung der Rohdaten. Reine Rechenklasse: kein EF, kein HTTP, keine Datenbank — deshalb
/// mit xUnit prüfbar, und deshalb steht sie in einer eigenen Datei.
///
/// <b>Blob-Format</b> (verbindlich, das Frontend muss genauso schreiben):
/// vier <c>Float32</c> je Abtastung in dieser Reihenfolge — <c>t</c> (Millisekunden seit
/// Segmentstart), <c>x</c>, <c>y</c>, <c>druck</c> (0 bis 1). Little-endian, ohne Kopf.
/// Der Nullpunkt ist der Segmentstart und nicht der Sitzungsstart: dadurch bleibt jeder Blob für
/// sich auswertbar, auch wenn die Einheit unterbrochen wurde.
/// </summary>
public static class Kennzahlen
{
    /// <summary>t, x, y, druck.</summary>
    public const int WerteJeAbtastung = 4;

    private const int BytesJeAbtastung = WerteJeAbtastung * sizeof(float);

    public static IReadOnlyList<Abtastung> Lies(byte[] blob)
    {
        var anzahl = blob.Length / BytesJeAbtastung;
        var punkte = new Abtastung[anzahl];

        for (var i = 0; i < anzahl; i++)
        {
            var start = i * BytesJeAbtastung;
            punkte[i] = new Abtastung(
                BitConverter.ToSingle(blob, start),
                BitConverter.ToSingle(blob, start + 4),
                BitConverter.ToSingle(blob, start + 8),
                BitConverter.ToSingle(blob, start + 12));
        }

        return punkte;
    }

    /// <summary>Gibt <c>null</c> zurück, wenn zu wenige Punkte für eine Aussage da sind. Lieber
    /// keine Zahl als eine erfundene — ein Bericht mit leeren Feldern ist ehrlich, ein Bericht
    /// mit ausgedachten Werten nicht.</summary>
    public static Kennzahl? Berechne(byte[] blob)
    {
        var p = Lies(blob);
        if (p.Count < 2) return null;

        var strecken = new List<double>();
        var tempi = new List<double>();
        var winkel = new List<double>();
        var absetzer = 0;

        for (var i = 1; i < p.Count; i++)
        {
            if (p[i - 1].Druck > 0 && p[i].Druck <= 0) absetzer++;

            // Nur Bewegung mit aufgesetztem Stift zählt. Der Weg durch die Luft zwischen zwei
            // Strichen ist keine Schreibbewegung und würde Tempo und Weglänge verfälschen.
            if (p[i - 1].Druck <= 0 || p[i].Druck <= 0) continue;

            // Für Mathematiker: Satz des Pythagoras, um die Hypothenuse zu berechnen
            var dx = p[i].X - p[i - 1].X;
            var dy = p[i].Y - p[i - 1].Y;
            var strecke = Math.Sqrt(dx * dx + dy * dy);
            var dt = p[i].T - p[i - 1].T;

            strecken.Add(strecke);
            if (dt > 0) tempi.Add(strecke / (dt / 1000.0));

            // Zittern: wie stark die Richtung von einer Abtastung zur nächsten springt.
            // Eine ruhige Linie ändert die Richtung kaum, eine zittrige ständig.
            if (i >= 2 && p[i - 2].Druck > 0 && strecke > 0)
            {
                var vx = p[i - 1].X - p[i - 2].X;
                var vy = p[i - 1].Y - p[i - 2].Y;
                if (vx != 0 || vy != 0)
                {
                    var a = Math.Atan2(dy, dx) - Math.Atan2(vy, vx);
                    // Auf -180°..180° normieren, sonst zählt jede Richtungsumkehr doppelt.
                    // Hier wird Bogenmaß in Grad umgerechnet 
                    while (a > Math.PI) a -= 2 * Math.PI;
                    while (a < -Math.PI) a += 2 * Math.PI;
                    winkel.Add(Math.Abs(a) * 180 / Math.PI);
                }
            }
        }

        var druecke = p.Where(x => x.Druck > 0).Select(x => (double)x.Druck).ToList();

        return new Kennzahl(
            Punkte: p.Count,
            DauerMs: p[^1].T - p[0].T,
            Weglaenge: strecken.Sum(),
            TempoMittel: Mittel(tempi),
            TempoStreuung: Streuung(tempi),
            Zittern: Mittel(winkel),
            DruckMittel: Mittel(druecke),
            DruckStreuung: Streuung(druecke),
            Absetzer: absetzer);
    }

    private static double Mittel(IReadOnlyCollection<double> werte) =>
        werte.Count == 0 ? 0 : werte.Sum() / werte.Count; //TODO: linq.Average() macht die Berechnung leichter

    private static double Streuung(IReadOnlyCollection<double> werte)
    {
        if (werte.Count < 2) return 0;
        var m = Mittel(werte);
        return Math.Sqrt(werte.Sum(w => (w - m) * (w - m)) / werte.Count); //Ich gucke nach einer Funktion, die die Berechnung für uns leichter macht
    }
}
