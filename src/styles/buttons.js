import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows } from './shared';

// Button styles
const buttonStyles = StyleSheet.create({
  // Base buttons
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  
  // Primary buttons
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.sm,
  },
  
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  
  // Secondary buttons
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  secondaryButtonPressed: {
    backgroundColor: colors.backgroundSecondary,
  },
  
  // Button sizes
  buttonSmall: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  
  buttonLarge: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  
  // Button variants
  outlineButton: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  ghostButton: {
    backgroundColor: colors.transparent,
  },
  
  dangerButton: {
    backgroundColor: colors.error,
  },
  
  warningButton: {
    backgroundColor: colors.warning,
  },
  
  successButton: {
    backgroundColor: colors.success,
  },
  
  // Icon buttons
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  iconButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // FAB (Floating Action Button)
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    ...shadows.lg,
  },
  
  // Button groups
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  buttonGroupVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  
  // Specialized buttons
  copyButton: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  linkButton: {
    paddingVertical: spacing.xs,
  },
  
  // Badge buttons
  badgeButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Chip buttons
  chip: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  
  chipSelected: {
    backgroundColor: colors.primary,
  },
  
  // Tab buttons
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
});

export default buttonStyles;