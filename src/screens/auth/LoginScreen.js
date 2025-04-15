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
  Image,
  ImageBackground,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, THEME, TYPOGRAPHY, GRADIENTS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import firebase from '../../firebase/firebaseConfig';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  const { login, signInWithApple, guestLogin } = useAuth();
  
  // Check if Apple Authentication is available
  React.useEffect(() => {
    (async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    })();
  }, []);
  
  // Handle email verification error
  const handleEmailVerificationError = async () => {
    try {
      // Get the user by email first
      const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
      if (methods && methods.length > 0) {
        // Temporarily sign in to send verification email
        try {
          const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
          // Send a verification email
          await userCredential.user.sendEmailVerification();
          // Sign out immediately
          await firebase.auth().signOut();
          
          Alert.alert(
            'Email Not Verified',
            'You need to verify your email before logging in. We\'ve sent a verification email to your address.',
            [{ text: 'OK' }]
          );
        } catch (err) {
          console.error('Error during temporary sign-in:', err);
          Alert.alert(
            'Email Not Verified',
            'You need to verify your email before logging in. Please check your inbox for the verification link.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Account Not Found',
          'No account exists with this email address.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error handling verification:', error);
      Alert.alert(
        'Verification Failed',
        'Could not send verification email. Please try again later or use a different login method.'
      );
    }
  };
  
  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const user = await login(email, password);
      console.log('Login successful:', user?.email);
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      
      // Handle verification error specifically
      if (error.code === 'auth/email-not-verified') {
        handleEmailVerificationError();
        setIsLoading(false);
        return;
      }
      
      // Provide specific error messages based on Firebase auth error codes
      switch(error.code) {
        case 'auth/invalid-email':
          Alert.alert(
            'Invalid Email', 
            'Please check your email format and try again.'
          );
          break;
        
        case 'auth/user-not-found':
          Alert.alert(
            'Account Not Found', 
            'No account exists with this email. Please check your email or create a new account.'
          );
          break;
        
        case 'auth/wrong-password':
          Alert.alert(
            'Incorrect Password', 
            'The password you entered is incorrect. Please try again or use "Forgot Password".'
          );
          break;
        
        case 'auth/too-many-requests':
          Alert.alert(
            'Too Many Attempts', 
            'Too many failed login attempts. Please wait a few minutes before trying again or reset your password.',
            [
              { 
                text: 'Reset Password',
                onPress: () => {
                  if (email) {
                    firebase.auth().sendPasswordResetEmail(email)
                      .then(() => {
                        Alert.alert(
                          'Password Reset Email Sent',
                          'Check your email for instructions to reset your password.'
                        );
                      })
                      .catch(err => {
                        console.error('Error sending password reset:', err);
                        Alert.alert(
                          'Error',
                          'Could not send password reset. Please try again later.'
                        );
                      });
                  } else {
                    Alert.alert('Enter Email', 'Please enter your email address first');
                  }
                }
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
          break;
        
        case 'auth/user-disabled':
          Alert.alert(
            'Account Disabled', 
            'This account has been disabled. Please contact support for assistance.'
          );
          break;
          
        case 'auth/network-request-failed':
          Alert.alert(
            'Network Error', 
            'Unable to connect to authentication servers. Please check your internet connection and try again.'
          );
          break;
          
        default:
          Alert.alert(
            'Login Failed',
            'There was a problem logging into your account. Please try again later.'
          );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Apple login
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithApple();
      console.log('Apple login successful');
    } catch (error) {
      console.log('Apple login error:', error);
      // Don't show an error for user cancellations
      if (error.code !== 'ERR_CANCELED') {
        // Specific error for Expo Go audience mismatch
        if (error.code === 'auth/invalid-credential' && error.message?.includes('audience')) {
          Alert.alert(
            'Development Mode Issue',
            'Apple Sign In has authentication restrictions when testing in Expo Go. We\'ve implemented a workaround that should work if you provided your email during Apple Sign In.',
            [{ text: 'OK' }]
          );
        } else if (error.message?.includes('No email provided from Apple')) {
          Alert.alert(
            'Email Required',
            'For development testing in Expo Go, you need to share your email address with the app when signing in with Apple.',
            [{ text: 'Try Again' }]
          );
        } else {
          Alert.alert('Error', 'Apple sign in failed. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle guest login
  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      await guestLogin();
      console.log('Guest login successful');
    } catch (error) {
      console.log('Guest login error:', error);
      Alert.alert('Error', 'Guest sign in failed. Please try again or use another login method.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social logins
  const handleSocialLogin = (provider) => {
    if (provider === 'Apple' && appleAuthAvailable) {
      handleAppleLogin();
    } else if (provider === 'Guest') {
      handleGuestLogin();
    } else {
      Alert.alert('Coming Soon', `${provider} login will be available soon!`);
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
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Login to your Account</Text>
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

            {/* Social Login Options */}
            <View style={styles.socialLoginContainer}>
              <Text style={styles.socialLoginText}>- Or sign in with -</Text>
              <View style={styles.socialButtons}>
                {appleAuthAvailable ? (
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPress={() => handleSocialLogin('Apple')}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-apple" size={24} color={THEME.TEXT.PRIMARY} />
                  </TouchableOpacity>
                ) : null}
                {Platform.OS !== 'ios' && (
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPress={() => handleSocialLogin('Google')}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-google" size={24} color={THEME.TEXT.PRIMARY} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Guest')}
                  disabled={isLoading}
                  onLongPress={() => Alert.alert(
                    'Guest Login',
                    'Sign in without an account. Your data will only be stored on this device and will be lost if you log out.',
                    [{ text: 'Got it' }]
                  )}
                >
                  <Ionicons name="person-outline" size={24} color={THEME.TEXT.PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupText}>Sign Up</Text>
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
  header: {
    marginBottom: THEME.SPACING.XLARGE,
    paddingHorizontal: 0,
  },
  title: {
    ...TYPOGRAPHY.BODY_2,
    fontSize: 16,
    color: THEME.TEXT.SECONDARY,
    textAlign: 'left',
    marginLeft: 6,
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
  loginButton: {
    borderRadius: THEME.RADIUS.MEDIUM,
    overflow: 'hidden',
    ...THEME.SHADOWS.MEDIUM,
    marginBottom: 60,
    marginTop: THEME.SPACING.LARGE,
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
  socialLoginContainer: {
    alignItems: 'center',
    marginBottom: THEME.SPACING.LARGE,
    marginTop: 30,
  },
  socialLoginText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
    marginBottom: THEME.SPACING.MEDIUM,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.SPACING.MEDIUM,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.SHADOWS.SMALL,
    marginHorizontal: THEME.SPACING.SMALL,
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
});

export default LoginScreen;