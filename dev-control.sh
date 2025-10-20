#!/bin/bash

# SolidiMobileApp4 Development Control Script
# This script provides comprehensive control over Metro server, iOS simulators, and logging

set -e

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/Users/henry/Solidi/SolidiMobileApp4"
APP_NAME="SolidiMobileApp4"

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to get current IP address
get_current_ip() {
    ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}'
}

# Function to kill Metro processes
kill_metro() {
    print_color $YELLOW "🔪 Killing existing Metro processes..."
    killall -9 node 2>/dev/null || echo "No node processes to kill"
    sleep 2
}

# Function to start Metro server
start_metro() {
    local ip=$1
    local reset_cache=$2
    
    print_color $BLUE "🚀 Starting Metro server on IP: $ip"
    
    cd "$PROJECT_DIR"
    
    if [ "$reset_cache" = "true" ]; then
        print_color $YELLOW "🧹 Resetting Metro cache..."
        npx react-native start --host "$ip" --reset-cache &
    else
        npx react-native start --host "$ip" &
    fi
    
    METRO_PID=$!
    print_color $GREEN "✅ Metro server started with PID: $METRO_PID"
    sleep 3
}

# Function to list available simulators
list_simulators() {
    print_color $CYAN "📱 Available iOS Simulators:"
    xcrun simctl list devices available | grep -E "iPhone|iPad" | grep -v "Apple Watch" | nl -v0
}

# Function to get simulator name by index
get_simulator_name() {
    local index=$1
    xcrun simctl list devices available | grep -E "iPhone|iPad" | grep -v "Apple Watch" | sed -n "$((index+1))p" | sed 's/.*iPhone/iPhone/' | sed 's/.*iPad/iPad/' | awk '{print $1" "$2}' | sed 's/ (.*//'
}

# Function to start live logging
start_live_logging() {
    print_color $PURPLE "📊 Starting live logging in new terminal..."
    
    # Create a temporary script for logging
    cat > /tmp/solidi_logging.sh << 'EOF'
#!/bin/bash
echo "🔍 Starting SolidiMobileApp4 Live Logging..."
echo "Press Ctrl+C to stop logging"
echo "=========================="

# Start iOS device logs
npx react-native log-ios --app-id="com.solidifx.SolidiMobileApp4" 2>/dev/null &
IOS_LOG_PID=$!

# Start Metro logs if available
curl -s http://localhost:8081/logs 2>/dev/null || echo "Metro logs not available"

# Keep the terminal open
wait $IOS_LOG_PID
EOF
    
    chmod +x /tmp/solidi_logging.sh
    
    # Open new terminal with logging
    osascript << EOF
tell application "Terminal"
    do script "/tmp/solidi_logging.sh"
end tell
EOF
}

# Function to reload app
reload_app() {
    local ip=$1
    print_color $YELLOW "🔄 Reloading app..."
    
    # Try multiple reload methods
    curl -X POST "http://$ip:8081/reload" 2>/dev/null || \
    curl -X POST "http://localhost:8081/reload" 2>/dev/null || \
    print_color $RED "❌ Failed to reload app via HTTP"
    
    print_color $GREEN "✅ Reload signal sent"
}

# Function to rebuild and run app
rebuild_app() {
    local ip=$1
    local simulator=$2
    
    print_color $YELLOW "🔨 Building and running app on $simulator..."
    
    cd "$PROJECT_DIR"
    
    # Clean build if needed
    if [ "$CLEAN_BUILD" = "true" ]; then
        print_color $YELLOW "🧹 Cleaning build..."
        cd ios
        xcodebuild clean -workspace SolidiMobileApp4.xcworkspace -scheme SolidiMobileApp4
        cd ..
    fi
    
    # Run the app
    if [ -n "$simulator" ]; then
        npx react-native run-ios --simulator="$simulator" --no-packager
    else
        npx react-native run-ios --no-packager
    fi
}

# Function to update IP in AppDelegate
update_app_delegate_ip() {
    local ip=$1
    print_color $BLUE "🔧 Updating AppDelegate.mm with IP: $ip"
    
    # Create backup
    cp "$PROJECT_DIR/ios/SolidiMobileApp4/AppDelegate.mm" "$PROJECT_DIR/ios/SolidiMobileApp4/AppDelegate.mm.backup"
    
    # Update IP address
    sed -i '' "s|http://[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}:8081|http://$ip:8081|g" "$PROJECT_DIR/ios/SolidiMobileApp4/AppDelegate.mm"
    
    print_color $GREEN "✅ AppDelegate.mm updated"
}

