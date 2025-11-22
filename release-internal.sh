#!/bin/bash

# Solidi Mobile App - Internal Testing Release Script
# This script automates: version increment, AAB build, and Google Play upload

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GRADLE_FILE="${PROJECT_ROOT}/android/app/build.gradle"
DISTRIBUTION_DIR="${PROJECT_ROOT}/distribution"
AAB_OUTPUT="${PROJECT_ROOT}/android/app/build/outputs/bundle/release/app-release.aab"

# Google Play configuration
PACKAGE_NAME="com.solidimobileapp4"  # Update with your actual package name
TRACK="internal"  # internal, alpha, beta, or production
SERVICE_ACCOUNT_JSON="${PROJECT_ROOT}/android/google-play-service-account.json"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Solidi Internal Release Builder${NC}"
echo -e "${BLUE}================================${NC}\n"

# Step 1: Get current version
echo -e "${YELLOW}[1/6] Reading current version...${NC}"
CURRENT_VERSION_CODE=$(grep "versionCode" "$GRADLE_FILE" | awk '{print $2}')
CURRENT_VERSION_NAME=$(grep "versionName" "$GRADLE_FILE" | awk '{print $2}' | tr -d '"')

echo -e "Current version: ${GREEN}${CURRENT_VERSION_NAME}${NC} (code: ${CURRENT_VERSION_CODE})"

# Step 2: Increment version
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
echo -e "\n${YELLOW}[2/6] Incrementing version code...${NC}"
echo -e "New version code: ${GREEN}${NEW_VERSION_CODE}${NC}"

# Ask for new version name (optional)
read -p "Enter new version name (press Enter to keep ${CURRENT_VERSION_NAME}): " NEW_VERSION_NAME
if [ -z "$NEW_VERSION_NAME" ]; then
    NEW_VERSION_NAME=$CURRENT_VERSION_NAME
fi

echo -e "New version: ${GREEN}${NEW_VERSION_NAME}${NC} (code: ${NEW_VERSION_CODE})"

# Update build.gradle
sed -i '' "s/versionCode ${CURRENT_VERSION_CODE}/versionCode ${NEW_VERSION_CODE}/" "$GRADLE_FILE"
sed -i '' "s/versionName \"${CURRENT_VERSION_NAME}\"/versionName \"${NEW_VERSION_NAME}\"/" "$GRADLE_FILE"

echo -e "${GREEN}✓ Version updated in build.gradle${NC}"

# Step 3: Clean previous builds
echo -e "\n${YELLOW}[3/6] Cleaning previous builds...${NC}"
cd "${PROJECT_ROOT}/android"
./gradlew clean
echo -e "${GREEN}✓ Clean completed${NC}"

# Step 4: Build release AAB
echo -e "\n${YELLOW}[4/6] Building release AAB bundle...${NC}"
./gradlew bundleRelease

if [ ! -f "$AAB_OUTPUT" ]; then
    echo -e "${RED}✗ Build failed: AAB file not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Step 5: Copy to distribution folder
echo -e "\n${YELLOW}[5/6] Copying AAB to distribution folder...${NC}"
TIMESTAMP=$(date +%Y%m%d)
DISTRIBUTION_AAB="${DISTRIBUTION_DIR}/SolidiMobileApp-v${NEW_VERSION_NAME}-versionCode${NEW_VERSION_CODE}-${TIMESTAMP}.aab"

mkdir -p "$DISTRIBUTION_DIR"
cp "$AAB_OUTPUT" "$DISTRIBUTION_AAB"

AAB_SIZE=$(du -h "$DISTRIBUTION_AAB" | cut -f1)
echo -e "${GREEN}✓ AAB copied: ${DISTRIBUTION_AAB}${NC}"
echo -e "  Size: ${AAB_SIZE}"

# Step 6: Upload to Google Play (requires fastlane or manual upload)
echo -e "\n${YELLOW}[6/6] Uploading to Google Play Console...${NC}"

