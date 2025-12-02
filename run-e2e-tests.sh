#!/bin/bash
# E2E Test Runner for Recent Bug Fixes
# This script runs Maestro tests to verify all recent fixes

set -e

echo "🚀 Starting E2E Tests for Recent Bug Fixes"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if device is connected
echo "📱 Checking for connected devices..."
if ! adb devices | grep -q "device$" && ! xcrun simctl list devices | grep -q "Booted"; then
    echo -e "${RED}❌ No device or simulator detected${NC}"
    echo "Please connect a device or start a simulator and try again"
    exit 1
fi

echo -e "${GREEN}✅ Device detected${NC}"
echo ""

# Create output directory for test results
OUTPUT_DIR="maestro-test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "📂 Test results will be saved to: $OUTPUT_DIR"
echo ""

# Test 1: Quick Smoke Test
echo -e "${BLUE}Test 1: Quick Smoke Test${NC}"
echo "Testing basic navigation and core functionality..."
if maestro test .maestro/quick_smoke_test.yaml --test-output-dir="$OUTPUT_DIR/smoke-test"; then
    echo -e "${GREEN}✅ Smoke test passed${NC}"
else
    echo -e "${RED}❌ Smoke test failed${NC}"
fi
echo ""

# Test 2: Comprehensive Fixes Test
echo -e "${BLUE}Test 2: Comprehensive Fixes Test${NC}"
echo "Testing all recent bug fixes..."
if maestro test .maestro/comprehensive_fixes_test.yaml --test-output-dir="$OUTPUT_DIR/comprehensive-test"; then
    echo -e "${GREEN}✅ Comprehensive test passed${NC}"
else
    echo -e "${RED}❌ Comprehensive test failed${NC}"
fi
echo ""

# Test 3: Wallet Withdraw (Robust)
echo -e "${BLUE}Test 3: Wallet Withdraw Test${NC}"
echo "Testing wallet withdraw functionality..."
if maestro test .maestro/wallet_withdraw_robust.yaml --test-output-dir="$OUTPUT_DIR/wallet-test"; then
    echo -e "${GREEN}✅ Wallet test passed${NC}"
else
    echo -e "${RED}❌ Wallet test failed${NC}"
fi
echo ""

# Test 4: Login with Biometric
echo -e "${BLUE}Test 4: Biometric Login Test${NC}"
echo "Testing biometric authentication..."
if maestro test .maestro/login_with_biometric_handling.yaml --test-output-dir="$OUTPUT_DIR/biometric-test"; then
    echo -e "${GREEN}✅ Biometric test passed${NC}"
else
    echo -e "${RED}❌ Biometric test failed${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}🎉 Test execution complete!${NC}"
echo ""
echo "📊 Test Results Summary:"
echo "  - Smoke Test: Check $OUTPUT_DIR/smoke-test/"
echo "  - Comprehensive Test: Check $OUTPUT_DIR/comprehensive-test/"
echo "  - Wallet Test: Check $OUTPUT_DIR/wallet-test/"
echo "  - Biometric Test: Check $OUTPUT_DIR/biometric-test/"
echo ""
echo "📸 Screenshots saved in each test directory"
echo ""