# Main menu function
show_menu() {
    clear
    print_color $CYAN "🚀 SolidiMobileApp4 Development Control"
    print_color $CYAN "======================================"
    echo
    print_color $BLUE "Current IP: $(get_current_ip)"
    echo
    print_color $GREEN "1. 🔄 Restart Metro Server"
    print_color $GREEN "2. 📱 Choose Simulator & Rebuild"
    print_color $GREEN "3. 🔄 Reload Current App"
    print_color $GREEN "4. 📊 Start Live Logging"
    print_color $GREEN "5. 🔧 Update IP in AppDelegate"
    print_color $GREEN "6. 🧹 Clean Build & Restart"
    print_color $GREEN "7. 📋 Show All Status"
    print_color $RED "0. ❌ Exit"
    echo
}

# Function to show status
show_status() {
    print_color $CYAN "📊 System Status"
    print_color $CYAN "==============="
    
    # Check Metro
    if curl -s http://localhost:8081/ > /dev/null 2>&1; then
        print_color $GREEN "✅ Metro Server: Running on localhost:8081"
    else
        print_color $RED "❌ Metro Server: Not running"
    fi
    
    # Check IP Metro
    local ip=$(get_current_ip)
    if curl -s "http://$ip:8081/" > /dev/null 2>&1; then
        print_color $GREEN "✅ Metro Server: Running on $ip:8081"
    else
        print_color $RED "❌ Metro Server: Not running on $ip:8081"
    fi
    
    # Check simulators
    print_color $BLUE "📱 Active Simulators:"
    xcrun simctl list devices | grep "Booted" || print_color $YELLOW "No simulators running"
    
    echo
    print_color $YELLOW "Press any key to continue..."
    read -n 1
}

# Main script execution
main() {
    cd "$PROJECT_DIR"
    
    while true; do
        show_menu
        read -p "Choose an option: " choice
        
        case $choice in
            1)
                current_ip=$(get_current_ip)
                print_color $BLUE "Current IP: $current_ip"
                read -p "Use current IP? (y/n): " use_current
                
                if [ "$use_current" = "n" ]; then
                    read -p "Enter IP address: " custom_ip
                    current_ip=$custom_ip
                fi
                
                read -p "Reset Metro cache? (y/n): " reset_cache
                reset_cache_flag=""
                if [ "$reset_cache" = "y" ]; then
                    reset_cache_flag="true"
                fi
                
                kill_metro
                update_app_delegate_ip "$current_ip"
                start_metro "$current_ip" "$reset_cache_flag"
                
                print_color $GREEN "✅ Metro server restarted!"
                sleep 2
                ;;
                
            2)
                list_simulators
                read -p "Choose simulator index (0-based): " sim_index
                
                simulator_name=$(get_simulator_name $sim_index)
                print_color $BLUE "Selected: $simulator_name"
                
                read -p "Clean build? (y/n): " clean_build
                if [ "$clean_build" = "y" ]; then
                    export CLEAN_BUILD="true"
                fi
                
                current_ip=$(get_current_ip)
                rebuild_app "$current_ip" "$simulator_name"
                ;;
                
            3)
                current_ip=$(get_current_ip)
                reload_app "$current_ip"
                sleep 1
                ;;
                
            4)
                start_live_logging
                print_color $GREEN "✅ Live logging started in new terminal"
                sleep 2
                ;;
                
            5)
                current_ip=$(get_current_ip)
                print_color $BLUE "Current IP: $current_ip"
                read -p "Use current IP? (y/n): " use_current
                
                if [ "$use_current" = "n" ]; then
                    read -p "Enter IP address: " custom_ip
                    current_ip=$custom_ip
                fi
                
                update_app_delegate_ip "$current_ip"
                sleep 1
                ;;
                
            6)
                print_color $YELLOW "🧹 Performing clean build..."
                kill_metro
                
                # Clean everything
                cd "$PROJECT_DIR"
                rm -rf node_modules/.cache
                cd ios
                xcodebuild clean -workspace SolidiMobileApp4.xcworkspace -scheme SolidiMobileApp4
                cd ..
                
                current_ip=$(get_current_ip)
                update_app_delegate_ip "$current_ip"
                start_metro "$current_ip" "true"
                
                print_color $GREEN "✅ Clean build completed!"
                sleep 2
                ;;
                
            7)
                show_status
                ;;
                
            0)
                print_color $YELLOW "👋 Goodbye!"
                exit 0
                ;;
                
            *)
                print_color $RED "❌ Invalid option"
                sleep 1
                ;;
        esac
    done
}

# Handle script interruption
trap 'print_color $RED "Script interrupted. Cleaning up..."; kill_metro; exit 1' INT

# Run main function
main