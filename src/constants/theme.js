import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976D2',      // Modern blue
    secondary: '#26A69A',    // Teal
    tertiary: '#FF7043',     // Orange accent
    surface: '#FFFFFF',      // White background
    surfaceVariant: '#F5F5F5', // Light gray
    background: '#FAFAFA',   // Very light gray
    error: '#F44336',        // Red
    onSurface: '#212121',    // Dark text
    onSurfaceVariant: '#757575', // Gray text
    outline: '#E0E0E0',      // Light border
    shadow: '#000000',       // Black shadow
    scrim: '#000000',        // Black overlay
    inverseSurface: '#303030', // Dark surface
  },
  roundness: 12, // More rounded corners for modern look
};

export const lightTheme = theme;

export const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',      // Lighter blue for dark mode
    secondary: '#4DB6AC',    // Lighter teal
    tertiary: '#FF8A65',     // Lighter orange
    surface: '#121212',      // Dark surface
    surfaceVariant: '#1E1E1E', // Darker variant
    background: '#000000',   // Black background
    error: '#CF6679',        // Softer red for dark mode
    onSurface: '#FFFFFF',    // White text
    onSurfaceVariant: '#AAAAAA', // Light gray text
    outline: '#333333',      // Dark border
    shadow: '#000000',       // Black shadow
    scrim: '#000000',        // Black overlay
    inverseSurface: '#FFFFFF', // Light surface
  },
  roundness: 12,
};

export default theme;