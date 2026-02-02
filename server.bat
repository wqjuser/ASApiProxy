@echo off
setlocal enabledelayedexpansion

set APP_NAME=api-proxy
set PID_FILE=.pid
set LOG_FILE=logs\output.log

if not exist logs mkdir logs

if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="status" goto status
goto usage

:start
if exist %PID_FILE% (
    set /p PID=<%PID_FILE%
    tasklist /FI "PID eq !PID!" 2>nul | find "!PID!" >nul
    if not errorlevel 1 (
        echo 服务已在运行 (PID: !PID!)
        goto end
    )
)
echo 正在启动服务...
start /b node index.js >> %LOG_FILE% 2>&1
timeout /t 2 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| find "PID:"') do (
    echo %%a > %PID_FILE%
    echo 服务已启动 (PID: %%a)
    goto end
)
echo 启动失败，请查看日志: %LOG_FILE%
goto end

:stop
if not exist %PID_FILE% (
    echo PID 文件不存在
    goto end
)
set /p PID=<%PID_FILE%
echo 正在停止服务 (PID: %PID%)...
taskkill /PID %PID% /F >nul 2>&1
del %PID_FILE% 2>nul
echo 服务已停止
goto end

:restart
call :stop
timeout /t 2 /nobreak >nul
call :start
goto end

:status
if exist %PID_FILE% (
    set /p PID=<%PID_FILE%
    tasklist /FI "PID eq !PID!" 2>nul | find "!PID!" >nul
    if not errorlevel 1 (
        echo 服务运行中 (PID: !PID!)
        curl -s http://localhost:3000/stats 2>nul
        goto end
    )
)
echo 服务未运行
goto end

:usage
echo 用法: %0 {start^|stop^|restart^|status}
goto end

:end
endlocal
