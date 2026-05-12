@echo off
chcp 65001 > nul
echo ========================================
echo   异常信息填报系统 - 本地启动
echo ========================================
echo.
echo 正在安装依赖...
pip install -r requirements.txt
echo.
echo 启动服务中...
echo 地址: http://localhost:5000
echo 按 Ctrl+C 停止服务
echo.
python app.py
pause
