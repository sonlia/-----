#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 生产环境状态查看脚本
# 用法: ./status-prod.sh [-p 端口号]
# ============================================================

DEFAULT_PORT=3000
PORT=$DEFAULT_PORT
PID_FILE="/tmp/energy-cockpit-prod.pid"
LOG_FILE="/tmp/energy-cockpit-prod.log"

# === 解析命令行参数 ===
while getopts "p:h" opt; do
  case $opt in
    p) PORT="$OPTARG" ;;
    h)
      echo "用法: ./status-prod.sh [-p 端口号]"
      echo "  -p  指定端口号（默认: $DEFAULT_PORT）"
      exit 0
      ;;
    \?) echo "无效选项: -$OPTARG" >&2; exit 1 ;;
    :) echo "选项 -$OPTARG 需要参数。" >&2; exit 1 ;;
  esac
done

echo "============================================================"
echo "  综合能源驾驶舱 · 生产环境状态 (端口 $PORT)"
echo "============================================================"

# 检查进程状态
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "进程状态: ✅ 运行中 (PID=$PID)"
  else
    echo "进程状态: ❌ PID=$PID 已不存在"
  fi
else
  echo "进程状态: ℹ 未找到 PID 文件"
fi

# 检查端口
if command -v lsof >/dev/null 2>&1; then
  PORT_INFO=$(lsof -i :$PORT 2>/dev/null | tail -n +2 || true)
  if [ -n "$PORT_INFO" ]; then
    echo "端口 $PORT: ✅ 已占用"
    echo "$PORT_INFO" | head -3
  else
    echo "端口 $PORT: ❌ 未占用"
  fi
fi

# 检查 HTTP 响应
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo "HTTP 响应: ✅ $HTTP_CODE (服务正常)"
else
  echo "HTTP 响应: ❌ $HTTP_CODE (服务异常)"
fi

# 检查构建状态
if [ -d "/home/z/my-project/.next" ]; then
  echo "构建产物: ✅ 已构建 (.next 目录存在)"
else
  echo "构建产物: ❌ 未构建"
fi

echo ""
echo "访问地址: http://localhost:$PORT/"
echo "日志文件: $LOG_FILE ($(wc -l < $LOG_FILE 2>/dev/null || echo 0) 行)"
echo "============================================================"
