import { StyleSheet } from 'react-native';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Color palette
export const colors = {
  // Primary colors
  primary: '#1565C0',
  primaryLight: '#42a5f5',
  primaryDark: '#0d47a1',
  
  // Secondary colors
  secondary: '#26a69a',
  secondaryLight: '#80cbc4',
  secondaryDark: '#00695c',
  
  // Surface and background
  surface: '#ffffff',
  background: '#f5f5f5',
  backgroundSecondary: '#fafafa',
  
  // Status colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#d32f2f',
  info: '#2196f3',
  
  // Text colors
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  textOnPrimary: '#ffffff',
  textOnSurface: '#333333',
  
  // Border and divider
  border: '#e0e0e0',
  divider: '#e0e0e0',
  
  // Shadow
  shadow: '#000000',
  
  // Semantic background colors
  successBackground: '#e8f5e8',
  warningBackground: '#fff3e0',
  errorBackground: '#ffebee',
  infoBackground: '#e3f2fd',
  
  // Special colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',
};

// Spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius system
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

// Font sizes
export const fontSize = {
  xs: normaliseFont(10),
  sm: normaliseFont(12),
  md: normaliseFont(14),
  lg: normaliseFont(16),
  xl: normaliseFont(18),
  xxl: normaliseFont(20),
  xxxl: normaliseFont(24),
};

// Font weights
export const fontWeight = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// Shadow presets
export const shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  md: {
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lg: {
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
};

// Base shared styles
const sharedBaseStyles = StyleSheet.create({
  // Layout fundamentals
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Flex helpers
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexColumn: { flexDirection: 'column' },
  flexWrap: { flexWrap: 'wrap' },
  
  // Alignment helpers
  alignCenter: { alignItems: 'center' },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  alignStretch: { alignItems: 'stretch' },
  
  justifyCenter: { justifyContent: 'center' },
  justifyStart: { justifyContent: 'flex-start' },
  justifyEnd: { justifyContent: 'flex-end' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyAround: { justifyContent: 'space-around' },
  justifyEvenly: { justifyContent: 'space-evenly' },
  
  // Common combinations
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAround: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Positioning
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },
  
  // Common sizes
  fullWidth: { width: '100%' },
  fullHeight: { height: '100%' },
  
  // Overflow
  hidden: { overflow: 'hidden' },
  visible: { overflow: 'visible' },
});

export { sharedBaseStyles };
export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  styles: sharedBaseStyles,
};