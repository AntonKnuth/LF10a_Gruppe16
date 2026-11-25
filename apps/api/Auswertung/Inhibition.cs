using System.Text.Json;

namespace TravelKickers.Api.Auswertung;

/// <summary>
/// Die Kennzahlen zur Impulskontrolle aus „Dribbeln mit Pfiff". Zeiten in Millisekunden, Wege in
/// Bühnen-Pixeln (die Bühne des Spiels ist 900 breit), damit die Bildschirmgröße keine Rolle
/// spielt. <c>StoppQuote</c> ist ein Anteil von 0 bis 1 und gehört deshalb nur in den
/// Therapeutenbereich (C4).
/// </summary>
public record InhibitionKennzahl(
    int Gewertet,
    double? ReaktionMedianMs,
    double? ReaktionStreuungMs,
    int NichtAngehalten,
    double? NachlaufMedian,
    double? HalteausschlagMedian,
    int Abheber,
    int Fehlstarts,
    double StoppQuote,
    double? HaltedruckVerhaeltnis);

/// <summary>Was an einem einzelnen Pfiff gemessen wurde. <c>null</c> heißt „nicht messbar",
/// zum Beispiel keine Reaktionszeit, weil Ben gar nicht angehalten hat.</summary>
public record PfiffMessung(
    double? ReaktionMs,
    double? Nachlauf,
    double? Halteausschlag,
    bool Abgehoben,
    bool Fehlstart,
    double? HaltedruckVerhaeltnis);

/// <summary>
/// Auswertung von „Dribbeln mit Pfiff" (Konzept: docs/spielkonzepte/dribbeln.md, Abschnitt 4.3).
/// Reine Rechenklasse wie <see cref="Unterschrift"/>: kein EF, kein HTTP.
///
/// Das Spiel schreibt im <c>extra</c> je Pfiff die Zeiten auf der Rohdaten-Uhr: <c>stoppMs</c>
/// (Pfiff), <c>doppelMs</c> (Doppelpfiff, sonst null), <c>endeMs</c> und <c>ende</c>. Was das
/// Spiel selbst bewertet hat (<c>gestopptMs</c>, <c>rechtzeitig</c>, <c>fehlstart</c>), ist
/// unmaßgeblich und wird hier <b>nicht</b> gelesen — gemessen wird nur an der Punktfolge.
///
/// <b>Definitionen.</b> S = Pfiff, E = Ende des Pfiffs, k = <c>cssPxProBuehnenPx</c> (die Rohdaten
/// sind CSS-Pixel). <c>pos(t)</c> ist die letzte Abtastung bei oder vor t: ein ruhender Stift
/// schickt kaum Ereignisse, eine Lücke heißt also „keine Bewegung", nicht „keine Daten".
/// <list type="bullet">
/// <item><b>Gewertet</b> wird ein Pfiff, der kein Probepfiff ist, mit Doppelpfiff oder Abheben
///   endete, in dessen Zeit keine Pause fällt und vor dem es eine Abtastung gibt.</item>
/// <item><b>Reaktionszeit</b>: der früheste Zeitpunkt c ab S (S selbst oder eine Abtastung bis E),
///   ab dem die Spitze <see cref="RuhefensterMs"/> lang aufliegt und höchstens
///   <see cref="Ruheradius"/> von pos(c) abweicht; Reaktionszeit = c − S. Gibt es kein c, hat Ben
///   nicht angehalten. Unter <see cref="UntergrenzeMs"/> stand er schon beim Pfiff — das ist
///   keine Reaktion und geht nicht in den Median.</item>
/// <item><b>Nachlauf</b>: Weg der aufliegenden Spitze vom Pfiff bis zum Stillstand.</item>
/// <item><b>Halteausschlag</b>: größter Abstand zum Ruhepunkt vom Stillstand bis E, bis zum ersten
///   Abheben. Nur mit echtem Stift — eine stillgehaltene Maus wackelt nie.</item>
/// <item><b>Abheben</b>: eine Abtastung mit Druck 0 zwischen S und E.</item>
/// <item><b>Fehlstart</b>: nach dem Stillstand und vor dem Doppelpfiff entfernt sich die
///   aufliegende Spitze weiter als <see cref="Fehlstartradius"/> vom Ruhepunkt.</item>
/// <item><b>Stoppquote</b>: Anteil der gewerteten Pfiffe mit Reaktionszeit bis
///   <see cref="FristMs"/>, ohne Abheben und ohne Fehlstart.</item>
/// <item><b>Haltedruck-Verhältnis</b>: mittlerer Druck beim Halten geteilt durch den in den zwei
///   Sekunden vor dem Pfiff. Deutlich über 1 heißt: beim Halten wird fester gedrückt
///   (Verkrampfung, B3). Nur mit echtem Stift, Tastaturdruck ist ausgedacht.</item>
/// </list>
///
/// <b>Die Schwellen hängen nicht von der Stufe ab.</b> Die Stufe bestimmt, was das Spiel als
/// gestoppt gelten lässt; die Messung bleibt gleich, sonst verschöbe ein Stufenwechsel die
/// Reaktionszeit, ohne dass Ben sich verändert hat.
/// </summary>
public static class Inhibition
{
    /// <summary>Nur dieses Spiel schreibt Pfiffe ins extra.</summary>
    public const string SpielId = "dribbeln";

