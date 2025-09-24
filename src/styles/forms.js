import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSize } from './shared';

// Form styles
const formStyles = StyleSheet.create({
  // Form containers
  form: {
    flex: 1,
  },
  
  formSection: {
    marginBottom: spacing.lg,
  },
  
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  // Input styles
  inputContainer: {
    marginBottom: spacing.md,
  },
  
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  
  textInputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  
  textInputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Dropdown styles
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  
  dropdownContainer: {
    borderRadius: borderRadius.md,
    borderColor: colors.border,
    zIndex: 1000,
  },
  
  dropdownText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  
  dropdownPlaceholder: {
    color: colors.textLight,
  },
  
  // Labels and helpers
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  inputLabelRequired: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  requiredAsterisk: {
    color: colors.error,
  },
  
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  
  // Form groups
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  inputGroupItem: {
    flex: 1,
  },
  
  // Search inputs
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  // Checkbox and radio
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  radioLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  
  // Switch
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  
  // Form actions
  formActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  
  // Slider
  sliderContainer: {
    marginVertical: spacing.md,
  },
  
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  
  // File input
  fileInputContainer: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  
  fileInputActive: {
    borderColor: colors.primary,
    backgroundColor: colors.infoBackground,
  },
});

export default formStyles;