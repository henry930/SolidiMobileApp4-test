#!/bin/bash

# Simple Reload Script for SolidiMobileApp4
# Usage: ./reload.sh

echo "🔄 Reloading SolidiMobileApp4..."

echo "🎯 Sending reload command to localhost..."
if curl -X POST http://localhost:8081/reload 2>/dev/null; then
    echo "✅ Reload command sent successfully!"
else
    echo "❌ Reload failed - is Metro running?"
    echo "💡 Start Metro with: ./restart-localhost.sh"
fi

echo ""
echo "📱 If reload doesn't work, try these manual methods:"
echo "   • Press 'r' in Metro terminal"
echo "   • Press Cmd+R in iOS Simulator"
echo "   • Shake device and select 'Reload'"