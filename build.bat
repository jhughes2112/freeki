@echo off
setlocal enabledelayedexpansion
pushd %~dp0

REM Build the client first (inside a node container) so build\static-root exists for the docker image build below.
call build-client.bat
if errorlevel 1 (
    popd
    pause
    exit /b 1
)

REM Fetch the next version number.
set "VERSION="
for /f "tokens=*" %%i in ('docker run --rm -v "%cd%\userpass.txt:/app/userpass.txt:ro" dev.reachablegames.com/theversionator:latest -r https://dev.reachablegames.com -c userpass.txt -i freeki --patch') do (
    set "VERSION=%%i"
)
if "!VERSION!"=="" (
    echo Failed to get a version number from theversionator.
    popd
    pause
    exit /b 1
)

set count=0
for /f "tokens=*" %%a in (userpass.txt) do (
    set /a count+=1
    if !count! equ 1 (
        set "DOCKERUSERNAME=%%a"
    ) else if !count! equ 2 (
        set "DOCKERPASSWORD=%%a"
    )
)

docker build --progress=plain . -t dev.reachablegames.com/freeki:!VERSION! -t dev.reachablegames.com/freeki:latest
if errorlevel 1 (
    echo Docker build FAILED, not pushing.
    popd
    pause
    exit /b 1
)

echo !DOCKERPASSWORD!| docker login dev.reachablegames.com -u !DOCKERUSERNAME! --password-stdin
if errorlevel 1 (
    echo Docker login FAILED, not pushing.
    popd
    pause
    exit /b 1
)

docker push dev.reachablegames.com/freeki:!VERSION!
docker push dev.reachablegames.com/freeki:latest

popd
pause
