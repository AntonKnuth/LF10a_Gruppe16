using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelKickers.Api.Migrations
{
    /// <inheritdoc />
    public partial class Tageslimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LimitFreigabeAm",
                table: "Klienten",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LimitFreigabeAm",
                table: "Klienten");
        }
    }
}
