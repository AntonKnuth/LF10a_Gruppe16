using Microsoft.EntityFrameworkCore;

namespace TravelKickers.Api.Daten;

/// <summary>
/// Die einzige Stelle, an der Klientendaten abgefragt werden.
///
/// <b>Regel:</b> außerhalb dieser Datei kommt <c>db.Klienten</c>, <c>db.Sessions</c>,
/// <c>db.Spielergebnisse</c>, <c>db.Rohdaten</c> und <c>db.Anhaenge</c> nicht vor. Jede Abfrage
/// beginnt bei <see cref="KlientenFuer"/> und navigiert von dort weiter — dadurch ist der Join
/// über <see cref="Betreuung"/> im Code sichtbar.
///
/// Bewusst <b>kein</b> Global Query Filter: den sieht man in der Abfrage nicht, und was man
/// nicht sieht, kann man in einer Prüfung nicht erklären.
/// </summary>
public static class Zugriff
{
    /// <summary>Alle Kinder, die dieser Therapeut betreuen darf.</summary>
    public static IQueryable<Klient> KlientenFuer(TkContext db, int therapeutId) =>
        db.Klienten.Where(k => k.Betreuungen.Any(b => b.TherapeutId == therapeutId));

    /// <summary>Sitzungen eines Kindes — nur, wenn der Therapeut es betreuen darf.</summary>
    public static IQueryable<Session> SessionsFuer(TkContext db, int therapeutId, int klientId) =>
        KlientenFuer(db, therapeutId).Where(k => k.Id == klientId).SelectMany(k => k.Sessions);

    /// <summary>Wird für 403 gebraucht. Eine leere Liste zurückzugeben wäre falsch: leer heißt
    /// in dieser App „nicht geübt", und das würde den Wochenbericht lügen lassen.</summary>
    public static Task<bool> DarfSehen(TkContext db, int therapeutId, int klientId) =>
        db.Betreuungen.AnyAsync(b => b.TherapeutId == therapeutId && b.KlientId == klientId);
}
