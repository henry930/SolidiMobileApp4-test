#!/bin/bash

# Device Development Server Script
# This script starts Metro bundler configured for iPhone device development

echo "🚀 Starting Metro bundler for iPhone device development..."
echo ""

# Get the computer's IP address
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')

echo "📱 Device Development Setup:"
echo "   - Computer IP: $IP_ADDRESS"
echo "   - Metro Port: 8081"
echo "   - Device URL: http://$IP_ADDRESS:8081"
echo ""

# Kill any existing Metro processes
echo "🔄 Cleaning up existing processes..."
killall -9 node 2>/dev/null || echo "No existing node processes to kill"

# Wait a moment for cleanup
sleep 2

echo ""
echo "🌐 Starting Metro bundler on all interfaces..."
echo "   - Simulators can use: http://localhost:8081"
echo "   - Physical devices use: http://$IP_ADDRESS:8081"
echo ""
echo "📝 Make sure your iPhone is connected to the same WiFi network!"
echo ""

# Start Metro with verbose logging and host binding
npx react-native start --host 0.0.0.0 --port 8081 --verbose

echo ""
echo "❌ Metro bundler stopped."