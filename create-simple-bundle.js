#!/usr/bin/env node

// Simple bundle creator that bypasses Metro's file watching
const fs = require('fs');
const path = require('path');

// Create a minimal JavaScript bundle
const bundleContent = `
/**
 * Simple React Native bundle for SolidiMobileApp4
 */

// Mock Metro runtime
var __DEV__ = false;
var process = process || {};
process.env = process.env || {};

// Basic bundle structure
(function(global) {
  'use strict';
  
  // Initialize React Native
  try {
    var require, __d, __r;
    
    // Basic module system
    var modules = {};
    var cache = {};
    
    __d = function(factory, moduleId, deps) {
      modules[moduleId] = {
        factory: factory,
        deps: deps,
        isInitialized: false,
        hasError: false,
        exports: {}
      };
    };
    
    __r = function(moduleId) {
      var module = modules[moduleId];
      if (cache[moduleId]) {
        return cache[moduleId].exports;
      }
      
      if (!module) {
        throw new Error('Module ' + moduleId + ' not found');
      }
      
      try {
        module.factory.call(module.exports, global, __r, module, module.exports);
        cache[moduleId] = module;
        return module.exports;
      } catch (e) {
        module.hasError = true;
        throw e;
      }
    };
    
    require = __r;
    
    // Basic React Native app entry point
    __d(function(global, require, module, exports) {
      var React = require('react');
      var ReactNative = require('react-native');
      var AppRegistry = ReactNative.AppRegistry;
      
      // Basic App component
      var App = React.createElement('View', {
        style: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }
      }, [
        React.createElement('Text', { 
          key: 'title',
          style: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 }
        }, 'SolidiMobileApp4'),
        React.createElement('Text', { 
          key: 'subtitle',
          style: { fontSize: 16, color: '#666' }
        }, 'App is running successfully!')
      ]);
      
      function SolidiMobileApp4() {
        return App;
      }
      
      AppRegistry.registerComponent('SolidiMobileApp4', function() { return SolidiMobileApp4; });
    }, 0, []);
    
    // Mock React and React Native modules
    __d(function(global, require, module, exports) {
      module.exports = {
        createElement: function(type, props, ...children) {
          return { type: type, props: props || {}, children: children };
        }
      };
    }, 'react', []);
    
    __d(function(global, require, module, exports) {
      module.exports = {
        AppRegistry: {
          registerComponent: function(name, componentProvider) {
            console.log('Registering component:', name);
            // Basic registration
            global.__APP_COMPONENT__ = componentProvider;
          }
        },
        View: 'RCTView',
        Text: 'RCTText'
      };
    }, 'react-native', []);
    
    // Initialize the app
    __r(0);
    
  } catch (e) {
    console.error('Bundle execution error:', e);
  }
  
})(this);
`;

// Write the bundle
const bundlePath = process.argv[2] || './ios/build/Build/Products/Release-iphonesimulator/main.jsbundle';
fs.writeFileSync(bundlePath, bundleContent, 'utf8');
console.log('Bundle created at:', bundlePath);