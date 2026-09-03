namespace TravelKickers.Api.Daten;

// Schlüsselregel im ganzen Modell:
// - `int` überall dort, wo der Server den Schlüssel vergibt. Das liest sich im ERD besser.
// - `Guid` nur dort, wo das Tablet ihn erzeugt (Session, Ereignis, Spielergebnis, Rohdaten).
//   Dadurch ist ein wiederholter Upload nach einem Verbindungsabbruch ein Upsert statt eines
//   Duplikats — das ist der einzige Grund für die GUIDs, nicht "GUIDs sind moderner".
//
// Zweite Regel: große Binärdaten liegen in einer eigenen 1:1-Tabelle. EF Core lädt alle
// gemappten Spalten einer Entität mit, sonst zieht jede Abfrage eines Spielergebnisses
// hunderte Kilobyte Rohdaten mit.

/// <summary>Thomas. Meldet sich in der Therapeuten-App an.</summary>
public class Therapeut
{
    public int Id { get; set; }
    public string Vorname { get; set; } = "";
    public string Nachname { get; set; } = "";
    public string Email { get; set; } = "";

    /// <summary>PBKDF2 über <c>PasswordHasher&lt;Therapeut&gt;</c>. Nie Klartext.</summary>
    public string PasswortHash { get; set; } = "";

    public bool Aktiv { get; set; } = true;
    public DateTime ErstelltAm { get; set; }

    public List<Betreuung> Betreuungen { get; set; } = [];
}

/// <summary>Ben. D4 erlaubt Vorname und Jahrgang; der Nachname ist eine dokumentierte
/// Abweichung, damit gleichnamige Kinder unterscheidbar bleiben.</summary>
public class Klient
{
    public int Id { get; set; }
    public string Vorname { get; set; } = "";
    public string Nachname { get; set; } = "";

    /// <summary>Selbstgewählter Name aus dem Erstlauf („Benno"). <b>Nur dieser</b> wird im Spiel
    /// angesprochen (C5) — der bürgerliche Name taucht im Kindmodus nie auf.</summary>
    public string? Spielname { get; set; }

    /// <summary>B3: Dauer und Inhalt der Zwangspause stellt der Therapeut ein.</summary>
    public int PausenDauerSek { get; set; } = 60;
    public string PausenInhalt { get; set; } = "Hand locker ausschütteln";

    public DateTime ErstelltAm { get; set; }

    public List<Betreuung> Betreuungen { get; set; } = [];
    public List<Einstellung> Einstellungen { get; set; } = [];
    public List<Geraet> Geraete { get; set; } = [];
    public List<Session> Sessions { get; set; } = [];
    public List<Anhang> Anhaenge { get; set; } = [];
}

/// <summary>Die einzige Zugriffsregel im System. Wer ein Kind sehen darf, steht hier —
/// nicht in einer Spalte „Praxis". Eine zweite Praxis ändert daran nichts.</summary>
public class Betreuung
{
    public int Id { get; set; }
    public int TherapeutId { get; set; }
    public Therapeut? Therapeut { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }

    public DateTime Von { get; set; }

    /// <summary>Gesetzt, wenn eine Vertretung endet. Der Zugriff bleibt trotzdem bestehen —
    /// wer eine Sitzung begleitet hat, muss sie nachbereiten können.</summary>
    public DateTime? Bis { get; set; }
}

/// <summary>Ein Tablet. Immer genau einem Kind zugeordnet.</summary>
public class Geraet
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }
    public string Bezeichnung { get; set; } = "";

    /// <summary>Nur der Hash. Das Klartext-Token sieht der Server ein einziges Mal, nämlich
    /// wenn er es bei der Kopplung ausgibt.</summary>
    public string TokenHash { get; set; } = "";

    /// <summary>Der Therapeut kann das Gerät sperren. Wirkt auch bei einem verlorenen Tablet —
    /// ein Löschknopf auf dem Gerät täte das nicht.</summary>
    public bool Aktiv { get; set; } = true;

    public DateTime ErstelltAm { get; set; }
    public DateTime? ZuletztGesehen { get; set; }
}

/// <summary>Einmalcode, mit dem ein Tablet an ein Kind gekoppelt wird.</summary>
public class Kopplungscode
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }
    public string Code { get; set; } = "";
    public DateTime LaeuftAbAm { get; set; }

    /// <summary>Zähler am Code statt Ratenbegrenzung pro IP: bei der Vorführung kommt alles
    /// von <c>::1</c>, eine IP-Sperre würde die Prüfung lahmlegen.</summary>
    public int Fehlversuche { get; set; }

    public DateTime? EingeloestAm { get; set; }
}

/// <summary>B1: Toleranz, Zielgeschwindigkeit und Mindesttrefferquote je Übungstyp,
/// einstellbar pro Kind.</summary>
public class Einstellung
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }
    public string SpielId { get; set; } = "";

    public int Stufe { get; set; } = 1;
    public double Toleranz { get; set; } = 1.0;
    public double Zielgeschwindigkeit { get; set; } = 1.0;
    public double Mindesttrefferquote { get; set; } = 0.5;
    public int DauerSek { get; set; } = 180;

    /// <summary>Der Therapeut kann ein Spiel aus dem Tagesplan nehmen.</summary>
    public bool Aktiv { get; set; } = true;
    public int Reihenfolge { get; set; }
}

