import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSize } from '../shared';

// Buy component specific styles
const buyStyles = StyleSheet.create({
  // Form sections
  paymentMethodSection: {
    marginBottom: spacing.lg,
  },
  
  amountSection: {
    marginBottom: spacing.lg,
  },
  
  summarySection: {
    marginBottom: spacing.lg,
  },
  
  // Payment method selection
  paymentMethodContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  paymentMethodSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.infoBackground,
  },
  
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  paymentMethodIcon: {
    width: 32,
    height: 32,
    marginRight: spacing.md,
  },
  
  paymentMethodInfo: {
    flex: 1,
  },
  
  paymentMethodName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  paymentMethodDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  // Amount input
  amountInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  amountInput: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  
  currencySelector: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  
  currencyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  
  // Conversion display
  conversionContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  
  conversionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  conversionRate: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  
  // Quick amount buttons
  quickAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  
  quickAmountButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  quickAmountButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  quickAmountText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  
  quickAmountTextSelected: {
    color: colors.textOnPrimary,
  },
  
  // Purchase summary
  summaryContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
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
  
  // Fees breakdown
  feeContainer: {
    backgroundColor: colors.infoBackground,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  feeLabel: {
    fontSize: fontSize.sm,
    color: colors.info,
  },
  
  feeValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.info,
  },
  
  // Purchase button
  purchaseButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  
  purchaseButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  
  purchaseButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  
  // Limits and warnings
  limitsContainer: {
    backgroundColor: colors.warningBackground,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  
  limitsText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '500',
  },
  
  // Loading and success states
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  
  processingText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  
  successIcon: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
  },
  
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  successDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.4,
  },
});

export default buyStyles;