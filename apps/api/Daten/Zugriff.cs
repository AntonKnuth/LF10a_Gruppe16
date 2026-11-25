using Microsoft.EntityFrameworkCore;

namespace TravelKickers.Api.Daten;

///<summary>
///Die einzige Stelle, an der Klientendaten abgefragt werden.
///</summary>
public static class Zugriff
{
    //Alle Kinder, die dieser Therapeut betreuen darf.
    public static IQueryable<Klient> KlientenFuer(TkContext db, int therapeutId) =>
        db.Klienten.Where(k => k.Betreuungen.Any(b => b.TherapeutId == therapeutId));

    public static IQueryable<Session> SessionsFuer(TkContext db, int therapeutId, int klientId) =>
        db.Sessions.Where(s =>
            s.KlientId == klientId &&
            s.Klient!.Betreuungen.Any(b => b.TherapeutId == therapeutId));

    public static IQueryable<Spielergebnis> ErgebnisseFuer(TkContext db, int therapeutId, int klientId) =>
        db.Spielergebnisse.Where(e =>
            e.Session!.KlientId == klientId &&
            e.Session.Klient!.Betreuungen.Any(b => b.TherapeutId == therapeutId));

    //Wird für 403 gebraucht. Eine leere Liste zurückzugeben wäre falsch: leer heißt
    //in dieser App „nicht geübt", und das würde den Wochenbericht lügen lassen.
    public static Task<bool> DarfSehen(TkContext db, int therapeutId, int klientId) =>
        db.Betreuungen.AnyAsync(b => b.TherapeutId == therapeutId && b.KlientId == klientId);
}
