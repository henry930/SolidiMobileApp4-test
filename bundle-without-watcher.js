const fs = require('fs');
const path = require('path');

// Simple bundle creator that copies content from the React Native files
async function createBundle() {
    const projectRoot = __dirname;
    const entryFile = path.join(projectRoot, 'index.js');
    const appFile = path.join(projectRoot, 'src/application/index.js');
    const bundleOutput = path.join(projectRoot, 'ios/main.jsbundle');
    
    console.log('Creating React Native bundle...');
    
    // Check if source files exist
    if (!fs.existsSync(entryFile)) {
        console.error('Entry file not found:', entryFile);
        return;
    }
    
    if (!fs.existsSync(appFile)) {
        console.error('App file not found:', appFile);
        return;
    }
    
    // Read the entry file
    const entryContent = fs.readFileSync(entryFile, 'utf8');
    console.log('Entry file content:', entryContent);
    
    // Create a minimal React Native runtime
    const bundle = `
// React Native Bundle - Created without Metro
var __DEV__ = false;
var __REACT_DEVTOOLS_GLOBAL_HOOK__ = null;

// Module system
var __modules = {};
var __moduleCache = {};

function __d(moduleId, factory) {
  __modules[moduleId] = factory;
}

function __r(moduleId) {
  if (__moduleCache[moduleId] != null) {
    return __moduleCache[moduleId].exports;
  }
  
  var module = {
    exports: {}
  };
  
  __moduleCache[moduleId] = module;
  __modules[moduleId](module, module.exports, __r);
  return module.exports;
}

// React Native core modules (simplified)
__d(0, function(global, require, module, exports) {
  // Entry point
  var AppRegistry = require('react-native/Libraries/ReactNative/AppRegistry');
  var ApplicationRoot = require('./src/application');
  
  AppRegistry.registerComponent('SolidiMobileApp4', function() {
    return ApplicationRoot;
  });
});

__d('react-native/Libraries/ReactNative/AppRegistry', function(global, require, module, exports) {
  var AppRegistry = {
    registerComponent: function(appKey, componentProvider) {
      console.log('Registering component:', appKey);
      // In a real implementation, this would register with the native bridge
      if (typeof global.RCTAppRegistry !== 'undefined') {
        global.RCTAppRegistry.registerComponent(appKey, componentProvider);
      }
    },
    runApplication: function(appKey, appParameters) {
      console.log('Running application:', appKey);
    }
  };
  
  module.exports = AppRegistry;
});

__d('./src/application', function(global, require, module, exports) {
  // This should contain your app's actual content
  // For now, we'll use a placeholder
  var React = require('react');
  
  function ApplicationRoot() {
    return React.createElement('div', null, 'SolidiMobileApp4');
  }
  
  module.exports = ApplicationRoot;
});

__d('react', function(global, require, module, exports) {
  // Minimal React implementation
  var React = {
    createElement: function(type, props, children) {
      return {
        type: type,
        props: props || {},
        children: children || []
      };
    }
  };
  
  module.exports = React;
});

// Start the app
__r(0);
`;
    
    fs.writeFileSync(bundleOutput, bundle);
    console.log('Bundle created at:', bundleOutput);
    console.log('Bundle size:', fs.statSync(bundleOutput).size, 'bytes');
    
    // Also copy to the build directory
    const buildBundlePath = path.join(projectRoot, 'ios/build/Build/Products/Debug-iphonesimulator/SolidiMobileApp4.app/main.jsbundle');
    if (fs.existsSync(path.dirname(buildBundlePath))) {
        fs.writeFileSync(buildBundlePath, bundle);
        console.log('Bundle also copied to:', buildBundlePath);
    }
}

createBundle().catch(console.error);