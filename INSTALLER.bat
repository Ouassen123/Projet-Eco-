@echo off
chcp 65001 >nul
title Installation - Ordres de Mission
cd /d "%~dp0"

echo ============================================
echo   INSTALLATION - Ordres de Mission
echo ============================================
echo.

REM ---- 1. Verifier Node.js ----
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js n'est pas installe. Tentative via winget...
    where winget >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERREUR] winget n'est pas disponible sur ce PC.
        echo Installez Node.js 20+ manuellement : https://nodejs.org
        echo puis relancez INSTALLER.bat
        pause
        exit /b 1
    )
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [ERREUR] L'installation de Node.js a echoue.
        echo Installez Node.js 20+ manuellement : https://nodejs.org
        echo puis relancez INSTALLER.bat
        pause
        exit /b 1
    )
    echo.
    echo [OK] Node.js installe.
    echo IMPORTANT : fermez cette fenetre et relancez INSTALLER.bat
    echo pour que le nouveau PATH soit pris en compte.
    pause
    exit /b 0
)

echo [OK] Node.js detecte :
node -v
echo.

REM ---- 2. Creer le fichier .env ----
if not exist .env (
    echo [INFO] Creation du fichier .env...
    for /f "delims=" %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set AUTHSECRET=%%i
    (
        echo DATABASE_URL="file:./dev.db"
        echo AUTH_SECRET="%AUTHSECRET%"
        echo AUTH_SECURE_COOKIE="false"
    ) > .env
    echo [OK] .env cree avec un secret aleatoire.
) else (
    echo [OK] Fichier .env deja present.
)
echo.

REM ---- 3. Installer les dependances ----
echo [INFO] Installation des dependances npm...
echo        (peut prendre plusieurs minutes la 1ere fois)
call npm install
if %errorlevel% neq 0 (
    echo [ERREUR] npm install a echoue.
    pause
    exit /b 1
)
echo.

REM ---- 4. Creer la base de donnees ----
echo [INFO] Creation de la base de donnees SQLite...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERREUR] prisma db push a echoue.
    pause
    exit /b 1
)
echo.

REM ---- 5. Seeder les referentiels ----
echo [INFO] Chargement des referentiels (baremes, trajets, feries)...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [ATTENTION] Seed referentiels echoue - peut-etre deja fait.
)
echo.

REM ---- 6. Creer les utilisateurs ----
echo [INFO] Creation des utilisateurs par defaut...
call npx tsx scripts/seed_users.ts
if %errorlevel% neq 0 (
    echo [ATTENTION] Seed utilisateurs echoue - peut-etre deja fait.
)
echo.

REM ---- 7. Build production ----
echo [INFO] Compilation de l'application (build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Le build a echoue.
    pause
    exit /b 1
)
echo.

echo ============================================
echo   INSTALLATION TERMINEE !
echo ============================================
echo.
echo Pour lancer l'application : double-cliquez sur DEMARRER.bat
echo.
echo Comptes par defaut :
echo   admin / admin123          (ADMIN)
echo   gestionnaire / gest123    (GESTIONNAIRE)
echo   consultation / cons123    (CONSULTATION)
echo.
pause
