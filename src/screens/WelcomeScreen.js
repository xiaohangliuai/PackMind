// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Image, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, THEME } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const backgroundAnimation = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  
  // Start animation on component mount
  useEffect(() => {
    // Start background animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnimation, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: false,
        }),
        Animated.timing(backgroundAnimation, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: false,
        }),
      ])
    ).start();
    
    // Animate elements in
    const fadeInAnimation = Animated.parallel([
      // Logo animations
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }),
      // Title animations
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(titleScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    // Start fade in animation
    fadeInAnimation.start();

    // After 2 seconds, fade out and navigate
    const timer = setTimeout(() => {
      // Pre-warm the next screen
      navigation.navigate('Login');
      
      // Quick fade out
      Animated.parallel([
        // Logo fade out
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        // Title fade out
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        // Screen fade out
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
  
  // Interpolate background position
  const backgroundPosition = backgroundAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%']
  });

  // Interpolate logo rotation
  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '0deg']
  });
  
  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar style="light" />
      
      {/* Animated Background */}
      <Animated.View style={[styles.backgroundPattern, { left: backgroundPosition }]} />
      
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            { 
              opacity: logoOpacity, 
              transform: [
                { scale: logoScale },
                { rotate: spin },
                {
                  translateY: logoOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }
              ] 
            }
          ]}
        >
          <Image 
            source={require('../../assets/logo.jpg')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* Title */}
        <Animated.View 
          style={[
            styles.titleContainer, 
            { 
              opacity: titleOpacity,
              transform: [
                { scale: titleScale },
                {
                  translateY: titleOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Image
            source={require('../../assets/name-design.png')}
            style={styles.titleImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.ROYAL,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 2,
    height: height,
    backgroundColor: COLORS.ROYAL,
    opacity: 0.5,
    zIndex: 0,
    // Abstract pattern
    backgroundImage: `radial-gradient(circle at 20% 30%, ${COLORS.INDIGO} 0%, transparent 20%), 
                      radial-gradient(circle at 80% 70%, ${COLORS.INDIGO} 0%, transparent 20%),
                      radial-gradient(circle at 50% 50%, ${COLORS.INDIGO} 0%, transparent 30%),
                      radial-gradient(circle at 10% 75%, ${COLORS.LAVENDER} 0%, transparent 15%),
                      radial-gradient(circle at 90% 10%, ${COLORS.LAVENDER} 0%, transparent 15%)`,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    zIndex: 1,
  },
  logoContainer: {
    width: width * 0.45,
    height: width * 0.45,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: width * 0.225,
    backgroundColor: COLORS.ROYAL,
    overflow: 'hidden',
    ...THEME.SHADOWS.MEDIUM,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    width: width * 0.8,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleImage: {
    width: '100%',
    height: '100%',
  },
});

export default WelcomeScreen;