    /// <summary>Der Fähigkeitsbereich, unter dem der Wochenbericht die Kennzahlen zeigt.</summary>
    public const string Kategorie = "inhibition";

    /// <summary>In Bühnen-Pixeln.</summary>
    public const double Ruheradius = 4;
    public const double RuhefensterMs = 200;
    /// <summary>In Bühnen-Pixeln.</summary>
    public const double Fehlstartradius = 12;
    public const double FristMs = 1000;
    public const double UntergrenzeMs = 100;
    /// <summary>Für das Haltedruck-Verhältnis: so lange vor dem Pfiff gilt als normaler Druck.</summary>
    public const double VorlaufMs = 2000;

    /// <summary>
    /// Die Uhr des Spiels startet ein paar Millisekunden nach der Uhr der Aufzeichnung (beide
    /// beim ersten Anzeigen, das Spiel einen Renderdurchgang später). Das Abheben, mit dem ein
    /// Pfiff endet, liegt in den Rohdaten deshalb knapp hinter E — ohne diesen Spielraum fiele
    /// es aus dem Fenster.
    /// </summary>
    public const double VersatzMs = 50;

    /// <summary>Unter so vielen gewerteten Pfiffen kommt <c>null</c>: eine Reaktionszeit aus zwei
    /// Pfiffen ist Zufall. Grund wie in <see cref="Kennzahlen.Berechne"/>.</summary>
    public const int MindestPfiffe = 5;

    private record Pfiff(bool Probe, double StoppMs, double? DoppelMs, double EndeMs, string Ende);

    /// <summary>Kennzahlen eines Spiels. <c>null</c> ohne Rohdaten, ohne lesbares extra oder bei
    /// zu wenigen gewerteten Pfiffen.</summary>
    public static InhibitionKennzahl? Berechne(
        byte[]? blob, string? extra, string eingabegeraet, bool synthetischerDruck) =>
        Zusammenfassen(Messe(blob, extra, eingabegeraet, synthetischerDruck));

    /// <summary>Die Messung je gewertetem Pfiff. Getrennt von <see cref="Zusammenfassen"/>, damit
    /// der Wochenbericht alle Pfiffe einer Woche so zusammenfassen kann, als wären sie ein
    /// Spiel.</summary>
    public static List<PfiffMessung> Messe(
        byte[]? blob, string? extra, string eingabegeraet, bool synthetischerDruck)
    {
        var messungen = new List<PfiffMessung>();
        if (blob is null || !LiesExtra(extra, out var k, out var pfiffe, out var pausen))
            return messungen;

        // Kaputte Abtastungen (NaN, unendlich) werden übersprungen statt die Rechnung zu vergiften.
        var p = Kennzahlen.Lies(blob)
            .Where(a => float.IsFinite(a.T) && float.IsFinite(a.X) && float.IsFinite(a.Y)
                && float.IsFinite(a.Druck))
            .ToList();
        var echterStift = eingabegeraet == "pen" && !synthetischerDruck;

        foreach (var pfiff in pfiffe)
        {
            var s = pfiff.StoppMs;
            var e = pfiff.EndeMs;
            if (pfiff.Probe || (pfiff.Ende != "doppelpfiff" && pfiff.Ende != "abgehoben")) continue;
            // Für den Anhalte-Knopf hebt Ben ab — das ist kein Abheben im Sinne des Spiels.
            if (pausen.Any(z => z.Von <= e && z.Bis >= s)) continue;
            if (Position(p, s) is null) continue;

            messungen.Add(MessePfiff(p, pfiff, k, echterStift));
        }
        return messungen;
    }

