// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  ImageBackground
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, THEME, TYPOGRAPHY, GRADIENTS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  
  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const user = await login(email, password);
      console.log('Login successful:', user?.email);
      // No need for alert here as HomeScreen will show a welcome alert
      // Navigation will be handled automatically by the auth state change
    } catch (error) {
      let errorMessage = 'Failed to login. Please try again.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
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
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Back button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={THEME.TEXT.PRIMARY} />
            </TouchableOpacity>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>
            
            {/* Form */}
            <View style={styles.form}>
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
              
              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              
              {/* Login Button */}
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
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
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* Register Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
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
    top: -100,
    right: -100,
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
    top: '40%',
    left: '20%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.ROYAL,
    opacity: 0.1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: THEME.SPACING.LARGE,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...THEME.SHADOWS.SMALL,
  },
  header: {
    marginBottom: THEME.SPACING.XLARGE,
  },
  title: {
    ...TYPOGRAPHY.HEADING_1,
    color: THEME.TEXT.PRIMARY,
    marginBottom: THEME.SPACING.SMALL,
  },
  subtitle: {
    ...TYPOGRAPHY.BODY_1,
    color: THEME.TEXT.SECONDARY,
  },
  form: {
    marginBottom: THEME.SPACING.LARGE,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: THEME.RADIUS.MEDIUM,
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
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: THEME.SPACING.LARGE,
  },
  forgotPasswordText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.PRIMARY,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: THEME.RADIUS.MEDIUM,
    overflow: 'hidden',
    ...THEME.SHADOWS.MEDIUM,
  },
  gradientButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    ...TYPOGRAPHY.BUTTON,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
  },
  signupText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.PRIMARY,
    fontWeight: 'bold',
  },
});

export default LoginScreen;