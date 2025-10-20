# iPhone Device Development Setup

## 🚀 Quick Start for iPhone Device Testing

### Prerequisites
1. **iPhone connected via USB cable**
2. **iPhone and Mac on same WiFi network** 
3. **Developer Mode enabled on iPhone**
4. **Computer trusted on iPhone**

### Development Server Info
- **Computer IP**: `192.168.0.65`
- **Metro Port**: `8081`
- **Device URL**: `http://192.168.0.65:8081`

---

## 📱 Commands for iPhone Device Development

### 1. Check Network Setup
```bash
./check-network.sh
```
Verifies IP address, WiFi connectivity, and port availability.

### 2. Start Metro Server for Devices
```bash
npm run start:device
# or
./start-device-server.sh
```
Starts Metro bundler accessible to physical devices.

### 3. Build and Install on iPhone
```bash
npm run ios:device
# or
./build-device.sh
```
Builds and installs the app on connected iPhone.

---

## 🔧 iPhone Setup Steps

### Enable Developer Mode
1. **Settings** > **Privacy & Security**
2. Scroll down to **Developer Mode**
3. Toggle **Developer Mode** ON
4. Restart iPhone when prompted

### Trust Computer
1. Connect iPhone via USB
2. Unlock iPhone
3. Tap **Trust** when prompted
4. Enter iPhone passcode

---

## 🌐 Network Configuration

### If App Shows Connection Errors:
1. **Shake iPhone** to open Developer Menu
2. Select **Configure Bundle & Delta Server**
3. Change **Bundle Location** to:
   ```
   192.168.0.65:8081
   ```
4. Tap **Apply Changes**

### Alternative Method:
1. **Shake iPhone** → **Settings**
2. **Debug Server Host & Port for Device**
3. Enter: `192.168.0.65:8081`

---

## 🐛 Troubleshooting

### Metro Server Not Accessible
- Check firewall allows port 8081
- Verify both devices on same network
- Restart Metro: `npm run start:device`

### Build Fails
- Check Xcode signing configuration
- Verify iOS deployment target
- Try: `cd ios && pod install && cd ..`

### App Won't Connect
- Check Bundle Location in app settings
- Verify Metro server is running
- Restart Metro server and reload app

---

## 📋 Development Workflow

1. **Start Metro**: `npm run start:device`
2. **Build App**: `npm run ios:device` 
3. **Open App** on iPhone
4. **Develop** with live reload
5. **Debug** using iPhone Developer Menu (shake to open)

---

## 🔄 Alternative Network Check
```bash
# Check current IP
ifconfig | grep "inet " | grep -v "127.0.0.1"

# Check Metro status
curl http://192.168.0.65:8081/status

# Test reload
curl -X POST http://192.168.0.65:8081/reload
```

The Metro server is now configured to accept connections from your iPhone device at `http://192.168.0.65:8081`!