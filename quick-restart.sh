#!/bin/bash

# Quick Metro Restart Script
# Usage: ./quick-restart.sh [ip_address]

PROJECT_DIR="/Users/henry/Solidi/SolidiMobileApp4"

# Get current IP if not provided
if [ -z "$1" ]; then
    IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')
else
    IP=$1
fi

echo "� Killing Metro processes..."
killall -9 node 2>/dev/null || echo "No node processes to kill"
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 2

echo "🔧 Updating AppDelegate with IP: $IP"
cd "$PROJECT_DIR"
sed -i '' "s|http://[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}:8081|http://$IP:8081|g" ios/SolidiMobileApp4/AppDelegate.mm

echo "🚀 Starting Metro on $IP:8081..."
npx react-native start --host "$IP" &

echo "✅ Metro restarted! Use Cmd+R in simulator to reload."
echo "💡 To rebuild: npx react-native run-ios --simulator=\"iPhone 15\""