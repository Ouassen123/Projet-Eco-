@echo off
chcp 65001 >nul
title Ordres de Mission - Serveur
cd /d "%~dp0"

REM Si l'app n'a jamais ete compilee, lancer le build
if not exist .next (
    echo [INFO] Premier lancement : build en cours...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERREUR] Le build a echoue. Lancez d'abord INSTALLER.bat
        pause
        exit /b 1
    )
)

echo ============================================
echo   Ordres de Mission - Serveur en marche
echo ============================================
echo.
echo   Sur ce PC        : http://localhost:3000
echo   Depuis le reseau : http://^<IP-de-ce-PC^>:3000
echo.
echo Le navigateur va s'ouvrir automatiquement.
echo Pour arreter le serveur : fermez cette fenetre.
echo.

REM Ouvre le navigateur apres 4 secondes (le temps que le serveur demarre)
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

call npm start
pause
