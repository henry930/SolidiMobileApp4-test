# Development Server Management Scripts

This directory contains convenient scripts to manage the React Native development server without the hassle of manually killing processes and setting up the environment each time.

## Available Scripts

### 1. Full Restart Script: `restart-dev.sh`
- **Usage**: `./restart-dev.sh` or `npm run restart`
- **Purpose**: Complete cleanup and restart of the development server
- **Features**:
  - Kills all Metro bundler processes on ports 8081, 8082, 19000, 19001
  - Kills any React Native/Metro processes by name
  - Sets up NVM environment automatically
  - Switches to Node.js 22.20.0
  - Clears Metro cache for a fresh start
  - Provides detailed logging of each step

### 2. Quick Restart Script: `quick-restart.sh`
- **Usage**: `./quick-restart.sh` or `npm run restart:quick`
- **Purpose**: Fast restart for frequent development iterations
- **Features**:
  - Quick kill of Metro bundler on port 8081
  - Minimal setup for faster startup
  - Silent NVM setup
  - Immediate server start

### 3. NPM Scripts (Added to package.json)
```bash
npm run restart       # Runs the full restart script
npm run restart:quick # Runs the quick restart script
```

## When to Use Which Script

### Use `restart-dev.sh` when:
- First time starting the server for the day
- After system restart or major changes
- When experiencing persistent connection issues
- When you need a completely clean environment

### Use `quick-restart.sh` when:
- During active development with frequent restarts
- After code changes that require a server restart
- When the current server becomes unresponsive
- For quick iterations and testing

## Troubleshooting

### Port Already in Use
Both scripts automatically handle port conflicts by killing existing processes.

### NVM Not Found
If you get "nvm command not found", ensure NVM is properly installed:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
source ~/.zshrc
```

### Permission Denied
If you get permission denied, make the scripts executable:
```bash
chmod +x restart-dev.sh
chmod +x quick-restart.sh
```

## Script Features

- ✅ Automatic process cleanup
- ✅ NVM environment setup
- ✅ Node.js version management
- ✅ Metro cache clearing
- ✅ Detailed logging
- ✅ Error handling
- ✅ Cross-platform compatibility

These scripts eliminate the need to manually run multiple commands and remember the exact sequence needed to properly restart the development environment.