#!/bin/bash

# React Native Development Server Restart Script
# This script handles killing existing processes, setting up NVM, and starting the dev server

echo "🔄 Restarting React Native Development Server..."

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "🔍 Checking for processes on port $port..."
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "💀 Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    else
        echo "✅ No process found on port $port"
    fi
}

# Kill common React Native processes
echo "🧹 Cleaning up existing processes..."

# Kill Metro bundler (port 8081)
kill_port 8081

# Kill other common React Native ports
kill_port 8082
kill_port 19000
kill_port 19001

# Kill any running Metro/React Native processes by name
echo "🔍 Killing Metro and React Native processes..."
pkill -f "react-native" 2>/dev/null || true
pkill -f "Metro" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "node.*8081" 2>/dev/null || true

# Wait a moment for processes to fully terminate
echo "⏳ Waiting for processes to terminate..."
sleep 2

# Setup NVM and Node.js
echo "🔧 Setting up Node.js environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Use Node.js 22.20.0
echo "📦 Switching to Node.js 22.20.0..."
nvm use 22.20.0

# Verify Node.js is working
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Clear Metro cache
echo "🗑️  Clearing Metro cache..."
npx react-native start --reset-cache &

# Store the PID for potential cleanup
DEV_SERVER_PID=$!

echo "🚀 React Native development server started!"
echo "📱 Server running on http://localhost:8081"
echo "🔄 To restart again, run: ./restart-dev.sh"
echo "🛑 To stop the server, press Ctrl+C or run: kill $DEV_SERVER_PID"

# Wait for the process to finish or be interrupted
wait $DEV_SERVER_PID