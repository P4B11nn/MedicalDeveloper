@echo off
REM Medical Developer v4.2.0 - Script de Deployment para Windows
REM Uso: deploy.bat [netlify|vercel|apache|nginx]

setlocal enabledelayedexpansion

REM Colores (simulados con texto)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%
echo =========================================
echo   Medical Developer v4.2.0 Deployment  
echo =========================================
echo %NC%

REM Verificar que estemos en el directorio correcto
if not exist package.json (
    echo %RED%[ERROR] No estás en el directorio correcto del proyecto%NC%
    pause
    exit /b 1
)

if not exist menuInicio.html (
    echo %RED%[ERROR] No estás en el directorio correcto del proyecto%NC%
    pause
    exit /b 1
)

echo %GREEN%[INFO] Ejecutando verificaciones pre-deployment...%NC%

REM Verificar archivos críticos
set "critical_files=index.html menuInicio.html manifest.json sw.js package.json"
for %%f in (%critical_files%) do (
    if not exist %%f (
        echo %RED%[ERROR] Archivo crítico faltante: %%f%NC%
        pause
        exit /b 1
    )
)

REM Verificar directorios críticos
set "critical_dirs=js css pages img"
for %%d in (%critical_dirs%) do (
    if not exist %%d (
        echo %RED%[ERROR] Directorio crítico faltante: %%d%NC%
        pause
        exit /b 1
    )
)

echo %GREEN%[INFO] Verificaciones pre-deployment completadas%NC%

REM Manejar parámetro de línea de comandos
set "deployment_type=%1"
if "%deployment_type%"=="" set "deployment_type=interactive"

if "%deployment_type%"=="netlify" goto :netlify
if "%deployment_type%"=="vercel" goto :vercel
if "%deployment_type%"=="apache" goto :apache
if "%deployment_type%"=="nginx" goto :nginx

REM Modo interactivo
:interactive
echo.
echo Selecciona el tipo de deployment:
echo 1) Netlify (hosting estático)
echo 2) Vercel (hosting estático)
echo 3) Apache (servidor web)
echo 4) Nginx (servidor web)
echo 5) Node.js local (desarrollo)
echo 6) Solo verificaciones
echo.
set /p choice="Ingresa tu opción (1-6): "

if "%choice%"=="1" goto :netlify
if "%choice%"=="2" goto :vercel
if "%choice%"=="3" goto :apache
if "%choice%"=="4" goto :nginx
if "%choice%"=="5" goto :nodejs
if "%choice%"=="6" goto :verify_only
echo %RED%[ERROR] Opción inválida%NC%
pause
exit /b 1

:netlify
echo %GREEN%[INFO] Iniciando deployment en Netlify...%NC%

REM Verificar si netlify CLI está instalado
netlify --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[INFO] Instalando Netlify CLI...%NC%
    npm install -g netlify-cli
)

echo %YELLOW%[INFO] Asegúrate de estar logueado en Netlify (netlify login)%NC%
echo.
echo Comandos para ejecutar manualmente:
echo   netlify login
echo   netlify deploy --dir .
echo   netlify deploy --prod --dir .
echo.
goto :finish

:vercel
echo %GREEN%[INFO] Iniciando deployment en Vercel...%NC%

REM Verificar si vercel CLI está instalado
vercel --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[INFO] Instalando Vercel CLI...%NC%
    npm install -g vercel
)

echo.
echo Comandos para ejecutar manualmente:
echo   vercel
echo   vercel --prod
echo.
goto :finish

:apache
echo %GREEN%[INFO] Preparando para deployment en Apache...%NC%

if not exist .htaccess (
    echo %RED%[ERROR] Archivo .htaccess no encontrado%NC%
    pause
    exit /b 1
)

echo.
echo Para completar el deployment en Apache:
echo 1. Sube todos los archivos a tu servidor web
echo 2. Asegúrate de que mod_rewrite esté habilitado
echo 3. Configura el DocumentRoot a tu directorio  
echo 4. El archivo .htaccess ya está configurado
echo.
goto :finish

:nginx
echo %GREEN%[INFO] Preparando para deployment en Nginx...%NC%

if not exist nginx.conf (
    echo %RED%[ERROR] Archivo nginx.conf no encontrado%NC%
    pause
    exit /b 1
)

echo.
echo Para completar el deployment en Nginx:
echo 1. Copia los archivos del proyecto al servidor
echo 2. Copia nginx.conf a sites-available
echo 3. Crea enlace simbólico en sites-enabled
echo 4. Prueba configuración: nginx -t
echo 5. Reinicia Nginx: systemctl restart nginx
echo.
goto :finish

:nodejs
echo %GREEN%[INFO] Iniciando servidor Node.js local...%NC%

if not exist node_modules (
    echo %YELLOW%[INFO] Instalando dependencias...%NC%
    npm install
)

echo %GREEN%[INFO] Iniciando servidor en http://localhost:3001%NC%
npm start
goto :finish

:verify_only
echo %GREEN%[INFO] Solo verificaciones completadas%NC%
goto :finish

:finish
echo.
echo %BLUE%=========================================
echo          Deployment Información
echo =========================================%NC%
echo Aplicación: Medical Developer v4.2.0
echo Características:
echo   ✓ Progressive Web App (PWA)
echo   ✓ Funcionalidad offline
echo   ✓ Responsive design
echo   ✓ Dashboard administrativo
echo   ✓ Dashboard de practicante
echo.
echo Archivos importantes:
echo   📄 DEPLOYMENT_GUIDE.md - Guía completa
echo   ⚙️ .htaccess / nginx.conf - Configuraciones
echo   📱 manifest.json - PWA config
echo   🔧 sw.js - Service Worker
echo.
echo %GREEN%¡Deployment preparado exitosamente!%NC%
echo.
pause