#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 停止脚本
# ============================================================

PORT=3000
PID_FILE="/tmp/energy-cockpit.pid"
LOG_FILE="/tmp/energy-cockpit.log"

echo "============================================================"
echo "  综合能源驾驶舱 · 停止脚本"
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

# 方法3：通过 pgrep 查找 next dev/next-server 进程
NEXT_PIDS=$(pgrep -f "next dev\|next-server" 2>/dev/null || true)
if [ -n "$NEXT_PIDS" ]; then
  echo "停止 next 进程: $NEXT_PIDS"
  echo "$NEXT_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
  STOPPED=true
fi

if [ "$STOPPED" = true ]; then
  echo "✓ 服务已停止"
else
  echo "ℹ 没有发现运行中的服务"
fi
echo "============================================================"
