#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 停止脚本
# 用法: ./stop.sh [-p 端口号]
# 只停止指定端口的进程，不影响其他 Node 程序
# ============================================================

DEFAULT_PORT=3000
PORT=$DEFAULT_PORT
PID_FILE="/tmp/energy-cockpit.pid"

# === 解析命令行参数 ===
while getopts "p:h" opt; do
  case $opt in
    p) PORT="$OPTARG" ;;
    h)
      echo "用法: ./stop.sh [-p 端口号]"
      echo "  -p  指定端口号（默认: $DEFAULT_PORT）"
      echo ""
      echo "示例:"
      echo "  ./stop.sh              # 停止默认端口 $DEFAULT_PORT"
      echo "  ./stop.sh -p 8888      # 停止端口 8888"
      exit 0
      ;;
    \?) echo "无效选项: -$OPTARG" >&2; exit 1 ;;
    :) echo "选项 -$OPTARG 需要参数。" >&2; exit 1 ;;
  esac
done

echo "============================================================"
echo "  综合能源驾驶舱 · 停止脚本 (端口 $PORT)"
echo "============================================================"

STOPPED=false

# 方法1：通过 PID 文件停止（只停止本项目的进程）
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "停止进程 PID=$PID..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 2
    STOPPED=true
  fi
  rm -f "$PID_FILE"
fi

# 方法2：通过端口查找进程（只停止占用本端口的进程）
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "停止端口 $PORT 占用进程: $PORT_PIDS"
    echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
    STOPPED=true
  fi
elif command -v fuser >/dev/null 2>&1; then
  if fuser -k ${PORT}/tcp 2>/dev/null; then
    STOPPED=true
    sleep 1
  fi
fi

if [ "$STOPPED" = true ]; then
  echo "✓ 端口 $PORT 服务已停止"
else
  echo "ℹ 没有发现端口 $PORT 的运行中服务"
fi
echo "============================================================"
