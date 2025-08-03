# Stage 1: Build the backend
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build-backend
WORKDIR /source
COPY freeki-server/. .
RUN dotnet publish --nologo -c Release -o /output -r linux-musl-x64 /p:PublishProfile=FolderProfile freeki-server.csproj

# Stage 2: Build the frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY freeki-client/. .
RUN npm install && npm run build

# Stage 3: Final runtime image
FROM mcr.microsoft.com/dotnet/runtime:9.0-alpine AS runtime
WORKDIR /

# Copy built backend binary
COPY --from=build-backend /output /freeki-server

# Copy built frontend into a static folder
COPY --from=build-frontend /app/dist /freeki-client

# Add user and fix permissions
RUN adduser --disabled-password --home /app --gecos '' noprivileges && chown -R noprivileges /freeki-server && chown -R noprivileges /freeki-client

USER noprivileges
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

ENTRYPOINT ["/freeki-server/freeki-server"]
