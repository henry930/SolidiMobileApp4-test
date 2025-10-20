#!/bin/bash

# Live Logging Script for SolidiMobileApp4
# Opens multiple logging streams in separate terminal windows

APP_NAME="SolidiMobileApp4"
BUNDLE_ID="com.solidifx.SolidiMobileApp4"

echo "🔍 Starting comprehensive logging for $APP_NAME..."

# Function to open new terminal with command
open_log_terminal() {
    local title=$1
    local command=$2
    
    osascript << EOF
tell application "Terminal"
    set newTab to do script "$command"
    set custom title of newTab to "$title"
end tell
EOF
}

# Start iOS device logs
echo "📱 Starting iOS device logs..."
open_log_terminal "iOS Device Logs" "echo '📱 iOS Device Logs for $APP_NAME'; echo 'Press Ctrl+C to stop'; npx react-native log-ios"

sleep 1

# Start Metro logs
echo "🌐 Starting Metro logs..."
open_log_terminal "Metro Logs" "echo '🌐 Metro Server Logs'; echo 'Monitoring Metro on port 8081'; while true; do curl -s http://localhost:8081/logs 2>/dev/null || echo 'Metro not available'; sleep 5; done"

sleep 1

# Start system logs for the app
echo "🖥️ Starting system logs..."
open_log_terminal "System Logs" "echo '🖥️ System Logs for $APP_NAME'; echo 'Press Ctrl+C to stop'; log stream --predicate 'subsystem CONTAINS \"$BUNDLE_ID\"' --level debug"

sleep 1

# Start network monitoring
echo "🌐 Starting network monitoring..."
open_log_terminal "Network Monitor" "echo '🌐 Network Monitor'; echo 'Monitoring Metro connections'; while true; do echo '--- $(date) ---'; lsof -i :8081 2>/dev/null || echo 'No connections on port 8081'; sleep 10; done"

echo "✅ All logging terminals opened!"
echo "💡 Tips:"
echo "   - iOS logs show app crashes and console.log output"
echo "   - Metro logs show bundling and reload activity"
echo "   - System logs show detailed system-level app activity"
echo "   - Network monitor shows Metro connection status"
echo ""
echo "🔄 To reload app: curl -X POST http://localhost:8081/reload"
echo "📱 To restart simulator: xcrun simctl shutdown all && open -a Simulator"