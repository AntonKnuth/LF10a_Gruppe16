using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TravelKickers.Api.Daten;

namespace TravelKickers.Api.Tests;

/// <summary>
/// Eine frische SQLite-Datenbank im Arbeitsspeicher je Test.
///
/// Bewusst <b>nicht</b> der InMemory-Provider von EF Core: der kennt keine Fremdschlüssel und
/// keine Kaskaden. Der Art.-17-Test würde damit immer bestehen, ohne irgendetwas zu beweisen.
/// SQLite im Arbeitsspeicher verhält sich dagegen wie die echte Datei — die Verbindung muss
/// nur offen bleiben, sonst verschwindet die Datenbank sofort wieder.
/// </summary>
public sealed class TestDatenbank : IDisposable
{
    private readonly SqliteConnection _verbindung;

    public TkContext Db { get; }

    public TestDatenbank()
    {
        _verbindung = new SqliteConnection("Data Source=:memory:");
        _verbindung.Open();

        Db = new TkContext(new DbContextOptionsBuilder<TkContext>()
            .UseSqlite(_verbindung)
            .Options);

        Db.Database.EnsureCreated();
    }

    /// <summary>Legt einen Therapeuten mit betreutem Kind an und gibt beide Schlüssel zurück.</summary>
    public (int TherapeutId, int KlientId) MitBetreuung(string email = "t@test")
    {
        var therapeut = new Therapeut { Email = email, PasswortHash = "x" };
        var klient = new Klient { Vorname = "Ben", Nachname = "Kern" };
        Db.Therapeuten.Add(therapeut);
        Db.Klienten.Add(klient);
        Db.SaveChanges();

        Db.Betreuungen.Add(new Betreuung { TherapeutId = therapeut.Id, KlientId = klient.Id });
        Db.SaveChanges();

        return (therapeut.Id, klient.Id);
    }

    public void Dispose()
    {
        Db.Dispose();
        _verbindung.Dispose();
    }
}
