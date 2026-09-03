using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelKickers.Api.Migrations
{
    /// <inheritdoc />
    public partial class Start : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Klienten",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Vorname = table.Column<string>(type: "TEXT", nullable: false),
                    Nachname = table.Column<string>(type: "TEXT", nullable: false),
                    Spielname = table.Column<string>(type: "TEXT", nullable: true),
                    PausenDauerSek = table.Column<int>(type: "INTEGER", nullable: false),
                    PausenInhalt = table.Column<string>(type: "TEXT", nullable: false),
                    ErstelltAm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Klienten", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Therapeuten",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Vorname = table.Column<string>(type: "TEXT", nullable: false),
                    Nachname = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    PasswortHash = table.Column<string>(type: "TEXT", nullable: false),
                    Aktiv = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErstelltAm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Therapeuten", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Anhaenge",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    KlientId = table.Column<int>(type: "INTEGER", nullable: false),
                    Art = table.Column<string>(type: "TEXT", nullable: false),
                    VereinId = table.Column<string>(type: "TEXT", nullable: true),
                    ContentType = table.Column<string>(type: "TEXT", nullable: false),
                    Laenge = table.Column<int>(type: "INTEGER", nullable: false),
                    ErstelltAm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Anhaenge", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Anhaenge_Klienten_KlientId",
                        column: x => x.KlientId,
                        principalTable: "Klienten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Einstellungen",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    KlientId = table.Column<int>(type: "INTEGER", nullable: false),
                    SpielId = table.Column<string>(type: "TEXT", nullable: false),
                    Stufe = table.Column<int>(type: "INTEGER", nullable: false),
                    Toleranz = table.Column<double>(type: "REAL", nullable: false),
                    Zielgeschwindigkeit = table.Column<double>(type: "REAL", nullable: false),
                    Mindesttrefferquote = table.Column<double>(type: "REAL", nullable: false),
                    DauerSek = table.Column<int>(type: "INTEGER", nullable: false),
                    Aktiv = table.Column<bool>(type: "INTEGER", nullable: false),
                    Reihenfolge = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Einstellungen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Einstellungen_Klienten_KlientId",
                        column: x => x.KlientId,
                        principalTable: "Klienten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Geraete",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    KlientId = table.Column<int>(type: "INTEGER", nullable: false),
                    Bezeichnung = table.Column<string>(type: "TEXT", nullable: false),
                    TokenHash = table.Column<string>(type: "TEXT", nullable: false),
                    Aktiv = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErstelltAm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ZuletztGesehen = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Geraete", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Geraete_Klienten_KlientId",
                        column: x => x.KlientId,
                        principalTable: "Klienten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Kopplungscodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    KlientId = table.Column<int>(type: "INTEGER", nullable: false),
                    Code = table.Column<string>(type: "TEXT", nullable: false),
                    LaeuftAbAm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Fehlversuche = table.Column<int>(type: "INTEGER", nullable: false),
                    EingeloestAm = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Kopplungscodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Kopplungscodes_Klienten_KlientId",
                        column: x => x.KlientId,
                        principalTable: "Klienten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Betreuungen",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TherapeutId = table.Column<int>(type: "INTEGER", nullable: false),
                    KlientId = table.Column<int>(type: "INTEGER", nullable: false),
                    Von = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Bis = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Betreuungen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Betreuungen_Klienten_KlientId",
                        column: x => x.KlientId,
                        principalTable: "Klienten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Betreuungen_Therapeuten_TherapeutId",
                        column: x => x.TherapeutId,
                        principalTable: "Therapeuten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnhangDaten",
                columns: table => new
                {
                    AnhangId = table.Column<int>(type: "INTEGER", nullable: false),
                    Bytes = table.Column<byte[]>(type: "BLOB", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnhangDaten", x => x.AnhangId);
                    table.ForeignKey(
                        name: "FK_AnhangDaten_Anhaenge_AnhangId",
                        column: x => x.AnhangId,
                        principalTable: "Anhaenge",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    KlientId = table.Column<int>(type: "INTEGER", nullable: false),
                    GeraetId = table.Column<int>(type: "INTEGER", nullable: false),
                    VereinId = table.Column<string>(type: "TEXT", nullable: false),
                    Tag = table.Column<int>(type: "INTEGER", nullable: false),
                    BegonnenAmMs = table.Column<long>(type: "INTEGER", nullable: false),
                    BeendetAmMs = table.Column<long>(type: "INTEGER", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    EmpfangenAm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sessions_Geraete_GeraetId",
                        column: x => x.GeraetId,
                        principalTable: "Geraete",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sessions_Klienten_KlientId",
                        column: x => x.KlientId,
                        principalTable: "Klienten",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessionEreignisse",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Folgenummer = table.Column<int>(type: "INTEGER", nullable: false),
                    Art = table.Column<string>(type: "TEXT", nullable: false),
                    ZeitMs = table.Column<long>(type: "INTEGER", nullable: false),
                    Nutzlast = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionEreignisse", x => new { x.SessionId, x.Folgenummer });
                    table.ForeignKey(
                        name: "FK_SessionEreignisse_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Spielergebnisse",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SpielId = table.Column<string>(type: "TEXT", nullable: false),
                    DauerMs = table.Column<int>(type: "INTEGER", nullable: false),
                    Vollstaendigkeit = table.Column<double>(type: "REAL", nullable: false),
                    Genauigkeit = table.Column<double>(type: "REAL", nullable: false),
                    DruckMittel = table.Column<double>(type: "REAL", nullable: false),
                    DruckStreuung = table.Column<double>(type: "REAL", nullable: false),
                    Eingabegeraet = table.Column<string>(type: "TEXT", nullable: false),
                    SynthetischerDruck = table.Column<bool>(type: "INTEGER", nullable: false),
                    Stufe = table.Column<int>(type: "INTEGER", nullable: false),
                    Abgebrochen = table.Column<bool>(type: "INTEGER", nullable: false),
                    Selbsteinschaetzung = table.Column<int>(type: "INTEGER", nullable: true),
                    Extra = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Spielergebnisse", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Spielergebnisse_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rohdaten",
                columns: table => new
                {
                    SpielergebnisId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Werte = table.Column<byte[]>(type: "BLOB", nullable: false),
                    AbtastrateHz = table.Column<int>(type: "INTEGER", nullable: false),
                    Anzahl = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rohdaten", x => x.SpielergebnisId);
                    table.ForeignKey(
                        name: "FK_Rohdaten_Spielergebnisse_SpielergebnisId",
                        column: x => x.SpielergebnisId,
                        principalTable: "Spielergebnisse",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Anhaenge_KlientId",
                table: "Anhaenge",
                column: "KlientId");

            migrationBuilder.CreateIndex(
                name: "IX_Betreuungen_KlientId",
                table: "Betreuungen",
                column: "KlientId");

            migrationBuilder.CreateIndex(
                name: "IX_Betreuungen_TherapeutId_KlientId",
                table: "Betreuungen",
                columns: new[] { "TherapeutId", "KlientId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Einstellungen_KlientId_SpielId",
                table: "Einstellungen",
                columns: new[] { "KlientId", "SpielId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Geraete_KlientId",
                table: "Geraete",
                column: "KlientId");

            migrationBuilder.CreateIndex(
                name: "IX_Geraete_TokenHash",
                table: "Geraete",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Kopplungscodes_Code",
                table: "Kopplungscodes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Kopplungscodes_KlientId",
                table: "Kopplungscodes",
                column: "KlientId");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_GeraetId",
                table: "Sessions",
                column: "GeraetId");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_KlientId",
                table: "Sessions",
                column: "KlientId");

            migrationBuilder.CreateIndex(
                name: "IX_Spielergebnisse_SessionId",
                table: "Spielergebnisse",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Therapeuten_Email",
                table: "Therapeuten",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnhangDaten");

            migrationBuilder.DropTable(
                name: "Betreuungen");

            migrationBuilder.DropTable(
                name: "Einstellungen");

            migrationBuilder.DropTable(
                name: "Kopplungscodes");

            migrationBuilder.DropTable(
                name: "Rohdaten");

            migrationBuilder.DropTable(
                name: "SessionEreignisse");

            migrationBuilder.DropTable(
                name: "Anhaenge");

            migrationBuilder.DropTable(
                name: "Therapeuten");

            migrationBuilder.DropTable(
                name: "Spielergebnisse");

            migrationBuilder.DropTable(
                name: "Sessions");

            migrationBuilder.DropTable(
                name: "Geraete");

            migrationBuilder.DropTable(
                name: "Klienten");
        }
    }
}