    private static PfiffMessung MessePfiff(List<Abtastung> p, Pfiff pfiff, double k, bool echterStift)
    {
        var s = pfiff.StoppMs;
        var e = pfiff.EndeMs;

        var abgehoben = p.Any(a => a.T >= s && a.T <= e + VersatzMs && a.Druck <= 0);
        var reaktion = Reaktionszeit(p, s, e, k);
        if (reaktion is null)
            return new PfiffMessung(null, null, null, abgehoben, false, null);

        var still = s + reaktion.Value;
        var ruhe = Position(p, still)!.Value;

        double nachlauf = 0;
        for (var j = 1; j < p.Count; j++)
            if (p[j].T >= s && p[j].T <= still && p[j].Druck > 0 && p[j - 1].Druck > 0)
                nachlauf += Abstand(p[j], p[j - 1]) / k;

        // Bis zum ersten Abheben; danach liegt die Spitze nicht mehr auf dem Rasen. Ohne
        // Abtastung stand sie völlig still: dann ist der Ausschlag 0.
        double ausschlag = 0;
        foreach (var a in p.Where(a => a.T >= still && a.T <= e))
        {
            if (a.Druck <= 0) break;
            ausschlag = Math.Max(ausschlag, Abstand(a, ruhe) / k);
        }

        var bisSignal = pfiff.DoppelMs ?? e;
        var fehlstart = p.Any(a => a.T > still && a.T < bisSignal && a.Druck > 0
            && Abstand(a, ruhe) > Fehlstartradius * k);

        double? haltedruck = null;
        if (echterStift)
        {
            var halten = p.Where(a => a.T >= still && a.T <= e && a.Druck > 0).ToList();
            var vorher = p.Where(a => a.T >= s - VorlaufMs && a.T <= s && a.Druck > 0).ToList();
            if (halten.Count > 0 && vorher.Count > 0)
                haltedruck = halten.Average(a => a.Druck) / vorher.Average(a => a.Druck);
        }

        return new PfiffMessung(
            reaktion, nachlauf, echterStift ? ausschlag : null, abgehoben, fehlstart, haltedruck);
    }

    /// <summary>Der früheste Zeitpunkt c ab dem Pfiff, ab dem die Spitze ein ganzes Ruhefenster
    /// lang aufliegt und still steht. Gibt c − S zurück, oder <c>null</c>, wenn es keinen gibt.</summary>
    private static double? Reaktionszeit(List<Abtastung> p, double s, double e, double k)
    {
        var kandidaten = new List<double> { s };
        kandidaten.AddRange(p.Where(a => a.T > s && a.T < e).Select(a => (double)a.T));

        foreach (var c in kandidaten)
        {
            // Das Ruhefenster muss vor dem Ende des Pfiffs zu Ende sein.
            if (c + RuhefensterMs > e) break;

            var ruhe = Position(p, c);
            if (ruhe is null || ruhe.Value.Druck <= 0) continue;

            var stehtStill = p
                .Where(a => a.T > c && a.T <= c + RuhefensterMs)
                .All(a => a.Druck > 0 && Abstand(a, ruhe.Value) <= Ruheradius * k);
            if (stehtStill) return c - s;
        }
        return null;
    }

    /// <summary>Fasst die Messungen zusammen. Median statt Mittelwert: ein einziger verträumter
    /// Pfiff mit drei Sekunden soll die Reaktionszeit nicht verdoppeln.</summary>
    public static InhibitionKennzahl? Zusammenfassen(IReadOnlyCollection<PfiffMessung> m)
    {
        if (m.Count < MindestPfiffe) return null;

        var reaktionen = m.Where(x => x.ReaktionMs >= UntergrenzeMs)
            .Select(x => x.ReaktionMs!.Value).ToList();
        var sauber = m.Count(x => x.ReaktionMs <= FristMs && !x.Abgehoben && !x.Fehlstart);

        return new InhibitionKennzahl(
            Gewertet: m.Count,
            ReaktionMedianMs: Median(reaktionen),
            ReaktionStreuungMs: Streuung(reaktionen),
            NichtAngehalten: m.Count(x => x.ReaktionMs is null),
            NachlaufMedian: Median(m.Where(x => x.Nachlauf is not null).Select(x => x.Nachlauf!.Value).ToList()),
            HalteausschlagMedian: Median(m.Where(x => x.Halteausschlag is not null)
                .Select(x => x.Halteausschlag!.Value).ToList()),
            Abheber: m.Count(x => x.Abgehoben),
            Fehlstarts: m.Count(x => x.Fehlstart),
            StoppQuote: (double)sauber / m.Count,
            HaltedruckVerhaeltnis: Median(m.Where(x => x.HaltedruckVerhaeltnis is not null)
                .Select(x => x.HaltedruckVerhaeltnis!.Value).ToList()));
    }

