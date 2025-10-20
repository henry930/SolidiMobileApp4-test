#!/bin/bash

# Network Setup Checker for iPhone Device Development

echo "🔍 iPhone Device Development Network Checker"
echo "=============================================="
echo ""

# Get computer's IP address
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')

echo "💻 Computer Network Info:"
echo "   - IP Address: $IP_ADDRESS"
echo "   - Metro Port: 8081"
echo "   - Full URL: http://$IP_ADDRESS:8081"
echo ""

# Check WiFi network
echo "📶 WiFi Network:"
WIFI_NETWORK=$(networksetup -getairportnetwork en0 | cut -d':' -f2 | xargs)
if [ "$WIFI_NETWORK" != "" ]; then
    echo "   - Connected to: $WIFI_NETWORK"
else
    echo "   - ⚠️  WiFi not detected or using Ethernet"
fi
echo ""

# Check if Metro server port is available
echo "🌐 Port Check:"
if lsof -i:8081 >/dev/null 2>&1; then
    echo "   - ✅ Port 8081 is in use (Metro may be running)"
    echo "   - Process using port:"
    lsof -i:8081 | head -2
else
    echo "   - ⚪ Port 8081 is available"
fi
echo ""

# Test local connectivity
echo "🔌 Local Connectivity Test:"
if curl -s --connect-timeout 3 "http://localhost:8081/status" >/dev/null 2>&1; then
    echo "   - ✅ localhost:8081 is responding"
else
    echo "   - ⚪ localhost:8081 not responding (normal if Metro not running)"
fi

if curl -s --connect-timeout 3 "http://$IP_ADDRESS:8081/status" >/dev/null 2>&1; then
    echo "   - ✅ $IP_ADDRESS:8081 is responding"
else
    echo "   - ⚪ $IP_ADDRESS:8081 not responding (normal if Metro not running)"
fi
echo ""

echo "📋 Device Setup Checklist:"
echo "   □ iPhone connected to same WiFi network: '$WIFI_NETWORK'"
echo "   □ iPhone connected via USB cable"
echo "   □ iPhone Developer Mode enabled"
echo "   □ Computer trusted on iPhone"
echo "   □ Metro server running: ./start-device-server.sh"
echo "   □ App built for device: npm run ios:device"
echo ""

echo "🚀 Quick Start Commands:"
echo "   1. Start Metro server: npm run start:device"
echo "   2. Build for device: npm run ios:device"
echo "   3. Check this info: ./check-network.sh"
echo ""

echo "🔧 Troubleshooting:"
echo "   - If app can't connect, shake iPhone and set Bundle Location to:"
echo "     http://$IP_ADDRESS:8081"
echo "   - Make sure firewall allows port 8081"
echo "   - Verify both devices are on same network"