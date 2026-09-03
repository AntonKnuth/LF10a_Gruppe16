using System.Security.Cryptography;
using System.Text;

namespace TravelKickers.Api.Daten;

/// <summary>
/// Kopplungscodes und Gerätetokens.
///
/// <b>Warum SHA-256 und nicht <c>PasswordHasher&lt;T&gt;</c>:</b> der Passwort-Hasher salzt
/// zufällig, derselbe Eingabewert ergibt also jedes Mal einen anderen Hash. Damit ließe sich ein
/// Token nie wieder nachschlagen. Ein einfacher Hash ist hier trotzdem zulässig, weil Token und
/// Code <b>selbst</b> aus Zufall bestehen — es gibt nichts zu raten, was ein langsamer Hash
/// schützen müsste. Bei einem Passwort wäre das anders, deshalb steht dort PBKDF2.
/// </summary>
public static class Geheimnis
{
    /// <summary>Ohne 0/O und 1/I/l — der Code wird von einem Kind abgetippt.</summary>
    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    /// <summary>Sechs Zeichen sind rund eine Milliarde Möglichkeiten. Zusammen mit dem
    /// Fehlversuchszähler am Code (10 Versuche) ist Raten aussichtslos, ohne dass eine
    /// IP-Sperre nötig wäre — in der Vorführung käme ohnehin alles von <c>::1</c>.</summary>
    public static string NeuerCode()
    {
        var zeichen = new char[6];
        for (var i = 0; i < zeichen.Length; i++)
            zeichen[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return new string(zeichen);
    }

    /// <summary>32 Byte Zufall, base64url. Der Server zeigt das Klartext-Token genau einmal.</summary>
    public static string NeuesToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string Hash(string wert) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(wert)));
}
