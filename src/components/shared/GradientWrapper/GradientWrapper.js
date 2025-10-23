import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * GradientWrapper - A reliable gradient background wrapper
 * Uses CSS-style layered approach for gradient-like effects without native dependencies
 */
const GradientWrapper = ({ 
  children, 
  style,
  colors = ['#1a1a2e', '#4c6ef5'], // Dark navy to bright blue for better contrast
  direction = 'diagonal', // 'vertical', 'horizontal', 'diagonal'
  ...props 
}) => {
  
  // Create gradient layers using positioned Views with opacity
  const createGradientLayers = () => {
    const [startColor, midColor, endColor] = colors.length >= 3 ? colors : [colors[0], colors[0], colors[1] || colors[0]];
    
    if (direction === 'diagonal') {
      return (
        <>
          {/* Base layer */}
          <View style={[styles.baseLayer, { backgroundColor: startColor }]} />
          
          {/* Gradient effect layers */}
          <View style={[styles.gradientLayer1, { backgroundColor: midColor }]} />
          <View style={[styles.gradientLayer2, { backgroundColor: endColor }]} />
          <View style={[styles.gradientLayer3, { backgroundColor: startColor }]} />
        </>
      );
    } else if (direction === 'vertical') {
      return (
        <>
          <View style={[styles.baseLayer, { backgroundColor: startColor }]} />
          <View style={[styles.verticalLayer1, { backgroundColor: endColor }]} />
          <View style={[styles.verticalLayer2, { backgroundColor: startColor }]} />
        </>
      );
    } else {
      // Horizontal or fallback
      return (
        <>
          <View style={[styles.baseLayer, { backgroundColor: startColor }]} />
          <View style={[styles.horizontalLayer1, { backgroundColor: endColor }]} />
          <View style={[styles.horizontalLayer2, { backgroundColor: startColor }]} />
        </>
      );
    }
  };

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Gradient background layers */}
      {createGradientLayers()}
      
      {/* Content with transparent backgrounds */}
      <View style={styles.contentWrapper}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  baseLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  
  // Diagonal gradient layers
  gradientLayer1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.3, // Back to subtle
    transform: [{ skewY: '2deg' }],
  },
  gradientLayer2: {
    position: 'absolute',
    left: '20%',
    right: 0,
    top: '30%',
    bottom: 0,
    opacity: 0.4, // Back to subtle
    borderTopLeftRadius: 50,
  },
  gradientLayer3: {
    position: 'absolute',
    left: '40%',
    right: 0,
    top: '60%',
    bottom: 0,
    opacity: 0.2, // Back to subtle
    borderTopLeftRadius: 100,
  },
  
  // Vertical gradient layers
  verticalLayer1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    bottom: 0,
    opacity: 0.6, // Back to subtle
  },
  verticalLayer2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '75%',
    bottom: 0,
    opacity: 0.3, // Back to subtle
  },
  
  // Horizontal gradient layers
  horizontalLayer1: {
    position: 'absolute',
    left: '50%',
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.6, // Back to subtle
  },
  horizontalLayer2: {
    position: 'absolute',
    left: '75%',
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.3, // Back to subtle
  },
  
  contentWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 1, // Ensure content appears above gradient layers
  },
});

export default GradientWrapper;