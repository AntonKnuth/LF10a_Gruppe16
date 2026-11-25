using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelKickers.Api.Migrations
{
    /// <inheritdoc />
    public partial class Vorfuehrmodus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Vorfuehrung",
                table: "Sessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Vorfuehrmodus",
                table: "Klienten",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Vorfuehrung",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "Vorfuehrmodus",
                table: "Klienten");
        }
    }
}
