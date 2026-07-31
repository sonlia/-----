#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 生产环境停止脚本
# 用法: ./stop-prod.sh [-p 端口号]
# ============================================================

DEFAULT_PORT=3000
PORT=$DEFAULT_PORT
PID_FILE="/tmp/energy-cockpit-prod.pid"

# === 解析命令行参数 ===
while getopts "p:h" opt; do
  case $opt in
    p) PORT="$OPTARG" ;;
    h)
      echo "用法: ./stop-prod.sh [-p 端口号]"
      echo "  -p  指定端口号（默认: $DEFAULT_PORT）"
      echo ""
      echo "示例:"
      echo "  ./stop-prod.sh              # 停止默认端口 $DEFAULT_PORT"
      echo "  ./stop-prod.sh -p 8888      # 停止端口 8888"
      exit 0
      ;;
    \?) echo "无效选项: -$OPTARG" >&2; exit 1 ;;
    :) echo "选项 -$OPTARG 需要参数。" >&2; exit 1 ;;
  esac
done

echo "============================================================"
echo "  综合能源驾驶舱 · 生产环境停止 (端口 $PORT)"
echo "============================================================"

STOPPED=false

# 方法1：通过 PID 文件停止
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

# 方法2：通过端口查找进程
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

# 方法3：通过 pgrep 查找 next start/next-server 进程
NEXT_PIDS=$(pgrep -f "next start\|next-server" 2>/dev/null || true)
if [ -n "$NEXT_PIDS" ]; then
  echo "停止 next 进程: $NEXT_PIDS"
  echo "$NEXT_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
  STOPPED=true
fi

if [ "$STOPPED" = true ]; then
  echo "✓ 生产服务已停止"
else
  echo "ℹ 没有发现运行中的生产服务"
fi
echo "============================================================"
