namespace TravelKickers.Api.Daten;

public class Therapeut
{
    public int Id { get; set; }
    public string Vorname { get; set; } = "";
    public string Nachname { get; set; } = "";
    public string Email { get; set; } = "";

    // PBKDF2 über PasswordHasher&lt;Therapeut&gt;. Nie Klartext.
    public string PasswortHash { get; set; } = "";

    public bool Aktiv { get; set; } = true;
    public DateTime ErstelltAm { get; set; }

    public List<Betreuung> Betreuungen { get; set; } = [];
}

public class Klient
{
    public int Id { get; set; }
    public string Vorname { get; set; } = "";
    public string Nachname { get; set; } = "";
    public string? Spielname { get; set; }

    public int PausenDauerSek { get; set; } = 60;
    public string PausenInhalt { get; set; } = "Hand locker ausschütteln";

    public int AnzahlAufwaermen { get; set; } = 1;
    public int AnzahlUebungen { get; set; } = 3;
    public int AnzahlSonder { get; set; } = 1;

    public DateTime ErstelltAm { get; set; }

    public List<Betreuung> Betreuungen { get; set; } = [];
    public List<Einstellung> Einstellungen { get; set; } = [];
    public List<Geraet> Geraete { get; set; } = [];
    public List<Session> Sessions { get; set; } = [];
    public List<Anhang> Anhaenge { get; set; } = [];
}

public class Betreuung
{
    public int Id { get; set; }
    public int TherapeutId { get; set; }
    public Therapeut? Therapeut { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }

    public DateTime Von { get; set; }

    //Gesetzt, wenn eine Vertretung endet. Der Zugriff bleibt trotzdem bestehen
    public DateTime? Bis { get; set; }
}

//Ein Tablet. Immer genau einem Kind zugeordnet.
public class Geraet
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }
    public string Bezeichnung { get; set; } = "";

    public string TokenHash { get; set; } = "";

    //Der Therapeut kann das Gerät sperren
    public bool Aktiv { get; set; } = true;

    public DateTime ErstelltAm { get; set; }
    public DateTime? ZuletztGesehen { get; set; }
}

public class Kopplungscode
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }
    public string Code { get; set; } = "";
    public DateTime LaeuftAbAm { get; set; }

    public int Fehlversuche { get; set; }

    public DateTime? EingeloestAm { get; set; }
}

//B1: Toleranz, Zielgeschwindigkeit und Mindesttrefferquote je Übungstyp, einstellbar pro Kind.
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

    public bool Aktiv { get; set; } = true;
    public int Reihenfolge { get; set; }
}

public class Session
{
    public Guid Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }

    // Nullbar mit Absicht: die Sitzung gehört dem Kind, nicht dem Tablet. Wird ein
    // Gerät entfernt, verliert die Sitzung nur den Verweis darauf, nicht ihre Daten.
    public int? GeraetId { get; set; }
    public Geraet? Geraet { get; set; }

    public string VereinId { get; set; } = "";
    public int Tag { get; set; }

    //Geräteuhr, Millisekunden seit 1970.
    public long BegonnenAmMs { get; set; }
    public long? BeendetAmMs { get; set; }

    public string Status { get; set; } = "laeuft";

    // Serveruhr. Die einzige Zeit, der man trauen kann — aus ihr und
    // BegonnenAmMs lässt sich eine verstellte Tablet-Uhr erkennen.
    public DateTime EmpfangenAm { get; set; }

    public List<SessionEreignis> Ereignisse { get; set; } = [];
    public List<Spielergebnis> Ergebnisse { get; set; } = [];
}

/// <summary>Append-only Ereignisprotokoll
public class SessionEreignis
{
    public Guid SessionId { get; set; }
    public Session? Session { get; set; }
    public int Folgenummer { get; set; }
    public string Art { get; set; } = "";
    public long ZeitMs { get; set; }
    public string? Nutzlast { get; set; }
}

// Ergebnis eines Minispiels. 
// Die Kennzahlen für den Bericht errechnen sich aus Rohdaten.
public class Spielergebnis
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Session? Session { get; set; }
    public string SpielId { get; set; } = "";

    // Reine Spielzeit. Pausen sind abgezogen
    public int DauerMs { get; set; }

    public double Vollstaendigkeit { get; set; }
    public double Genauigkeit { get; set; }
    public double DruckMittel { get; set; }
    public double DruckStreuung { get; set; }
    public string Eingabegeraet { get; set; } = "";

    //Druck per Tastatur simuliert. Ohne diese Markierung mischen sich echte
    //Pencil-Druckkurven mit Ersatzwerten
    public bool SynthetischerDruck { get; set; }

    public int Stufe { get; set; }

    public bool Abgebrochen { get; set; }

    public int? Selbsteinschaetzung { get; set; }

    //Spielspezifisch, als JSON. Geht nicht in den Verlaufsgraphen.
    public string? Extra { get; set; }

    public Rohdaten? Rohdaten { get; set; }
}

//Die Punktfolge als Float32-Blob. Eigene Tabelle, damit eine Abfrage der
//Spielergebnisse sie nicht mitlädt.
public class Rohdaten
{
    public Guid SpielergebnisId { get; set; }
    public Spielergebnis? Spielergebnis { get; set; }

    public byte[] Werte { get; set; } = [];
    public int AbtastrateHz { get; set; } = 60;

    public int Anzahl { get; set; }
}

//Arbeitsprobe: die Handschriftprobe aus dem Erstlauf oder das Foto des
//Abschiedsgeschenks
public class Anhang
{
    public int Id { get; set; }
    public int KlientId { get; set; }
    public Klient? Klient { get; set; }

    //„handschriftprobe" oder „abschiedsgeschenk"
    public string Art { get; set; } = "";

    //Bei Abschiedsgeschenken der Verein, sonst null.
    public string? VereinId { get; set; }

    public string ContentType { get; set; } = "";
    public int Laenge { get; set; }
    public DateTime ErstelltAm { get; set; }

    public AnhangDaten? Daten { get; set; }
}

//Die Bytes des Anhangs, getrennt aus demselben Grund wie bei den Rohdaten.
public class AnhangDaten
{
    public int AnhangId { get; set; }
    public Anhang? Anhang { get; set; }
    public byte[] Bytes { get; set; } = [];
}