# Check if fastlane is installed
if command -v fastlane &> /dev/null; then
    echo -e "${BLUE}Using fastlane for upload...${NC}"
    
    # Check if service account JSON exists
    if [ ! -f "$SERVICE_ACCOUNT_JSON" ]; then
        echo -e "${YELLOW}⚠ Service account JSON not found at: ${SERVICE_ACCOUNT_JSON}${NC}"
        echo -e "${YELLOW}Please set up Google Play API access first.${NC}"
        echo -e "${YELLOW}See: https://docs.fastlane.tools/actions/upload_to_play_store/${NC}\n"
        
        # Show manual upload instructions
        echo -e "${BLUE}Manual upload steps:${NC}"
        echo -e "1. Go to: https://play.google.com/console"
        echo -e "2. Select your app: Solidi Mobile App"
        echo -e "3. Navigate to: Release > Testing > Internal testing"
        echo -e "4. Click 'Create new release'"
        echo -e "5. Upload: ${DISTRIBUTION_AAB}"
        echo -e "6. Fill in release notes and click 'Review release'\n"
        
        open "https://play.google.com/console"
        open "$DISTRIBUTION_DIR"
        exit 0
    fi
    
    # Use fastlane to upload
    cd "$PROJECT_ROOT"
    fastlane supply \
        --aab "$DISTRIBUTION_AAB" \
        --track "$TRACK" \
        --package_name "$PACKAGE_NAME" \
        --json_key "$SERVICE_ACCOUNT_JSON" \
        --skip_upload_metadata \
        --skip_upload_images \
        --skip_upload_screenshots
    
    echo -e "${GREEN}✓ Upload successful!${NC}"
    
else
    echo -e "${YELLOW}⚠ Fastlane not installed. Opening manual upload...${NC}\n"
    
    echo -e "${BLUE}Manual upload steps:${NC}"
    echo -e "1. Go to: https://play.google.com/console"
    echo -e "2. Select your app: Solidi Mobile App"
    echo -e "3. Navigate to: Release > Testing > Internal testing"
    echo -e "4. Click 'Create new release'"
    echo -e "5. Upload: ${DISTRIBUTION_AAB}"
    echo -e "6. Fill in release notes and click 'Review release'\n"
    
    # Open Google Play Console and distribution folder
    open "https://play.google.com/console"
    open "$DISTRIBUTION_DIR"
fi

# Summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Release Build Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "Version: ${GREEN}${NEW_VERSION_NAME}${NC} (code: ${NEW_VERSION_CODE})"
echo -e "AAB Location: ${BLUE}${DISTRIBUTION_AAB}${NC}"
echo -e "Size: ${AAB_SIZE}\n"

echo -e "${BLUE}Next steps:${NC}"
echo -e "1. If not auto-uploaded, manually upload AAB to Google Play Console"
echo -e "2. Add release notes describing changes"
echo -e "3. Review and publish to internal testing track"
echo -e "4. Share testing link with internal testers\n"

# Generate release notes template
RELEASE_NOTES="${DISTRIBUTION_DIR}/RELEASE_NOTES_v${NEW_VERSION_NAME}.md"
if [ ! -f "$RELEASE_NOTES" ]; then
    cat > "$RELEASE_NOTES" << EOF
# Release Notes - v${NEW_VERSION_NAME} (Build ${NEW_VERSION_CODE})

**Release Date:** $(date +"%B %d, %Y")

## What's New

- [Add new features here]
- [Add improvements here]
- [Add bug fixes here]

## Technical Details

- **Version Name:** ${NEW_VERSION_NAME}
- **Version Code:** ${NEW_VERSION_CODE}
- **Target SDK:** 35
- **Min SDK:** 21
- **Bundle Size:** ${AAB_SIZE}

## Testing Notes

### Features to Test
- [ ] Balance API loading
- [ ] Send/Withdraw modal
- [ ] Transaction history infinite scroll
- [ ] Asset list display

### Known Issues
- None

## Installation

This build is available on Google Play Console Internal Testing track.

EOF
    echo -e "${GREEN}✓ Release notes template created: ${RELEASE_NOTES}${NC}"
    echo -e "${YELLOW}Please update with actual changes before publishing.${NC}\n"
fi

exit 0