/// <summary>Eine Trainingseinheit. Der Schlüssel kommt vom Tablet.</summary>
public class Session
{
    public Guid Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }

    /// <summary>Nullbar mit Absicht: die Sitzung gehört dem Kind, nicht dem Tablet. Wird ein
    /// Gerät entfernt, verliert die Sitzung nur den Verweis darauf, nicht ihre Daten.
    /// Ein Fremdschlüssel mit RESTRICT stünde hier der Löschung nach Art. 17 im Weg.</summary>
    public int? GeraetId { get; set; }
    public Geraet? Geraet { get; set; }

    public string VereinId { get; set; } = "";
    public int Tag { get; set; }

    /// <summary>Geräteuhr, Millisekunden seit 1970. Kann falsch gestellt sein.</summary>
    public long BegonnenAmMs { get; set; }
    public long? BeendetAmMs { get; set; }

    /// <summary>„laeuft", „fertig" oder „abgebrochen". Ein Abbruch nach 90 Sekunden ist für
    /// Thomas ein Befund und wird nicht weggeworfen (C2, D2).</summary>
    public string Status { get; set; } = "laeuft";

    /// <summary>Serveruhr. Die einzige Zeit, der man trauen kann — aus ihr und
    /// <see cref="BegonnenAmMs"/> lässt sich eine verstellte Tablet-Uhr erkennen.</summary>
    public DateTime EmpfangenAm { get; set; }

    public List<SessionEreignis> Ereignisse { get; set; } = [];
    public List<Spielergebnis> Ergebnisse { get; set; } = [];
}

/// <summary>Append-only Ereignisprotokoll (D2). Schlüssel ist (SessionId, Folgenummer) —
/// dadurch legt ein wiederholter Upload dieselbe Zeile nicht zweimal an.</summary>
public class SessionEreignis
{
    public Guid SessionId { get; set; }
    public Session? Session { get; set; }
    public int Folgenummer { get; set; }
    public string Art { get; set; } = "";
    public long ZeitMs { get; set; }
    public string? Nutzlast { get; set; }
}

/// <summary>Ergebnis eines Minispiels. Die Zahlen hier sind <b>unmaßgeblich</b>: sie entstehen
/// im Browser für das Sofortfeedback aus A1. Die Kennzahlen für den Bericht rechnet C# aus
/// <see cref="Rohdaten"/>.</summary>
public class Spielergebnis
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Session? Session { get; set; }
    public string SpielId { get; set; } = "";

    /// <summary>Reine Spielzeit. Pausen sind abgezogen, sonst verfälscht jede Pause
    /// den Verlauf.</summary>
    public int DauerMs { get; set; }

    public double Vollstaendigkeit { get; set; }
    public double Genauigkeit { get; set; }
    public double DruckMittel { get; set; }
    public double DruckStreuung { get; set; }
    public string Eingabegeraet { get; set; } = "";

    /// <summary>Druck per Tastatur simuliert. Ohne diese Markierung mischen sich echte
    /// Pencil-Druckkurven mit Ersatzwerten und die Verlaufskurve lügt.</summary>
    public bool SynthetischerDruck { get; set; }

    /// <summary>Eingestellte Stufe, eingefroren. Ohne sie sieht eine vom Therapeuten erhöhte
    /// Anforderung im Verlauf wie eine Verschlechterung aus.</summary>
    public int Stufe { get; set; }

    public bool Abgebrochen { get; set; }

    /// <summary>C3: 1 bis 3. Wird <b>vor</b> Lob und Ergebnis erhoben, sonst misst man nicht
    /// die Selbsteinschätzung, sondern die Fähigkeit, ein Ergebnis abzulesen.</summary>
    public int? Selbsteinschaetzung { get; set; }

    /// <summary>Spielspezifisch, als JSON. Geht nicht in den Verlaufsgraphen.</summary>
    public string? Extra { get; set; }

    public Rohdaten? Rohdaten { get; set; }
}

/// <summary>B4: die Punktfolge als Float32-Blob. Eigene Tabelle, damit eine Abfrage der
/// Spielergebnisse sie nicht mitlädt.</summary>
public class Rohdaten
{
    public Guid SpielergebnisId { get; set; }
    public Spielergebnis? Spielergebnis { get; set; }

    /// <summary>Float32, ausgedünnt auf <see cref="AbtastrateHz"/>.</summary>
    public byte[] Werte { get; set; } = [];
    public int AbtastrateHz { get; set; } = 60;

    /// <summary>Anzahl der Abtastungen — spart das Rechnen aus der Blob-Länge.</summary>
    public int Anzahl { get; set; }
}

/// <summary>Arbeitsprobe: die Handschriftprobe aus dem Erstlauf oder das Foto des
/// Abschiedsgeschenks. Wird gespeichert und Thomas angezeigt, aber <b>nicht ausgewertet</b>
/// und erscheint <b>nicht</b> im Wochenbericht (D3).</summary>
public class Anhang
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }

    /// <summary>„handschriftprobe" oder „abschiedsgeschenk".</summary>
    public string Art { get; set; } = "";

    /// <summary>Bei Abschiedsgeschenken der Verein, sonst null.</summary>
    public string? VereinId { get; set; }

    public string ContentType { get; set; } = "";
    public int Laenge { get; set; }
    public DateTime ErstelltAm { get; set; }

    public AnhangDaten? Daten { get; set; }
}

/// <summary>Die Bytes des Anhangs, getrennt aus demselben Grund wie bei den Rohdaten.</summary>
public class AnhangDaten
{
    public int AnhangId { get; set; }
    public Anhang? Anhang { get; set; }
    public byte[] Bytes { get; set; } = [];
}
