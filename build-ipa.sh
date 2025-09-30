#!/bin/bash

# SolidiMobileApp4 - IPA Build and TestFlight Upload Script
# This script automates the process of building an IPA and uploading to TestFlight

set -e

echo "🚀 Building IPA for SolidiMobileApp4 and uploading to TestFlight"
echo "================================================================"

# Configuration
PROJECT_DIR="/Users/henry/Documents/SolidiMobileApp4"
IOS_DIR="$PROJECT_DIR/ios"
SCHEME_NAME="SolidiMobileApp4"
WORKSPACE_NAME="SolidiMobileApp4.xcworkspace"
BUILD_DIR="$PROJECT_DIR/build"
ARCHIVE_PATH="$BUILD_DIR/SolidiMobileApp4.xcarchive"
EXPORT_PATH="$BUILD_DIR/ipa"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📍 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Environment Check
print_step 1 "Checking environment and prerequisites"

cd "$PROJECT_DIR"

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    print_error "Xcode command line tools not found. Please install Xcode."
    exit 1
fi

# Check if we're in a React Native project
if [ ! -f "package.json" ] || [ ! -d "ios" ]; then
    print_error "This doesn't appear to be a React Native project directory."
    exit 1
fi

print_success "Environment check passed"

# Step 2: Setup Node and dependencies
print_step 2 "Setting up Node.js environment and dependencies"

# Setup NVM if available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    print_success "NVM loaded"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js."
    exit 1
fi

print_success "Node.js version: $(node --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_warning "Installing Node.js dependencies..."
    npm install
fi

print_success "Dependencies ready"

# Step 3: iOS Dependencies
print_step 3 "Installing iOS dependencies (CocoaPods)"

cd "$IOS_DIR"

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    print_error "CocoaPods not found. Installing..."
    sudo gem install cocoapods
fi

# Install pods
print_warning "Installing CocoaPods dependencies..."
pod install --repo-update

print_success "iOS dependencies installed"

# Step 4: Clean previous builds
print_step 4 "Cleaning previous builds"

cd "$PROJECT_DIR"

# Clean React Native
npx react-native clean || echo "React Native clean not available, continuing..."

# Clean iOS build folder
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$EXPORT_PATH"

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/SolidiMobileApp4*

cd "$IOS_DIR"
rm -rf build

print_success "Build environment cleaned"

# Step 5: Build Configuration Check
print_step 5 "Checking build configuration"

cd "$IOS_DIR"

# Check if workspace exists
if [ ! -f "$WORKSPACE_NAME" ]; then
    print_error "Workspace file $WORKSPACE_NAME not found in $IOS_DIR"
    exit 1
fi

# List available schemes
echo "Available schemes:"
xcodebuild -workspace "$WORKSPACE_NAME" -list

print_success "Build configuration verified"

# Step 6: Archive the app
print_step 6 "Creating archive (this may take several minutes...)"

cd "$IOS_DIR"

# Build archive for distribution
xcodebuild archive \
    -workspace "$WORKSPACE_NAME" \
    -scheme "$SCHEME_NAME" \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="" \
    CODE_SIGN_IDENTITY="iPhone Distribution" \
    PROVISIONING_PROFILE_SPECIFIER=""

if [ $? -eq 0 ]; then
    print_success "Archive created successfully at $ARCHIVE_PATH"
else
    print_error "Archive creation failed. Check the error messages above."
    exit 1
fi

# Step 7: Export IPA
print_step 7 "Exporting IPA for App Store distribution"

cd "$IOS_DIR"

# Create export options plist
cat > "$BUILD_DIR/ExportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
</dict>
</plist>
EOF

# Export IPA
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist"

if [ $? -eq 0 ]; then
    IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" | head -n 1)
    print_success "IPA exported successfully: $IPA_FILE"
else
    print_error "IPA export failed. Check code signing and provisioning profiles."
    exit 1
fi

# Step 8: Upload to TestFlight
print_step 8 "Uploading to TestFlight"

if [ -z "$IPA_FILE" ]; then
    print_error "IPA file not found"
    exit 1
fi

# Check if altool or xcrun altool is available
if command -v xcrun &> /dev/null; then
    print_warning "Uploading to App Store Connect..."
    
    # You'll need to provide your Apple ID credentials
    echo "Enter your Apple ID:"
    read APPLE_ID
    echo "Enter your App-Specific Password:"
    read -s APP_PASSWORD
    
    xcrun altool --upload-app \
        --type ios \
        --file "$IPA_FILE" \
        --username "$APPLE_ID" \
        --password "$APP_PASSWORD" \
        --verbose
    
    if [ $? -eq 0 ]; then
        print_success "Upload to TestFlight completed successfully!"
    else
        print_error "Upload to TestFlight failed."
        exit 1
    fi
else
    print_warning "xcrun altool not available. You can manually upload the IPA:"
    echo "1. Open Xcode"
    echo "2. Go to Window > Organizer"
    echo "3. Select your app and click 'Distribute App'"
    echo "4. Choose 'App Store Connect' and follow the wizard"
    echo ""
    echo "Or use Application Loader / Transporter app:"
    echo "IPA Location: $IPA_FILE"
fi

# Step 9: Summary
print_step 9 "Build Summary"

echo ""
echo "📱 App Information:"
echo "   Name: SolidiMobileApp4"
echo "   Archive: $ARCHIVE_PATH"
echo "   IPA: $IPA_FILE"
echo ""
echo "📋 Next Steps:"
echo "   1. Check App Store Connect for processing status"
echo "   2. Add tester groups in TestFlight"
echo "   3. Submit for internal/external testing"
echo ""
print_success "Build and upload process completed!"

exit 0