#!/bin/bash
# Capture iOS simulator console logs
echo "Capturing logs from iOS Simulator..."
echo "Press Ctrl+C to stop"

# Get booted simulator UDID
SIMULATOR_UDID=$(xcrun simctl list devices | grep "Booted" | grep -oE '\([A-Z0-9-]+\)' | tr -d '()')

if [ -z "$SIMULATOR_UDID" ]; then
    echo "No booted simulator found"
    exit 1
fi

echo "Found simulator: $SIMULATOR_UDID"
echo "Logging to: logs/simulator-console.log"

# Stream logs to file
xcrun simctl spawn booted log stream --level debug --predicate 'eventMessage contains "ASSETS" OR eventMessage contains "getAvailableAssets" OR eventMessage contains "BALANCE" OR eventMessage contains "BUY" OR eventMessage contains "💎" OR eventMessage contains "🔍"' 2>&1 | tee logs/simulator-console.log
