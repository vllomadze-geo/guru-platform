#!/bin/bash
cd "$(dirname "$0")"
echo "ГУРУ запущен: http://localhost:3000"
open "http://localhost:3000/index.html"
node local-dev-server.js
