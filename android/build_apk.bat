@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
cd /d "%~dp0\.."
call npx cap sync android
cd /d "%~dp0"
call gradlew.bat assembleDebug
