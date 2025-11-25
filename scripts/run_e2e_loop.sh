#!/bin/bash

# Add Maestro to PATH
export PATH="$PATH":"$HOME/.maestro/bin"

echo "Running Maestro E2E Tests..."
maestro test .maestro/flow.yaml

if [ $? -eq 0 ]; then
    echo "✅ Tests Passed!"
    exit 0
else
    echo "❌ Tests Failed!"
    echo "Capturing logs..."
    
    # Capture last 2 minutes of logs from the app
    xcrun simctl spawn booted log show --predicate 'process == "SolidiMobileApp4"' --last 2m > e2e_failure_logs.txt
    
    echo "Logs saved to e2e_failure_logs.txt"
    exit 1
fi
