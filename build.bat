@echo off
setlocal enabledelayedexpansion
pushd %~dp0

for /f "tokens=*" %%i in ('TheVersionator.exe -r https://dev.reachablegames.com -c userpass.txt -i freeki') do (
    set "VERSION=%%i"
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
docker login dev.reachablegames.com -u !DOCKERUSERNAME! -p !DOCKERPASSWORD!
docker push dev.reachablegames.com/freeki:!VERSION!
docker push dev.reachablegames.com/freeki:latest

popd
pause
