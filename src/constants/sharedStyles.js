import { StyleSheet } from 'react-native';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Shared color constants
export const sharedColors = {
  primary: '#1565C0',
  primaryLight: '#42a5f5',
  primaryDark: '#0d47a1',
  surface: '#ffffff',
  background: '#f5f5f5',
  error: '#d32f2f',
  warning: '#ff9800',
  success: '#4caf50',
  info: '#2196f3',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#e0e0e0',
  shadow: '#000000',
  // Semantic colors
  warningBackground: '#ffebee',
  infoBackground: '#e3f2fd',
  successBackground: '#e8f5e8',
};

// Shared style objects
export const sharedStyles = StyleSheet.create({
  // Layout styles
  container: {
    flex: 1,
    backgroundColor: sharedColors.background,
  },
  scrollContent: {
    padding: 16,
  },
  
  // Header styles
  header: {
    backgroundColor: sharedColors.primary,
    padding: 20,
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Card styles
  card: {
    backgroundColor: sharedColors.surface,
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: sharedColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardCompact: {
    backgroundColor: sharedColors.surface,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: sharedColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardOneLine: {
    backgroundColor: sharedColors.surface,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: sharedColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Text styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: sharedColors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: sharedColors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: sharedColors.text,
    flexWrap: 'wrap',
  },
  valueBold: {
    fontSize: 16,
    color: sharedColors.text,
    fontWeight: 'bold',
    flexWrap: 'wrap',
  },
  
  // Form styles
  textInput: {
    marginBottom: 16,
    backgroundColor: sharedColors.surface,
  },
  
  // Button styles
  primaryButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  secondaryButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  
  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Header with icon/copy button
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  // Message cards
  warningCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: sharedColors.warningBackground,
    borderRadius: 8,
    elevation: 1,
    shadowColor: sharedColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: sharedColors.infoBackground,
    borderRadius: 8,
    elevation: 1,
    shadowColor: sharedColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  errorCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: sharedColors.warningBackground,
    borderRadius: 8,
    elevation: 1,
    shadowColor: sharedColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  
  // Text for message cards
  warningText: {
    fontSize: normaliseFont(14),
    color: sharedColors.error,
  },
  infoText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: sharedColors.info,
  },
  errorText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: sharedColors.error,
  },
  
  // QR Code container
  qrContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: sharedColors.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  
  // Dropdown styles
  dropdown: {
    borderColor: sharedColors.border,
    borderRadius: 8,
    backgroundColor: sharedColors.surface,
  },
  dropdownContainer: {
    borderColor: sharedColors.border,
    borderRadius: 8,
  },
});

// Component-specific style creators
export const createComponentStyles = (additionalStyles = {}) => {
  return StyleSheet.create({
    ...sharedStyles,
    ...additionalStyles,
  });
};

export default sharedStyles;