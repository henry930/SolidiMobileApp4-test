import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSize } from '../shared';

// Assets component specific styles
const assetsStyles = StyleSheet.create({
  // Header section
  headerSection: {
    backgroundColor: colors.primary,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  
  headerContent: {
    paddingHorizontal: spacing.md,
  },
  
  balanceContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  totalBalance: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  
  balanceLabel: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  
  // Asset list
  assetsList: {
    flex: 1,
  },
  
  assetItem: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  
  assetInfo: {
    flex: 1,
  },
  
  assetName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  assetSymbol: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  assetBalance: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  
  assetValues: {
    alignItems: 'flex-end',
  },
  
  assetValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  assetChange: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  
  positiveChange: {
    color: colors.success,
  },
  
  negativeChange: {
    color: colors.error,
  },
  
  // Portfolio summary
  portfolioSummary: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
    fontWeight: '600',
    color: colors.text,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
    opacity: 0.3,
  },
  
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.4,
    marginBottom: spacing.lg,
  },
  
  // Quick actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  
  quickAction: {
    alignItems: 'center',
  },
  
  quickActionIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  
  quickActionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  
  // Badge styles
  greenBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  
  redBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  
  badgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  
  // Loading states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  
  // Refresh control
  refreshText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },

  // Missing styles for Assets component
  summaryHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  pageTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },

  liveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  liveBadgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  portfolioCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  portfolioCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    ...shadows.sm,
  },

  portfolioCardRight: {
    marginLeft: spacing.sm,
  },

  portfolioCardLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  portfolioCardValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },

  changePercentage: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  changeAmount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Asset card styles
  assetCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },

  iconContainer: {
    marginRight: spacing.md,
  },

  avatarFallback: {
    backgroundColor: colors.primary,
  },

  assetHeader: {
    flex: 1,
  },

  assetTypeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },

  cryptoBadge: {
    backgroundColor: colors.primary,
  },

  fiatBadge: {
    backgroundColor: colors.secondary,
  },

  holdingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  holdingsAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },

  priceTag: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  priceChangePositive: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },

  priceChangeNegative: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },

  priceChangeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },

  priceChangePeriod: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },

  portfolioValue: {
    alignItems: 'flex-end',
  },

  portfolioAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },

  portfolioLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  portfolioPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default assetsStyles;