// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { signInAnonymously } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { COLORS, THEME } from '../constants/theme';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  
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
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] }
          ]}
        >
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>P</Text>
          </View>
        </Animated.View>
        
        {/* Title */}
        <Animated.Text 
          style={[styles.title, { opacity: titleOpacity }]}
        >
          PackM!nd+
        </Animated.Text>
        
        {/* Subtitle */}
        <Animated.Text 
          style={[styles.subtitle, { opacity: subtitleOpacity }]}
        >
          Smart packing for every journey
        </Animated.Text>
        
        {/* Buttons */}
        <Animated.View 
          style={[styles.buttonContainer, { opacity: buttonOpacity }]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
          
          {/* Dev shortcut for testing */}
          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 20, borderWidth: 1 }]}
            onPress={handleAnonymousLogin}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: 14 }]}>Continue as Guest</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.MEDIUM_PURPLE,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logoContainer: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: COLORS.MEDIUM_PURPLE,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: COLORS.MEDIUM_PURPLE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: 'white',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;