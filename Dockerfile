# Stage 1: Build the backend (native AOT, so the SDK stage needs the clang toolchain)
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build-backend
RUN apk add --no-cache clang build-base zlib-dev
WORKDIR /source

# Restore first against just the project file so the package layer caches across source-only changes
COPY freeki-server/freeki-server.csproj .
RUN dotnet restore --nologo -r linux-musl-x64 freeki-server.csproj

COPY freeki-server/. .
RUN dotnet publish --nologo --no-restore -c Release -o /output -r linux-musl-x64 freeki-server.csproj

# Stage 2: Final runtime image.  The AOT binary is self-contained, so runtime-deps (no .NET runtime) is enough.
# Globalization-invariant mode is compiled into the binary (InvariantGlobalization in the csproj), so no ENV needed.
FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-alpine AS runtime
WORKDIR /freeki-server

# Unprivileged runtime user.  Only /data (the mount point for dynamic storage) needs to be writable;
# the server binary and client files stay root-owned, read-only to the service user.
RUN adduser --disabled-password --home /app --gecos '' noprivileges && mkdir /data && chown noprivileges /data

# Copy built backend binary
COPY --from=build-backend /output /freeki-server

# Copy prebuilt frontend into a static folder.  build/static-root is produced by build-client.bat
# (a docker-run node build with the repo bind-mounted); build.bat runs it before this image builds.
COPY build/static-root /freeki-client

USER noprivileges

# Bake in the paths that are fixed by this image's layout; `docker run <image> --flag value` appends
# arguments after these, and the last occurrence of an option wins, so callers can still override them.
ENTRYPOINT ["/freeki-server/freeki-server", "--static_root", "/freeki-client", "--storage_config", "/data"]
