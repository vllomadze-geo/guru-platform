#!/bin/zsh

set -u

PROJECT_DIR="/Users/asyncfinkd/Developer/guru-platform"
PORT="${PORT:-3000}"
PROJECT_URL="http://localhost:${PORT}"

pause() {
  printf "\nPress Enter to close this window..."
  read -r _
}

clear
echo "GURU Platform"
echo "Project: ${PROJECT_DIR}"
echo "URL: ${PROJECT_URL}"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found in PATH."
  pause
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found in PATH."
  pause
  exit 1
fi

cd "${PROJECT_DIR}" || {
  echo "Project directory was not found."
  pause
  exit 1
}

if [ ! -d "node_modules" ] && [ -f "package-lock.json" ]; then
  echo "Installing dependencies..."
  npm install || {
    echo "Dependency installation failed."
    pause
    exit 1
  }
  echo ""
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use. Opening ${PROJECT_URL}."
  open "${PROJECT_URL}"
  pause
  exit 0
fi

echo "Starting dev server with live reload."
echo "Press Control-C to stop it."
echo ""

(sleep 1 && open "${PROJECT_URL}") >/dev/null 2>&1 &
export PORT
npm run dev
status=$?

echo ""
echo "Dev server stopped."
pause
exit "${status}"
