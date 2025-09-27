#!/bin/bash

# Temporarily bypass Ruby version constraint for CocoaPods
cd "$(dirname "$0")/ios"

# Move .ruby-version temporarily
if [ -f "../.ruby-version" ]; then
    mv "../.ruby-version" "../.ruby-version.temp"
fi

# Unset rbenv version
unset RBENV_VERSION

# Try different pod installation methods
if command -v pod >/dev/null 2>&1; then
    echo "Installing pods with current pod installation..."
    pod install --repo-update
elif command -v /usr/local/bin/pod >/dev/null 2>&1; then
    echo "Installing pods with Homebrew pod..."
    /usr/local/bin/pod install --repo-update
else
    echo "CocoaPods not found. Trying system Ruby..."
    sudo gem install cocoapods --no-document
    pod install --repo-update
fi

# Restore .ruby-version
if [ -f "../.ruby-version.temp" ]; then
    mv "../.ruby-version.temp" "../.ruby-version"
fi