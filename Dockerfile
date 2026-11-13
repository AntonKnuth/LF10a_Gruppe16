# Baut TravelKickers in ein einziges Image: beide Frontends nach wwwroot, dazu der Server.
# Wie bei start.ps1 läuft danach alles unter einer Adresse.
#
#   docker build -t fiatmann/travelkickers:latest .
#   docker run --rm -p 8080:8080 fiatmann/travelkickers:latest
#   docker push fiatmann/travelkickers:latest

# --- Frontends ---------------------------------------------------------------------------
# Vite 8 braucht Node 20.19+ bzw. 22.12+.
FROM node:22-alpine AS frontend
WORKDIR /src/apps

# Erst nur die Paketlisten, damit npm ci gecacht bleibt, solange sich keine Abhängigkeit ändert.
COPY apps/web/package.json apps/web/package-lock.json ./web/
COPY apps/therapeut/package.json apps/therapeut/package-lock.json ./therapeut/
RUN cd web && npm ci && cd ../therapeut && npm ci

COPY apps/web/ ./web/
COPY apps/therapeut/ ./therapeut/

# Reihenfolge wie in start.ps1: die Kind-App leert wwwroot nicht, die Therapeuten-App
# leert nur wwwroot/therapeut/.
RUN cd web && npm run build && cd ../therapeut && npm run build

# --- Server ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src/apps/api

COPY apps/api/TravelKickers.Api.csproj ./
RUN dotnet restore

COPY apps/api/ ./
COPY --from=frontend /src/apps/api/wwwroot ./wwwroot
RUN dotnet publish -c Release -o /out --no-restore

# --- Laufzeit ----------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /out .

# Die SQLite-Datei entsteht beim Start neben der DLL (AppContext.BaseDirectory). Der
# Nicht-Root-Benutzer muss dort also schreiben dürfen, sonst scheitert Migrate().
RUN chown -R $APP_UID /app
USER $APP_UID

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TravelKickers.Api.dll"]
