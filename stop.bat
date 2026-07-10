@echo off
pushd %~dp0

REM Stops the freeki container started by run.bat (it was run with --rm, so stopping also removes it),
REM then optionally deletes the freeki-data volume holding the wiki data.
docker stop freeki >nul 2>&1
if errorlevel 1 (
    echo No running 'freeki' container.
) else (
    echo Stopped 'freeki' container.
)

choice /c YN /m "Delete the 'freeki-data' volume (wipes ALL wiki data)"
if errorlevel 2 goto :done
docker volume rm freeki-data
echo Volume 'freeki-data' deleted.

:done
popd
pause
