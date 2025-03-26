// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { createUserProfile } from '../../models/firestoreModels';
import { COLORS, THEME, TYPOGRAPHY, GRADIENTS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const RegisterScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  
  // Validate form
  const validateForm = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };
  
  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Register user with Firebase Auth
      const user = await register(email, password, fullName);
      
      // Create user profile in Firestore
      await createUserProfile(user.uid, {
        fullName,
        email,
        createdLists: 0,
        premium: false
      });
      
      // Show success message and navigate to login
      Alert.alert(
        'Registration Successful', 
        'Your account has been created successfully!',
        [
          { 
            text: 'Login Now', 
            onPress: () => navigation.navigate('Login') 
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Abstract background patterns */}
      <View style={styles.backgroundPatterns}>
        <View style={styles.circlePattern1} />
        <View style={styles.circlePattern2} />
        <View style={styles.circlePattern3} />
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/app-name-purple.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Back button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={THEME.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create your Account</Text>
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={THEME.TEXT.SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={THEME.TEXT.TERTIARY}
              />
            </View>
            
            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={THEME.TEXT.SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={THEME.TEXT.TERTIARY}
              />
            </View>
            
            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME.TEXT.SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={THEME.TEXT.TERTIARY}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={THEME.TEXT.SECONDARY}
                />
              </TouchableOpacity>
            </View>
            
            {/* Confirm Password Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME.TEXT.SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={THEME.TEXT.TERTIARY}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={THEME.TEXT.SECONDARY}
                />
              </TouchableOpacity>
            </View>
            
            {/* Register Button */}
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={GRADIENTS.PRIMARY}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.registerButtonText}>Sign up</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  inner: {
    padding: THEME.SPACING.LARGE,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    width: '100%',
    height: 60,
    marginBottom: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
  logoImage: {
    width: '60%',
    height: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.SHADOWS.SMALL,
    marginBottom: THEME.SPACING.SMALL,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 10,
    left: THEME.SPACING.LARGE,
  },
  header: {
    marginBottom: THEME.SPACING.XLARGE,
  },
  title: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
    marginLeft: 8,
    fontSize: 16,
  },
  form: {
    marginBottom: THEME.SPACING.XLARGE,
    marginTop: -4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: THEME.RADIUS.LARGE,
    marginBottom: THEME.SPACING.MEDIUM,
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...THEME.SHADOWS.SMALL,
  },
  inputIcon: {
    marginRight: THEME.SPACING.MEDIUM,
  },
  input: {
    flex: 1,
    height: '100%',
    ...TYPOGRAPHY.BODY_1,
    color: THEME.TEXT.PRIMARY,
  },
  eyeIcon: {
    padding: THEME.SPACING.SMALL,
  },
  registerButton: {
    borderRadius: THEME.RADIUS.LARGE,
    overflow: 'hidden',
    ...THEME.SHADOWS.MEDIUM,
    marginTop: THEME.SPACING.XLARGE,
  },
  gradientButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    ...TYPOGRAPHY.BUTTON,
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginTop: THEME.SPACING.XLARGE * 0.7,
    paddingVertical: THEME.SPACING.XLARGE,
  },
  footerText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
    fontSize: 15,
  },
  loginText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.PRIMARY,
    fontWeight: 'bold',
    fontSize: 15,
  },
  backgroundPatterns: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    opacity: 0.5,
  },
  circlePattern1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.LAVENDER,
    opacity: 0.3,
  },
  circlePattern2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.INDIGO,
    opacity: 0.2,
  },
  circlePattern3: {
    position: 'absolute',
    top: '50%',
    left: '20%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.ROYAL,
    opacity: 0.1,
  },
});

export default RegisterScreen;