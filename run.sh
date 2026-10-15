#!/bin/bash

# ==== CONFIG ====
PORT=3000   # change this to your server port
BRANCH=main # change if needed
# ===============

echo "📁 Pulling latest code from Git..."
git fetch
git checkout $BRANCH
git pull origin $BRANCH

echo "🧹 Cleaning old node_modules..."
rm -rf node_modules
rm -f package-lock.json

echo "📦 Installing packages..."
npm install

echo "📦 Installing nodemon as dev dependency..."
npm install --save-dev nodemon

echo "🔍 Checking if port $PORT is busy..."

PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
    echo "⚠️ Port $PORT is in use by PID $PID. Killing it..."
    kill -9 $PID
    echo "✔ Port cleared."
else
    echo "✔ Port is free."
fi

echo "🚀 Starting the server with nodemon..."
npm run dev
