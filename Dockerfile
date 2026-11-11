FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy only project files first (better caching)
COPY app/*.csproj ./app/
RUN dotnet restore ./app/TravelKickers.Api.csproj

# Copy the rest of the source
COPY app/* ./app/

WORKDIR /app/LF10a_Gruppe16
RUN dotnet build ./TravelKickers.Api.csproj -c Release -o /app/build

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /app/build .

EXPOSE 5173
EXPOSE 5174
EXPOSE 5099

ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["pwsh", ,"-File","./start.ps1"]