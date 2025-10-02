#!/bin/bash

# Quick React Native Development Server Restart Script
# Simplified version for frequent use

echo "🔄 Quick restart..."

# Kill Metro bundler
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

# Wait and setup environment
sleep 1
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.20.0 > /dev/null 2>&1

echo "🚀 Starting Metro..."
npm start