using Microsoft.EntityFrameworkCore;

namespace TravelKickers.Api.Daten;

public record RohdatenEingang(string Werte, int AbtastrateHz, int Anzahl);

public record ErgebnisEingang(
    Guid Id,
    string SpielId,
    int DauerMs,
    double Vollstaendigkeit,
    double Genauigkeit,
    double DruckMittel,
    double DruckStreuung,
    string Eingabegeraet,
    bool SynthetischerDruck,
    int Stufe,
    bool Abgebrochen,
    int? Selbsteinschaetzung,
    string? Extra,
    RohdatenEingang? Rohdaten);

public record EreignisEingang(int Folgenummer, string Art, long ZeitMs, string? Nutzlast);

public record SessionEingang(
    string VereinId,
    int Tag,
    long BegonnenAmMs,
    long? BeendetAmMs,
    string Status,
    List<EreignisEingang> Ereignisse,
    List<ErgebnisEingang> Ergebnisse);

public enum Annahme
{
    Angelegt,
    Aktualisiert,
    /// <summary>Die Sitzung gibt es schon, aber für ein anderes Kind.</summary>
    Konflikt,
    UngueltigerStatus,
}

/// <summary>
/// Nimmt eine komplette Trainingseinheit entgegen.
///
/// Bewusst ohne HTTP, damit es sich mit xUnit prüfen lässt — die Frage „was passiert, wenn
/// derselbe Upload zweimal ankommt" wird sonst nur behauptet und nicht belegt.
///
/// Der Ablauf ist ein <b>Upsert</b>: die Schlüssel kommen alle vom Tablet, also legt ein
/// Wiederholversuch nach einem Verbindungsabbruch nichts doppelt an. Ereignisse und Ergebnisse
/// werden nur ergänzt, nie geändert — das Protokoll ist append-only (D2), und ein Abbruch ist
/// laut CLAUDE.md ein Befund und kein Müll.
/// </summary>
public static class SessionAnnahme
{
    private static readonly string[] ErlaubteZustaende = ["laeuft", "fertig", "abgebrochen"];

    public static async Task<Annahme> Anwenden(
        TkContext db,
        Guid sessionId,
        int klientId,
        int geraetId,
        SessionEingang eingang)
    {
        if (!ErlaubteZustaende.Contains(eingang.Status)) return Annahme.UngueltigerStatus;

        var session = await db.Sessions
            .Include(s => s.Ereignisse)
            .Include(s => s.Ergebnisse)
            .SingleOrDefaultAsync(s => s.Id == sessionId);

        var neu = session is null;
        if (session is null)
        {
            session = new Session { Id = sessionId, KlientId = klientId };
            db.Sessions.Add(session);
        }
        // Dieselbe SessionId für ein anderes Kind heißt: irgendetwas stimmt nicht. Lieber
        // ablehnen als eine fremde Akte verunreinigen.
        else if (session.KlientId != klientId)
        {
            return Annahme.Konflikt;
        }

        session.GeraetId = geraetId;
        session.VereinId = eingang.VereinId;
        session.Tag = eingang.Tag;
        session.BegonnenAmMs = eingang.BegonnenAmMs;
        session.BeendetAmMs = eingang.BeendetAmMs;
        session.Status = eingang.Status;

        // Serveruhr. Aus ihr und BegonnenAmMs lässt sich eine verstellte Tablet-Uhr erkennen —
        // deshalb wird sie bei jedem Upload neu gesetzt und nicht nur beim ersten.
        session.EmpfangenAm = DateTime.UtcNow;

        var bekannteNummern = session.Ereignisse.Select(e => e.Folgenummer).ToHashSet();
        foreach (var e in eingang.Ereignisse.Where(e => !bekannteNummern.Contains(e.Folgenummer)))
        {
            session.Ereignisse.Add(new SessionEreignis
            {
                SessionId = sessionId,
                Folgenummer = e.Folgenummer,
                Art = e.Art,
                ZeitMs = e.ZeitMs,
                Nutzlast = e.Nutzlast,
            });
        }

        var bekannteErgebnisse = session.Ergebnisse.Select(e => e.Id).ToHashSet();
        foreach (var e in eingang.Ergebnisse.Where(e => !bekannteErgebnisse.Contains(e.Id)))
        {
            var ergebnis = new Spielergebnis
            {
                Id = e.Id,
                SessionId = sessionId,
                SpielId = e.SpielId,
                DauerMs = e.DauerMs,
                Vollstaendigkeit = e.Vollstaendigkeit,
                Genauigkeit = e.Genauigkeit,
                DruckMittel = e.DruckMittel,
                DruckStreuung = e.DruckStreuung,
                Eingabegeraet = e.Eingabegeraet,
                SynthetischerDruck = e.SynthetischerDruck,
                Stufe = e.Stufe,
                Abgebrochen = e.Abgebrochen,
                Selbsteinschaetzung = e.Selbsteinschaetzung,
                Extra = e.Extra,
            };

            if (e.Rohdaten is { } roh)
            {
                ergebnis.Rohdaten = new Rohdaten
                {
                    SpielergebnisId = e.Id,
                    Werte = Convert.FromBase64String(roh.Werte),
                    AbtastrateHz = roh.AbtastrateHz,
                    Anzahl = roh.Anzahl,
                };
            }

            session.Ergebnisse.Add(ergebnis);
        }

        await db.SaveChangesAsync();
        return neu ? Annahme.Angelegt : Annahme.Aktualisiert;
    }
}
