import { StyleSheet } from 'react-native';

/**
 * Utility functions for working with styles
 */

/**
 * Combines multiple style objects into a single StyleSheet
 * @param {...Object} styleObjects - Style objects to combine
 * @returns {Object} Combined StyleSheet
 */
export const combineStyles = (...styleObjects) => {
  const combined = {};
  
  styleObjects.forEach(styleObj => {
    if (styleObj && typeof styleObj === 'object') {
      Object.assign(combined, styleObj);
    }
  });
  
  return StyleSheet.create(combined);
};

/**
 * Creates a component-specific StyleSheet with shared styles
 * @param {Object} sharedStyles - Shared styles to include
 * @param {Object} componentStyles - Component-specific styles
 * @returns {Object} Combined StyleSheet
 */
export const createComponentStyleSheet = (sharedStyles = {}, componentStyles = {}) => {
  return StyleSheet.create({
    ...sharedStyles,
    ...componentStyles,
  });
};

/**
 * Conditionally applies styles based on props or state
 * @param {Object} baseStyle - Base style object
 * @param {Object} conditions - Object with condition/style pairs
 * @returns {Array} Array of styles for React Native
 */
export const conditionalStyle = (baseStyle, conditions = {}) => {
  const styles = [baseStyle];
  
  Object.keys(conditions).forEach(key => {
    if (conditions[key].condition) {
      styles.push(conditions[key].style);
    }
  });
  
  return styles;
};

/**
 * Creates responsive styles based on screen dimensions
 * @param {Object} dimensions - Screen dimensions
 * @param {Object} breakpoints - Breakpoint definitions
 * @param {Object} styles - Styles for different breakpoints
 * @returns {Object} Responsive styles
 */
export const createResponsiveStyles = (dimensions, breakpoints, styles) => {
  const { width } = dimensions;
  
  if (width >= breakpoints.large) {
    return styles.large || styles.default || {};
  } else if (width >= breakpoints.medium) {
    return styles.medium || styles.default || {};
  } else {
    return styles.small || styles.default || {};
  }
};

/**
 * Merges arrays of styles, filtering out null/undefined values
 * @param {...Array} styleArrays - Arrays of styles to merge
 * @returns {Array} Merged and filtered style array
 */
export const mergeStyleArrays = (...styleArrays) => {
  return styleArrays
    .flat()
    .filter(style => style != null);
};

/**
 * Creates a style variant system
 * @param {Object} baseStyle - Base style object
 * @param {Object} variants - Variant definitions
 * @returns {Function} Function that returns styles for a given variant
 */
export const createStyleVariants = (baseStyle, variants) => {
  return (variant = 'default') => {
    const variantStyle = variants[variant] || variants.default || {};
    return [baseStyle, variantStyle];
  };
};

export default {
  combineStyles,
  createComponentStyleSheet,
  conditionalStyle,
  createResponsiveStyles,
  mergeStyleArrays,
  createStyleVariants,
};