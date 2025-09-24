import { StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from './shared';

// Text styles
const textStyles = StyleSheet.create({
  // Headings
  h1: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  h2: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  h3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  h4: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  // Body text
  body: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    color: colors.text,
    lineHeight: fontSize.md * 1.5,
  },
  
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    color: colors.text,
    lineHeight: fontSize.lg * 1.4,
  },
  
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.text,
    lineHeight: fontSize.sm * 1.4,
  },
  
  // Labels and captions
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  labelBold: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    color: colors.textLight,
  },
  
  // Specialized text
  subtitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  // Header text
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  
  headerSubtitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  
  // Values and data
  value: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    color: colors.text,
  },
  
  valueBold: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  
  valueSmall: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    color: colors.text,
  },
  
  valueLarge: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  
  // Color variants
  textPrimary: { color: colors.primary },
  textSecondary: { color: colors.textSecondary },
  textLight: { color: colors.textLight },
  textOnPrimary: { color: colors.textOnPrimary },
  textSuccess: { color: colors.success },
  textWarning: { color: colors.warning },
  textError: { color: colors.error },
  textInfo: { color: colors.info },
  
  // Weight variants
  light: { fontWeight: fontWeight.light },
  normal: { fontWeight: fontWeight.normal },
  medium: { fontWeight: fontWeight.medium },
  semibold: { fontWeight: fontWeight.semibold },
  bold: { fontWeight: fontWeight.bold },
  
  // Alignment
  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  
  // Special styles
  link: {
    fontSize: fontSize.md,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  
  monospace: {
    fontFamily: 'Courier New',
    fontSize: fontSize.sm,
    color: colors.text,
  },
  
  // Message text
  errorText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  
  warningText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  
  successText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  
  infoText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.info,
  },
});

export default textStyles;