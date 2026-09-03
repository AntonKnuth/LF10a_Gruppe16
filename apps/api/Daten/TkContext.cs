using Microsoft.EntityFrameworkCore;

namespace TravelKickers.Api.Daten;

public class TkContext(DbContextOptions<TkContext> optionen) : DbContext(optionen)
{
    public DbSet<Therapeut> Therapeuten => Set<Therapeut>();
    public DbSet<Klient> Klienten => Set<Klient>();
    public DbSet<Betreuung> Betreuungen => Set<Betreuung>();
    public DbSet<Geraet> Geraete => Set<Geraet>();
    public DbSet<Kopplungscode> Kopplungscodes => Set<Kopplungscode>();
    public DbSet<Einstellung> Einstellungen => Set<Einstellung>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<SessionEreignis> SessionEreignisse => Set<SessionEreignis>();
    public DbSet<Spielergebnis> Spielergebnisse => Set<Spielergebnis>();
    public DbSet<Rohdaten> Rohdaten => Set<Rohdaten>();
    public DbSet<Anhang> Anhaenge => Set<Anhang>();
    public DbSet<AnhangDaten> AnhangDaten => Set<AnhangDaten>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Therapeut>().HasIndex(t => t.Email).IsUnique();

        // Ein Therapeut betreut ein Kind nicht zweimal.
        b.Entity<Betreuung>().HasIndex(x => new { x.TherapeutId, x.KlientId }).IsUnique();

        b.Entity<Geraet>().HasIndex(g => g.TokenHash).IsUnique();
        b.Entity<Kopplungscode>().HasIndex(k => k.Code).IsUnique();

        // Ein Spiel hat pro Kind genau eine Einstellung.
        b.Entity<Einstellung>().HasIndex(e => new { e.KlientId, e.SpielId }).IsUnique();

        // Zusammengesetzter Schlüssel: ein erneut hochgeladenes Ereignis überschreibt sich
        // selbst, statt eine zweite Zeile anzulegen.
        b.Entity<SessionEreignis>().HasKey(e => new { e.SessionId, e.Folgenummer });

        b.Entity<Rohdaten>().HasKey(r => r.SpielergebnisId);
        b.Entity<Rohdaten>()
            .HasOne(r => r.Spielergebnis)
            .WithOne(s => s.Rohdaten)
            .HasForeignKey<Rohdaten>(r => r.SpielergebnisId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<AnhangDaten>().HasKey(a => a.AnhangId);
        b.Entity<AnhangDaten>()
            .HasOne(a => a.Anhang)
            .WithOne(a => a.Daten)
            .HasForeignKey<AnhangDaten>(a => a.AnhangId)
            .OnDelete(DeleteBehavior.Cascade);

        // Art. 17 DSGVO: das Löschen eines Klienten muss alles mitnehmen. Die Kette ist
        // Klient -> Session -> Spielergebnis -> Rohdaten, dazu Geräte, Codes, Einstellungen
        // und Anhänge. Ein xUnit-Test prüft danach jede Tabelle auf null Zeilen.
        foreach (var fk in b.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Cascade;

        // Ein Gerät zu löschen darf nicht die Sitzungen des Kindes mitnehmen — die gehören
        // dem Kind, nicht dem Tablet. Deshalb hier ausdrücklich zurückgenommen.
        b.Entity<Session>()
            .HasOne(s => s.Geraet)
            .WithMany()
            .HasForeignKey(s => s.GeraetId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
