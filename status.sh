#!/bin/bash

# Metro Status Checker
# Usage: ./status.sh

IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')

echo "📊 Metro Server Status Check"
echo "=========================="
echo "🌐 Current IP: $IP"
echo ""

# Check localhost
echo "🔍 Checking localhost:8081..."
if curl -s http://localhost:8081/status >/dev/null 2>&1; then
    echo "✅ Metro running on localhost:8081"
else
    echo "❌ Metro NOT running on localhost:8081"
fi

# Check IP
echo "🔍 Checking $IP:8081..."
if curl -s "http://$IP:8081/status" >/dev/null 2>&1; then
    echo "✅ Metro running on $IP:8081"
else
    echo "❌ Metro NOT running on $IP:8081"
fi

# Check processes
echo ""
echo "🔍 Metro processes:"
ps aux | grep -E "(metro|react-native)" | grep -v grep || echo "No Metro processes found"

echo ""
echo "🔍 Port 8081 usage:"
lsof -i :8081 2>/dev/null || echo "Port 8081 is free"

echo ""
echo "💡 To start Metro: ./quick-restart.sh"
echo "💡 To reload app: ./reload.sh"