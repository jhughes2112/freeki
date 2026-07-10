@echo off
pushd %~dp0

REM Wiki data lives in a named docker volume rather than a Windows bind mount -- bind mounts don't map
REM ownership for the unprivileged container user (noprivileges), but a named volume inherits the image's
REM /data ownership on first use.  Creating it is idempotent.  Use stop.bat to stop the container and
REM optionally delete the volume.
docker volume create freeki-data >nul

REM The image bakes in --static_root /freeki-client and --storage_config /data (see Dockerfile ENTRYPOINT);
REM append options here to override them or add others (e.g. --auth_config).
start http://localhost:7777

docker run -it --rm --name freeki -p 7777:7777 ^
  -v freeki-data:/data ^
  dev.reachablegames.com/freeki:latest

popd
