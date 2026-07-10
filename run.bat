@echo off
pushd %~dp0

REM Run the freeki server locally.  The image bakes in --static_root /freeki-client and --storage_config /data
REM (see Dockerfile ENTRYPOINT); append options here to override them or add others (e.g. --auth_config).
start http://localhost:7777

docker run -it --rm --name freeki -p 7777:7777 ^
  -v "%cd%\data:/data" ^
  dev.reachablegames.com/freeki:latest

popd
