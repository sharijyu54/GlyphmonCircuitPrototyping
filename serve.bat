@echo off
setlocal
pushd "%~dp0"

set PORT=5173

rem py があれば優先、なければ python
where py >nul 2>nul && (set "PYTHON=py -3") || (set "PYTHON=python")

echo Starting server on http://localhost:%PORT%/
start "" "http://localhost:%PORT%/index.html"
%PYTHON% -m http.server %PORT%

popd