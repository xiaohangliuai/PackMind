// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert, ImageBackground, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { signInAnonymously } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { COLORS, THEME, TYPOGRAPHY, GRADIENTS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const backgroundAnimation = useRef(new Animated.Value(0)).current;
  
  // Anonymous login for testing
  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously();
      // The auth state change will handle navigation
    } catch (error) {
      Alert.alert('Login Error', error.message);
    }
  };
  
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
    
    // Animate elements
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  
  // Interpolate background position
  const backgroundPosition = backgroundAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%']
  });
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Animated Background */}
      <Animated.View style={[styles.backgroundPattern, { left: backgroundPosition }]} />
      
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] }
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
          style={[styles.titleContainer, { opacity: titleOpacity }]}
        >
          <Image
            source={require('../../assets/name-design.png')}
            style={styles.titleImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* Buttons */}
        <Animated.View 
          style={[styles.buttonContainer, { opacity: buttonOpacity }]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={GRADIENTS.PRIMARY}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
          
          {/* Glass morphic guest button */}
          <TouchableOpacity
            style={styles.glassButton}
            onPress={handleAnonymousLogin}
          >
            <BlurView intensity={20} style={styles.blur}>
              <Text style={styles.glassButtonText}>Continue as Guest</Text>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
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
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleImage: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  button: {
    borderRadius: THEME.RADIUS.LARGE,
    marginBottom: 15,
    ...THEME.SHADOWS.MEDIUM,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: THEME.RADIUS.LARGE,
  },
  buttonText: {
    ...TYPOGRAPHY.BUTTON,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.WHITE,
    paddingVertical: 15,
    borderRadius: THEME.RADIUS.LARGE,
    alignItems: 'center',
    ...THEME.SHADOWS.SMALL,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.BUTTON,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  glassButton: {
    marginTop: 30,
    borderRadius: THEME.RADIUS.LARGE,
    overflow: 'hidden',
    ...THEME.SHADOWS.SMALL,
  },
  blur: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassButtonText: {
    ...TYPOGRAPHY.BUTTON,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default WelcomeScreen;