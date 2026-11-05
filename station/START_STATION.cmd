@echo off
title The Weight of Information - Print Station
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Station.ps1"
if errorlevel 1 pause
