// Universal Theme Provider for Solidi App
// Provides theme context that automatically adapts to platform

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { getPlatformTheme } from './universalTheme';

// Create theme context
const ThemeContext = createContext();

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');
  const [platformOverride, setPlatformOverride] = useState(null);

  // Get current platform (allow override for testing)
  const currentPlatform = platformOverride || Platform.OS;
  const isWeb = currentPlatform === 'web';

  // Get the appropriate theme
  const theme = getPlatformTheme(isDarkMode, isWeb);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      if (Platform.OS === 'web') {
        const saved = localStorage.getItem('solidi_theme_dark');
        if (saved !== null) {
          setIsDarkMode(JSON.parse(saved));
        }
      } else {
        // For mobile, you'd use AsyncStorage
        // const AsyncStorage = require('@react-native-async-storage/async-storage');
        // const saved = await AsyncStorage.getItem('solidi_theme_dark');
        // if (saved !== null) {
        //   setIsDarkMode(JSON.parse(saved));
        // }
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    // Save preference
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('solidi_theme_dark', JSON.stringify(newDarkMode));
      } else {
        // For mobile, you'd use AsyncStorage
        // const AsyncStorage = require('@react-native-async-storage/async-storage');
        // await AsyncStorage.setItem('solidi_theme_dark', JSON.stringify(newDarkMode));
      }
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  // For development/testing - allows switching platform behavior
  const setPlatformMode = (platform) => {
    setPlatformOverride(platform);
  };

  const contextValue = {
    theme,
    isDarkMode,
    isWeb,
    currentPlatform,
    toggleTheme,
    setPlatformMode, // Remove this in production

    // Convenience methods
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    layout: theme.layout,
    platform: theme.platform
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Higher-order component for theme consumption
export const withTheme = (Component) => {
  return (props) => {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
};

// Hook for creating platform-aware styles
export const useThemedStyles = (createStyles) => {
  const { theme, isWeb, currentPlatform } = useTheme();

  return React.useMemo(() => {
    return createStyles({ theme, isWeb, platform: currentPlatform });
  }, [theme, isWeb, currentPlatform, createStyles]);
};

// Hook for responsive values
export const useResponsiveValue = (mobileValue, webValue) => {
  const { isWeb } = useTheme();
  return isWeb ? webValue : mobileValue;
};

export default ThemeProvider;