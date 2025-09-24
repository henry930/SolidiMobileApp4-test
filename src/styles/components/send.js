import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSize } from '../shared';

// Send component specific styles
const sendStyles = StyleSheet.create({
  // Form sections
  amountSection: {
    marginBottom: spacing.lg,
  },
  
  addressSection: {
    marginBottom: spacing.lg,
  },
  
  feeSection: {
    marginBottom: spacing.lg,
  },
  
  confirmSection: {
    marginTop: spacing.lg,
  },
  
  // Amount input styling
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  
  amountInput: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  
  currencyLabel: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  
  // Balance display
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  
  balanceText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  maxButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  
  maxButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  
  // Address input
  addressInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // QR scanner button
  qrButton: {
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  
  qrButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  
  // Fee estimation
  feeContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  feeLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  
  feeValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  
  // Transaction preview
  previewContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  // Confirmation buttons
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
  },
  
  confirmButton: {
    flex: 1,
    backgroundColor: colors.success,
  },
  
  // Error and validation
  errorContainer: {
    backgroundColor: colors.errorBackground,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  
  validationText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
});

export default sendStyles;