import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSize } from '../shared';

// Receive component specific styles
const receiveStyles = StyleSheet.create({
  // QR Code section
  qrCodeSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  qrCodeText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  
  // Deposit details
  depositDetails: {
    alignItems: 'center',
    padding: spacing.md,
  },
  
  // Loading state
  spinner: {
    marginTop: spacing.lg,
  },
  
  // Badges
  secureBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  
  secureText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  
  // Upgrade section
  upgradeTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  upgradeDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.4,
    marginBottom: spacing.md,
  },
  
  upgradeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  
  // Detail cards
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  detailValue: {
    fontSize: fontSize.md,
    color: colors.text,
    flexWrap: 'wrap',
  },
  
  // Dropdown customization
  dropdownContainer: {
    zIndex: 2,
  },
  
  chosenAssetDropdown: {
    height: 44,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  
  chosenAssetDropdownContainer: {
    width: '100%',
  },
  
  // Error states
  errorMessageText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
});

export default receiveStyles;