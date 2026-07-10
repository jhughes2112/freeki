@echo off
pushd %~dp0

REM Builds freeki-client inside a node container so no local nodejs install (or VS node workload) is needed.
REM - The repo is bind-mounted, so vite writes the output to build\static-root on the host (vite outDir is ../build/static-root).
REM   That is where the Dockerfile COPYs it from when packing the server image, and where a locally published
REM   server (build\publish) finds it via the default --static_root ../static-root.
REM - node_modules lives in a named docker volume, NOT on the host: the container installs linux-musl native
REM   binaries (esbuild/rollup) that must not mix with a Windows npm install, and the volume makes rebuilds fast.
REM esbuild's install script is approved in package.json ("allowScripts"); re-approve with
REM `npm approve-scripts esbuild` (run inside this container) whenever esbuild's version changes.
docker run --rm -e NPM_CONFIG_UPDATE_NOTIFIER=false -v "%cd%:/work" -v freeki-client-node-modules:/work/freeki-client/node_modules -w /work/freeki-client node:24-alpine sh -c "npm install --no-fund --no-audit && npm run build"
if errorlevel 1 (
    echo freeki-client build FAILED.
    popd
    exit /b 1
)

popd
exit /b 0
