#!/bin/bash

# Metro Interaction Script
# Provides multiple ways to control Metro and reload the app

IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')

echo "🎮 Metro Control Panel"
echo "====================="
echo "🌐 Current IP: $IP"
echo ""
echo "Choose an action:"
echo "1. 🔄 Reload App"
echo "2. 📊 Check Status"
echo "3. 🔧 Send Dev Menu Command"
echo "4. 🎯 Open Dev Menu in Simulator"
echo "5. 🧹 Clear Metro Cache"
echo "6. 📱 Manual Instructions"
echo "0. ❌ Exit"
echo ""

read -p "Enter choice (0-6): " choice

case $choice in
    1)
        echo "🔄 Reloading app..."
        curl -X POST http://localhost:8081/reload 2>/dev/null && echo "✅ Reload sent" || echo "❌ Failed"
        curl -X POST "http://$IP:8081/reload" 2>/dev/null && echo "✅ IP reload sent" || echo "❌ IP failed"
        ;;
    
    2)
        echo "📊 Checking Metro status..."
        if curl -s http://localhost:8081/status >/dev/null 2>&1; then
            echo "✅ Metro is running"
            echo "📡 Metro info:"
            curl -s http://localhost:8081/ | head -5
        else
            echo "❌ Metro is not running"
        fi
        ;;
    
    3)
        echo "🔧 Opening Dev Menu..."
        curl -X POST http://localhost:8081/open-stack-frame 2>/dev/null || \
        curl -X POST http://localhost:8081/devtools 2>/dev/null || \
        echo "❌ Dev menu command failed"
        ;;
    
    4)
        echo "🎯 Sending shake command to simulator..."
        xcrun simctl device booted set_device_orientation left right || \
        echo "💡 Manually shake: Device > Shake (Cmd+Ctrl+Z)"
        ;;
    
    5)
        echo "🧹 Clearing Metro cache..."
        curl -X DELETE http://localhost:8081/cache 2>/dev/null && echo "✅ Cache cleared" || echo "❌ Failed to clear cache"
        ;;
    
    6)
        echo "📱 Manual Reload Instructions:"
        echo ""
        echo "🔸 In iOS Simulator:"
        echo "   • Press Cmd+R"
        echo "   • Or: Device menu > Shake > Reload"
        echo "   • Or: Hardware menu > Shake Gesture > Reload"
        echo ""
        echo "🔸 In Metro Terminal:"
        echo "   • Press 'r' key"
        echo "   • Press 'd' for dev menu"
        echo ""
        echo "🔸 Via Command Line:"
        echo "   • curl -X POST http://localhost:8081/reload"
        echo "   • curl -X POST http://$IP:8081/reload"
        echo ""
        echo "🔸 Alternative:"
        echo "   • Kill Metro: killall -9 node"
        echo "   • Restart: ./quick-restart.sh"
        ;;
    
    0)
        echo "👋 Goodbye!"
        exit 0
        ;;
    
    *)
        echo "❌ Invalid choice"
        ;;
esac

echo ""
echo "💡 Run this script again: ./metro-control.sh"