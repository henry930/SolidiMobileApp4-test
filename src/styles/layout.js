import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows } from './shared';

// Layout styles
const layoutStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  scrollContainer: {
    flexGrow: 1,
  },
  
  contentContainer: {
    padding: spacing.md,
  },
  
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  
  // Headers
  headerContainer: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  headerSection: {
    backgroundColor: colors.primary,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  
  // Panels and sections
  panelContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  panelSubContainer: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  
  // Spacing utilities
  marginXs: { margin: spacing.xs },
  marginSm: { margin: spacing.sm },
  marginMd: { margin: spacing.md },
  marginLg: { margin: spacing.lg },
  marginXl: { margin: spacing.xl },
  
  marginTopXs: { marginTop: spacing.xs },
  marginTopSm: { marginTop: spacing.sm },
  marginTopMd: { marginTop: spacing.md },
  marginTopLg: { marginTop: spacing.lg },
  marginTopXl: { marginTop: spacing.xl },
  
  marginBottomXs: { marginBottom: spacing.xs },
  marginBottomSm: { marginBottom: spacing.sm },
  marginBottomMd: { marginBottom: spacing.md },
  marginBottomLg: { marginBottom: spacing.lg },
  marginBottomXl: { marginBottom: spacing.xl },
  
  marginHorizontalXs: { marginHorizontal: spacing.xs },
  marginHorizontalSm: { marginHorizontal: spacing.sm },
  marginHorizontalMd: { marginHorizontal: spacing.md },
  marginHorizontalLg: { marginHorizontal: spacing.lg },
  marginHorizontalXl: { marginHorizontal: spacing.xl },
  
  marginVerticalXs: { marginVertical: spacing.xs },
  marginVerticalSm: { marginVertical: spacing.sm },
  marginVerticalMd: { marginVertical: spacing.md },
  marginVerticalLg: { marginVertical: spacing.lg },
  marginVerticalXl: { marginVertical: spacing.xl },
  
  paddingXs: { padding: spacing.xs },
  paddingSm: { padding: spacing.sm },
  paddingMd: { padding: spacing.md },
  paddingLg: { padding: spacing.lg },
  paddingXl: { padding: spacing.xl },
  
  paddingTopXs: { paddingTop: spacing.xs },
  paddingTopSm: { paddingTop: spacing.sm },
  paddingTopMd: { paddingTop: spacing.md },
  paddingTopLg: { paddingTop: spacing.lg },
  paddingTopXl: { paddingTop: spacing.xl },
  
  paddingBottomXs: { paddingBottom: spacing.xs },
  paddingBottomSm: { paddingBottom: spacing.sm },
  paddingBottomMd: { paddingBottom: spacing.md },
  paddingBottomLg: { paddingBottom: spacing.lg },
  paddingBottomXl: { paddingBottom: spacing.xl },
  
  paddingHorizontalXs: { paddingHorizontal: spacing.xs },
  paddingHorizontalSm: { paddingHorizontal: spacing.sm },
  paddingHorizontalMd: { paddingHorizontal: spacing.md },
  paddingHorizontalLg: { paddingHorizontal: spacing.lg },
  paddingHorizontalXl: { paddingHorizontal: spacing.xl },
  
  paddingVerticalXs: { paddingVertical: spacing.xs },
  paddingVerticalSm: { paddingVertical: spacing.sm },
  paddingVerticalMd: { paddingVertical: spacing.md },
  paddingVerticalLg: { paddingVertical: spacing.lg },
  paddingVerticalXl: { paddingVertical: spacing.xl },
  
  // Common layout utilities
  fullWidth: { width: '100%' },
  fullHeight: { height: '100%' },
  
  // Flex layouts
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  rowReverse: { flexDirection: 'row-reverse' },
  columnReverse: { flexDirection: 'column-reverse' },
  
  // Alignment
  center: { alignItems: 'center', justifyContent: 'center' },
  alignCenter: { alignItems: 'center' },
  justifyCenter: { justifyContent: 'center' },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  justifyStart: { justifyContent: 'flex-start' },
  justifyEnd: { justifyContent: 'flex-end' },
  spaceBetween: { justifyContent: 'space-between' },
  spaceAround: { justifyContent: 'space-around' },
  spaceEvenly: { justifyContent: 'space-evenly' },
  
  // Combined flex utilities
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },  
  rowStart: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  rowEnd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  rowSpaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowSpaceAround: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  
  columnCenter: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  columnStart: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' },
  columnEnd: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' },
  columnSpaceBetween: { flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' },
  
  // Positioning
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },
  
  // Flex sizing
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flex3: { flex: 3 },
  flex4: { flex: 4 },
  flex5: { flex: 5 },
  
  // Size utilities
  fullSize: { width: '100%', height: '100%' },
  
  // Padding helpers
  paddingHorizontal: { paddingHorizontal: spacing.md },
  paddingVertical: { paddingVertical: spacing.md },
});

export default layoutStyles;