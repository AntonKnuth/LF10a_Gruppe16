using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelKickers.Api.Migrations
{
    /// <inheritdoc />
    public partial class Tagesform : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AnzahlAufwaermen",
                table: "Klienten",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "AnzahlSonder",
                table: "Klienten",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "AnzahlUebungen",
                table: "Klienten",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnzahlAufwaermen",
                table: "Klienten");

            migrationBuilder.DropColumn(
                name: "AnzahlSonder",
                table: "Klienten");

            migrationBuilder.DropColumn(
                name: "AnzahlUebungen",
                table: "Klienten");
        }
    }
}
