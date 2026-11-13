using Microsoft.AspNetCore.Identity;
using TravelKickers.Api.Auswertung;

namespace TravelKickers.Api.Daten;

/// <summary>
/// Demo-Konto und Demo-Klient für die Vorführung.
///
/// Läuft <b>nicht</b> nur in der Entwicklungsumgebung: wird der gebaute Ordner weitergegeben
/// oder die .exe doppelgeklickt, ist die Umgebung „Production" — dann liefe der Seed nicht,
/// das Login gäbe 401 und niemand sähe warum.
/// </summary>
public static class Seed
{
    // Bewusst im Quelltext und bewusst öffentlich: erfundene Namen, ein Demo-Passwort.
    // Im Realbetrieb legt ein Therapeut mit Admin-Recht Kollegen über einen Einladungslink an
    // (siehe docs/entscheidungen.md, Abschnitt 4) — dieser Seed existiert dann nicht mehr.
    private const string DemoEmail = "thomas@praxis.test";
    private const string DemoPasswort = "travelkickers";

    public static void Anlegen(TkContext db, IPasswordHasher<Therapeut> hasher)
    {
        if (!db.Therapeuten.Any()) DemoAnlegen(db, hasher);

        // Läuft bei **jedem** Start, nicht nur beim ersten: sonst fehlt jedem bereits
        // angelegten Kind die Einstellungszeile für ein neu dazugekommenes Minispiel. Das Spiel
        // liefe dann zwar (die Kind-App nimmt für Unbekanntes ihre Vorgabe), aber der Therapeut
        // könnte es weder einstellen noch abwählen — und würde es in seiner Liste nicht sehen.
        ErgaenzeEinstellungen(db);
    }

    private static void DemoAnlegen(TkContext db, IPasswordHasher<Therapeut> hasher)
    {
        var thomas = new Therapeut
        {
            Vorname = "Thomas",
            Nachname = "Berger",
            Email = DemoEmail,
            ErstelltAm = DateTime.UtcNow,
        };
        thomas.PasswortHash = hasher.HashPassword(thomas, DemoPasswort);

        var ben = new Klient
        {
            Vorname = "Ben",
            Nachname = "Kern",
            ErstelltAm = DateTime.UtcNow,
        };

        db.Therapeuten.Add(thomas);
        db.Klienten.Add(ben);
        db.SaveChanges();

        db.Betreuungen.Add(new Betreuung
        {
            TherapeutId = thomas.Id,
            KlientId = ben.Id,
            Von = DateTime.UtcNow,
        });

        db.SaveChanges();
    }

    /// <summary>
    /// Legt für jedes Kind die fehlenden Einstellungszeilen an — eine je Spiel aus
    /// <see cref="Spielkatalog"/>.
    ///
    /// Ohne diese Zeilen liefert <c>GET /api/kind</c> eine leere Liste und in der Vorführung
    /// startet kein einziges Spiel. Vorhandene Zeilen bleiben unangetastet: was der Therapeut
    /// eingestellt hat, darf ein Neustart nicht zurücksetzen.
    /// </summary>
    private static void ErgaenzeEinstellungen(TkContext db)
    {
        var vorhanden = db.Einstellungen
            .Select(e => new { e.KlientId, e.SpielId })
            .ToLookup(e => e.KlientId, e => e.SpielId);

        foreach (var klientId in db.Klienten.Select(k => k.Id).ToList())
        {
            var schon = vorhanden[klientId].ToHashSet();
            var fehlt = Spielkatalog.AlleIds.Where(id => !schon.Contains(id)).ToList();
            if (fehlt.Count == 0) continue;

            // Neue Spiele hinten anhängen, statt die bestehende Reihenfolge zu verschieben.
            var naechste = schon.Count == 0
                ? 0
                : db.Einstellungen.Where(e => e.KlientId == klientId).Max(e => e.Reihenfolge) + 1;

            db.Einstellungen.AddRange(fehlt.Select((spielId, i) => new Einstellung
            {
                KlientId = klientId,
                SpielId = spielId,
                Stufe = 3,
                DauerSek = 210, // A3 verlangt 3–5 Minuten je Spiel
                Reihenfolge = naechste + i,
            }));
        }

        db.SaveChanges();
    }
}
