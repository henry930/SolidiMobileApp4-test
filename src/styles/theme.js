import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from './shared';

// Theme configuration
export const createTheme = (customTheme = {}) => {
  return {
    colors: {
      ...colors,
      ...customTheme.colors,
    },
    spacing: {
      ...spacing,
      ...customTheme.spacing,
    },
    typography: {
      fontSize,
      fontWeight,
      ...customTheme.typography,
    },
    borderRadius: {
      ...borderRadius,
      ...customTheme.borderRadius,
    },
    shadows: {
      ...shadows,
      ...customTheme.shadows,
    },
    ...customTheme,
  };
};

// Default theme
export const defaultTheme = createTheme();

// Dark theme
export const darkTheme = createTheme({
  colors: {
    primary: '#42a5f5',
    surface: '#2c2c2c',
    background: '#1a1a1a',
    backgroundSecondary: '#2c2c2c',
    text: '#ffffff',
    textSecondary: '#cccccc',
    textLight: '#999999',
    border: '#404040',
    divider: '#404040',
  },
});

// Theme hook (for future React Context implementation)
export const useTheme = () => {
  // This would be connected to a theme context in a full implementation
  return defaultTheme;
};

export default {
  createTheme,
  defaultTheme,
  darkTheme,
  useTheme,
};