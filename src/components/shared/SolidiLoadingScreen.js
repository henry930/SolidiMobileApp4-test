// React imports
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Image, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  ActivityIndicator 
} from 'react-native';

// Internal imports
import ImageLookup from 'src/images';

/**
 * SolidiLoadingScreen - A reusable loading component with the Solidi logo
 * 
 * Usage:
 * - For full-page loading: <SolidiLoadingScreen />
 * - For inline loading: <SolidiLoadingScreen fullScreen={false} />
 * - With custom message: <SolidiLoadingScreen message="Loading your data..." />
 * - Different sizes: <SolidiLoadingScreen size="small" />
 * 
 * @param {boolean} fullScreen - If true, covers entire screen. Default: true
 * @param {string} message - Optional loading message to display
 * @param {string} size - Logo size: 'small' (60px), 'medium' (100px), 'large' (150px). Default: 'medium'
 * @param {string} backgroundColor - Background color. Default: 'white'
 */
const SolidiLoadingScreen = ({ 
  fullScreen = true, 
  message = 'Loading...', 
  size = 'medium',
  backgroundColor = 'white'
}) => {
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation for the spinner
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Size configurations
  const sizeConfig = {
    small: { logo: 60, spinner: 30, fontSize: 12 },
    medium: { logo: 100, spinner: 40, fontSize: 14 },
    large: { logo: 150, spinner: 50, fontSize: 16 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  const containerStyle = fullScreen 
    ? [styles.fullScreenContainer, { backgroundColor }]
    : styles.inlineContainer;

  return (
    <Animated.View style={[containerStyle, { opacity: fadeAnim }]}>
      <View style={styles.contentContainer}>
        {/* Solidi Logo with pulse animation */}
        <Animated.View 
          style={[
            styles.logoContainer,
            { 
              transform: [{ scale: pulseAnim }],
              width: config.logo * 2.5, // Logo is landscape, so wider
              height: config.logo,
            }
          ]}
        >
          <Image
            source={ImageLookup.solidi_logo_landscape_black_1924x493}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Spinning loader below logo */}
        <View style={[styles.spinnerContainer, { marginTop: config.logo * 0.3 }]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View style={[styles.spinnerRing, { 
              width: config.spinner, 
              height: config.spinner,
              borderRadius: config.spinner / 2 
            }]} />
          </Animated.View>
          {/* ActivityIndicator for additional visual feedback */}
          <View style={styles.activityIndicatorOverlay}>
            <ActivityIndicator size={size === 'small' ? 'small' : 'large'} color="#10b981" />
          </View>
        </View>

        {/* Loading message */}
        {message && (
          <Text style={[styles.message, { fontSize: config.fontSize, marginTop: config.logo * 0.2 }]}>
            {message}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  spinnerContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerRing: {
    borderWidth: 3,
    borderColor: '#e5e7eb',
    borderTopColor: '#10b981',
    borderRightColor: '#10b981',
  },
  activityIndicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SolidiLoadingScreen;