    /// <summary>pos(t): die letzte Abtastung bei oder vor t.</summary>
    private static Abtastung? Position(List<Abtastung> p, double t)
    {
        Abtastung? letzte = null;
        foreach (var a in p)
        {
            if (a.T > t) break;
            letzte = a;
        }
        return letzte;
    }

    // Satz des Pythagoras, wie in Kennzahlen.cs.
    private static double Abstand(Abtastung a, Abtastung b)
    {
        var dx = a.X - b.X;
        var dy = a.Y - b.Y;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    private static double? Median(List<double> werte)
    {
        if (werte.Count == 0) return null;
        var sortiert = werte.Order().ToList();
        var mitte = sortiert.Count / 2;
        return sortiert.Count % 2 == 1 ? sortiert[mitte] : (sortiert[mitte - 1] + sortiert[mitte]) / 2;
    }

    /// <summary>Standardabweichung wie in <see cref="Kennzahlen"/>; aus einem Wert gibt es keine.</summary>
    private static double? Streuung(List<double> werte)
    {
        if (werte.Count < 2) return null;
        var m = werte.Average();
        return Math.Sqrt(werte.Sum(w => (w - m) * (w - m)) / werte.Count);
    }

    private static bool LiesExtra(
        string? extra, out double k, out List<Pfiff> pfiffe, out List<(double Von, double Bis)> pausen)
    {
        k = 0;
        pfiffe = [];
        pausen = [];
        if (string.IsNullOrWhiteSpace(extra)) return false;

        try
        {
            using var dok = JsonDocument.Parse(extra);
            var wurzel = dok.RootElement;

            if (!wurzel.TryGetProperty("cssPxProBuehnenPx", out var faktor) || !faktor.TryGetDouble(out k))
                return false;
            // Wie in Regler.cs: 1e999 wird beim Lesen zu „unendlich".
            if (!double.IsFinite(k) || k <= 0) return false;

            if (!wurzel.TryGetProperty("pfiffe", out var liste)) return false;
            foreach (var x in liste.EnumerateArray())
            {
                var stopp = x.GetProperty("stoppMs").GetDouble();
                var ende = x.GetProperty("endeMs").GetDouble();
                double? doppel = x.TryGetProperty("doppelMs", out var d) && d.ValueKind == JsonValueKind.Number
                    ? d.GetDouble()
                    : null;
                // Ein Pfiff mit unendlicher Zeit lässt sich nicht auf die Punktfolge legen.
                if (!double.IsFinite(stopp) || !double.IsFinite(ende)) continue;
                if (doppel is not null && !double.IsFinite(doppel.Value)) doppel = null;

                pfiffe.Add(new Pfiff(
                    x.GetProperty("probe").GetBoolean(), stopp, doppel, ende,
                    x.GetProperty("ende").GetString() ?? ""));
            }

            // Eine Pause ohne Ende lief bis zum Schluss des Spiels.
            if (wurzel.TryGetProperty("pausen", out var pausenListe))
                foreach (var x in pausenListe.EnumerateArray())
                {
                    var von = x.GetProperty("vonMs").GetDouble();
                    var bis = x.TryGetProperty("bisMs", out var b) && b.ValueKind == JsonValueKind.Number
                        ? b.GetDouble()
                        : double.PositiveInfinity;
                    // Eine unlesbare Pause macht alles ungültig: sonst würde ein Pfiff gewertet,
                    // bei dem Ben für den Anhalte-Knopf abgehoben hat.
                    if (double.IsNaN(von) || double.IsNaN(bis)) return false;
                    pausen.Add((von, bis));
                }

            return true;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException
            or KeyNotFoundException or FormatException)
        {
            // Ungültiges extra ist kein Serverfehler: das Spiel hat dann nur die Standardwerte.
            return false;
        }
    }
}
