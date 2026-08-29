@echo off
echo ========================================
echo DSH Reasoning Effort Slider 插件安装程序
echo ========================================
echo.

cd /d "%~dp0"

echo 插件目录：%cd%
echo.

echo 正在安装插件...
dsh plugin --profile web add .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo 插件安装成功！
    echo ========================================
    echo.
    echo 下一步操作：
    echo 1. 重启 DSH Web Host
    echo 2. 打开 DSH Web GUI (http://127.0.0.1:64241)
    echo 3. 在输入框下方应该能看到推理强度滑块
    echo.
) else (
    echo.
    echo 插件安装失败，错误代码：%ERRORLEVEL%
    echo.
    echo 请尝试以管理员身份运行此脚本
    echo.
)

pause
