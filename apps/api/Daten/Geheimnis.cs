using System.Security.Cryptography;
using System.Text;

namespace TravelKickers.Api.Daten;

/// <summary>
/// Kopplungscodes und Gerätetokens.
/// </summary>
public static class Geheimnis
{
    //Ohne 0/O und 1/I/l — der Code wird von einem Kind abgetippt.
    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    //Sechs Zeichen sind rund eine Milliarde Möglichkeiten.
    public static string NeuerCode()
    {
        var zeichen = new char[6];
        for (var i = 0; i < zeichen.Length; i++)
            zeichen[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return new string(zeichen);
    }

    //32 Byte Zufall, base64url. Der Server zeigt das Klartext-Token genau einmal.
    public static string NeuesToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string Hash(string wert) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(wert)));
}
