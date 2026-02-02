#!/bin/bash

APP_NAME="api-proxy"
PID_FILE=".pid"
LOG_FILE="logs/output.log"

# 确保日志目录存在
mkdir -p logs

start() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "服务已在运行 (PID: $PID)"
      return 1
    fi
  fi

  echo "正在启动服务..."
  nohup node index.js >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1

  if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
    echo "服务已启动 (PID: $(cat $PID_FILE))"
  else
    echo "启动失败，请查看日志: $LOG_FILE"
    rm -f "$PID_FILE"
    return 1
  fi
}

stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "PID 文件不存在，尝试通过端口查找..."
    PID=$(lsof -ti:${PORT:-3000} 2>/dev/null)
    if [ -z "$PID" ]; then
      echo "服务未运行"
      return 0
    fi
  else
    PID=$(cat "$PID_FILE")
  fi

  if ps -p "$PID" > /dev/null 2>&1; then
    echo "正在停止服务 (PID: $PID)..."
    kill "$PID"
    sleep 2

    if ps -p "$PID" > /dev/null 2>&1; then
      echo "强制停止..."
      kill -9 "$PID"
    fi
    echo "服务已停止"
  else
    echo "服务未运行"
  fi

  rm -f "$PID_FILE"
}

restart() {
  stop
  sleep 1
  start
}

status() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "服务运行中 (PID: $PID)"
      # 显示统计信息
      curl -s "http://localhost:${PORT:-3000}/stats" 2>/dev/null && echo ""
      return 0
    fi
  fi
  echo "服务未运行"
  return 1
}

logs() {
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    echo "日志文件不存在"
  fi
}

case "$1" in
  start)   start ;;
  stop)    stop ;;
  restart) restart ;;
  status)  status ;;
  logs)    logs ;;
  *)
    echo "用法: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
