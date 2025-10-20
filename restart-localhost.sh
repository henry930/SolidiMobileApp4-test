#!/bin/bash

# Localhost Metro Restart Script
# Always uses localhost for stability

PROJECT_DIR="/Users/henry/Solidi/SolidiMobileApp4"

echo "🏠 Using localhost mode for stability"
echo "🔪 Killing Metro processes..."
killall -9 node 2>/dev/null || echo "No node processes to kill"
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 2

echo "🔧 Ensuring AppDelegate uses localhost..."
cd "$PROJECT_DIR"
sed -i '' 's|http://[^:]*:8081|http://localhost:8081|g' ios/SolidiMobileApp4/AppDelegate.mm

echo "🚀 Starting Metro on localhost:8081..."
npx react-native start &

sleep 3
echo ""
echo "✅ Metro started on localhost!"
echo "💡 To reload: curl -X POST http://localhost:8081/reload"
echo "💡 To test connection: curl http://localhost:8081/status"
echo "💡 To rebuild: npx react-native run-ios --simulator=\"iPhone 15\""