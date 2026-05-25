#!/bin/bash
# Dev Server Management Script
# Standardizes on port 9000 with HTTP verification

PORT=9000
PID_FILE=".dev-server.pid"
LOG_FILE=".vite.log"

cleanup() {
  # Kill any existing vite processes on our port
  pkill -9 -f "vite.*$PORT" 2>/dev/null
  rm -f "$PID_FILE"
}

start() {
  echo "🚀 Starting dev server on port $PORT..."
  
  # Clean up any existing
  cleanup
  sleep 1
  
  # Start new server (strictPort ensures it only uses 9000)
  nohup npx vite --port $PORT --strictPort --host localhost > "$LOG_FILE" 2>&1 &
  local pid=$!
  echo $pid > "$PID_FILE"
  
  # Verify with timeout (max 10 seconds)
  echo "⏳ Verifying server is ready..."
  for i in {1..10}; do
    sleep 1
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:$PORT/" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
      echo "✅ Server ready: http://localhost:$PORT"
      echo "📋 Dashboard: http://localhost:$PORT/"
      echo "🔗 Connected Scatter: http://localhost:$PORT/vdem-connected-scatter"
      return 0
    fi
    echo "   Attempt $i/10... (HTTP: $http_code)"
  done
  
  echo "❌ Server failed to start properly"
  echo "📄 Check logs: $LOG_FILE"
  cat "$LOG_FILE" | tail -10
  cleanup
  return 1
}

stop() {
  echo "🛑 Stopping dev server..."
  cleanup
  
  # Double-check it's down
  if curl -s --max-time 1 "http://localhost:$PORT/" >/dev/null 2>&1; then
    echo "⚠️  Server still responding, force killing..."
    pkill -9 -f vite 2>/dev/null
    sleep 1
  fi
  
  echo "✅ Server stopped"
}

restart() {
  stop
  sleep 1
  start
}

status() {
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 "http://localhost:$PORT/" 2>/dev/null || echo "000")
  
  if [ "$http_code" = "200" ]; then
    echo "✅ Running: http://localhost:$PORT (HTTP 200)"
    if [ -f "$PID_FILE" ]; then
      local pid=$(cat "$PID_FILE" 2>/dev/null)
      if ps -p "$pid" > /dev/null 2>&1; then
        echo "   PID: $pid"
      fi
    fi
    return 0
  else
    echo "❌ Not running (HTTP: $http_code)"
    return 1
  fi
}

case "$1" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  *) 
    echo "Dev Server Manager - Port $PORT"
    echo ""
    echo "Usage: $0 {start|stop|restart|status}"
    echo ""
    echo "Commands:"
    echo "  start    - Start server with HTTP verification"
    echo "  stop     - Stop server and cleanup"
    echo "  restart  - Stop then start"
    echo "  status   - Check if server is responding (HTTP 200)"
    echo ""
    echo "URL: http://localhost:$PORT/"
    ;;
esac
