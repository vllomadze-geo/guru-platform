#!/bin/zsh

set -u

PROJECT_DIR="/Users/asyncfinkd/Developer/guru-platform"

pause() {
  printf "\nPress Enter to close this window..."
  read -r _
}

fail() {
  echo "$1"
  pause
  exit 1
}

clear
echo "GURU Platform commit helper"
echo "Project: ${PROJECT_DIR}"
echo ""

command -v git >/dev/null 2>&1 || fail "git was not found in PATH."

cd "${PROJECT_DIR}" || fail "Project directory was not found."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "This folder is not a git repository."

if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit."
  git status --short
  pause
  exit 0
fi

echo "Current changes:"
git status --short
echo ""

printf "Commit message: "
read -r COMMIT_MESSAGE

if [ -z "${COMMIT_MESSAGE}" ]; then
  echo "Commit cancelled: message is empty."
  pause
  exit 1
fi

git add -A || fail "Could not stage changes."

if ! git commit -m "${COMMIT_MESSAGE}"; then
  echo ""
  echo "Commit failed. Current status:"
  git status --short
  pause
  exit 1
fi

echo ""
echo "Committed successfully:"
git log -1 --oneline
pause
