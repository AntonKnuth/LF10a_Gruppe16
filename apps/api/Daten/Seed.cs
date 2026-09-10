using Microsoft.AspNetCore.Identity;

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
        if (db.Therapeuten.Any()) return;

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

        // Ohne diese Zeilen liefert GET /api/kind eine leere Liste und in der Vorführung
        // startet kein einziges Spiel. Die Spiel-IDs sind dieselben wie in
        // apps/web/src/spiele/index.ts — sie kommen aus dem Content, nicht aus der Datenbank.
        string[] spiele =
        [
            "aufwaermen", "linie", "autogramme", "rasenmaehen", "stationentour",
            "startelf", "elfmeter", "dribbeln", "ballhochhalten", "brezelverkauf",
            "abschiedsgeschenk",
        ];

        db.Einstellungen.AddRange(spiele.Select((spielId, i) => new Einstellung
        {
            KlientId = ben.Id,
            SpielId = spielId,
            Stufe = 3,
            DauerSek = 210, // A3 verlangt 3–5 Minuten je Spiel
            Reihenfolge = i,
        }));

        db.SaveChanges();
    }
}
