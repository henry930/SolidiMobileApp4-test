#!/bin/bash

echo "# Solidi Mobile App - Complete API Documentation"
echo "## Generated from Source Code Analysis"
echo "## Date: $(date '+%B %d, %Y')"
echo ""
echo "## Base Configuration"
echo "- **Base URL**: \`https://DOMAIN/api2/v1/\`"
echo "- **Test Domain**: \`t2.solidi.co\`"
echo "- **Production Domain**: \`www.solidi.co\`"
echo "- **User Agent**: \`SolidiMobileApp4/1.2.0 (Build 33)\`"
echo ""
echo "## Authentication Methods"
echo ""
echo "### Public Endpoints"
echo "- Method: GET or POST"
echo "- No authentication required"
echo "- Content-Type: application/json"
echo ""
echo "### Private Endpoints"  
echo "- Method: POST (required for HMAC signature)"
echo "- Authentication: HMAC SHA256"
echo "- Headers:"
echo "  - \`API-Key\`: User's API key"
echo "  - \`API-Sign\`: HMAC SHA256 signature"
echo "  - \`Content-Type\`: application/json"
echo "- Body: JSON with \`nonce\` (timestamp * 1000)"
echo ""
echo "## API Endpoints by Category"
echo ""

# Extract all API routes from AppState.js
grep -n "apiRoute:" src/application/data/AppState.js | \
  sed "s/.*apiRoute: *['\"]\\([^'\"]*\\)['\"].*/\\1/" | \
  sort -u | \
  while read route; do
    if [ ! -z "$route" ]; then
      # Check if public or private
      context=$(grep -B5 "apiRoute: *['\"]${route}['\"]" src/application/data/AppState.js | head -6)
      if echo "$context" | grep -q "publicMethod"; then
        type="PUBLIC"
      else
        type="PRIVATE"
      fi
      echo "### \`$route\` [$type]"
      echo ""
    fi
  done

