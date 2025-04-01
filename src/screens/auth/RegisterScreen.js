// src/screens/auth/RegisterScreen.js
import React, { useState, useEffect } from 'react';
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
import * as AppleAuthentication from 'expo-apple-authentication';
import firebase from '../../firebase/firebaseConfig';

const RegisterScreen = ({ navigation, route }) => {
  // Check if coming from guest account
  const fromGuest = route.params?.fromGuest || false;
  const guestUserId = route.params?.guestUserId;
  const guestDisplayName = route.params?.guestDisplayName || '';
  
  // Check if coming from anonymous account in Premium screen
  const fromAnonymous = route.params?.fromAnonymous || false;
  const anonymousUid = route.params?.anonymousUid;
  const returnScreen = route.params?.returnScreen;
  
  console.log('RegisterScreen: route.params =', route.params);
  console.log('RegisterScreen: fromGuest =', fromGuest);
  console.log('RegisterScreen: fromAnonymous =', fromAnonymous);
  console.log('RegisterScreen: anonymousUid =', anonymousUid);
  console.log('RegisterScreen: returnScreen =', returnScreen);
  
  const [fullName, setFullName] = useState(fromGuest ? guestDisplayName.replace('Guest ', '') : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  const { register, signInWithApple, logout } = useAuth();
  
  // Check if Apple Authentication is available
  useEffect(() => {
    (async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    })();
  }, []);
  
  // Validate form
  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    
    if (!password) {
      Alert.alert('Missing Password', 'Please enter a password.');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return false;
    }
    
    if (!confirmPassword) {
      Alert.alert('Missing Confirmation', 'Please confirm your password.');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Your password and confirmation do not match. Please try again.');
      return false;
    }
    
    return true;
  };
  
  // Transfer guest data to new account
  const transferGuestData = async (newUserId, oldUserId) => {
    try {
      console.log('Starting data transfer from guest account:', oldUserId, 'to new account:', newUserId);
      
      // Copy user data from guest to permanent account
      const db = firebase.firestore();
      
      // Copy packing lists - Get all the user's lists
      const listsSnapshot = await db.collection('packingLists')
        .where('userId', '==', oldUserId)
        .get();
      
      console.log('Found', listsSnapshot.size, 'packing lists to transfer');
      
      // Batch all updates
      let batch = db.batch();
      let batchCount = 0;
      const batchLimit = 500; // Firestore batch limit is 500
      
      // Update packing lists
      for (const doc of listsSnapshot.docs) {
        if (batchCount >= batchLimit) {
          // Commit batch and create a new one if we hit the limit
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
        
        const newDocRef = db.collection('packingLists').doc();
        const data = doc.data();
        data.userId = newUserId; // Change user ID to new user
        batch.set(newDocRef, data);
        batchCount++;
      }
      
      // Execute packing lists batch if there's anything to commit
      if (batchCount > 0) {
        await batch.commit();
        console.log('Successfully transferred packing lists');
      }
      
      // Delete the guest user data after successful transfer
      try {
        console.log('Deleting old guest data');
        
        // Create new batch for deletion
        let deleteBatch = db.batch();
        batchCount = 0;
        
        // Delete original packing lists
        for (const doc of listsSnapshot.docs) {
          if (batchCount >= batchLimit) {
            // Commit batch and create a new one if we hit the limit
            await deleteBatch.commit();
            deleteBatch = db.batch();
            batchCount = 0;
          }
          
          deleteBatch.delete(doc.ref);
          batchCount++;
        }
        
        // Commit deletion batch if there's anything to delete
        if (batchCount > 0) {
          await deleteBatch.commit();
        }
        
        // Delete user document from users collection
        await db.collection('users').doc(oldUserId).delete();
        
        console.log('Successfully cleaned up guest data');
      } catch (deleteError) {
        console.error('Error cleaning up guest data:', deleteError);
        // Continue execution even if deletion fails
      }
      
      return true;
    } catch (error) {
      console.error('Error transferring guest data:', error);
      return false;
    }
  };
  
  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // If coming from guest account, we need to handle guest data transfer
      if ((fromGuest && guestUserId) || (fromAnonymous && anonymousUid)) {
        console.log('Registering new account from anonymous/guest user');
        
        // The ID of the anonymous/guest user
        const oldUserId = fromAnonymous ? anonymousUid : guestUserId;
        
        // Register new user with Firebase Auth
        const user = await register(email, password, fullName);
        console.log('Created new user account:', user.uid);
        
        // Create user profile in Firestore
        await createUserProfile(user.uid, {
          fullName,
          email,
          createdLists: 0,
          premium: false
        });
        
        // Transfer data from guest/anonymous to new account
        const transferSuccess = await transferGuestData(user.uid, oldUserId);
        
        if (transferSuccess) {
          Alert.alert(
            'Account Created', 
            'Your account has been created successfully and your data has been transferred! Please refresh the screen to see your data.',
            [{ 
              text: 'OK',
              onPress: () => {
                // If coming from Premium screen, navigate back there
                if (fromAnonymous && returnScreen) {
                  navigation.navigate(returnScreen);
                }
              }
            }]
          );
        } else {
          Alert.alert(
            'Account Created', 
            'Your account has been created successfully, but we encountered an issue transferring your data.',
            [{ 
              text: 'OK',
              onPress: () => {
                // If coming from Premium screen, navigate back there
                if (fromAnonymous && returnScreen) {
                  navigation.navigate(returnScreen);
                }
              }
            }]
          );
        }
      } else {
        // Regular registration flow
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
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Registration error:', error.code, error.message);
      
      // Provide specific error messages based on Firebase auth error codes
      switch(error.code) {
        case 'auth/email-already-in-use':
          Alert.alert(
            'Email Already Used', 
            'An account with this email already exists. Please use a different email or try logging in instead.'
          );
          break;
          
        case 'auth/invalid-email':
          Alert.alert(
            'Invalid Email', 
            'Please enter a valid email address.'
          );
          break;
          
        case 'auth/weak-password':
          Alert.alert(
            'Weak Password', 
            'Your password is too weak. Please choose a stronger password with at least 6 characters.'
          );
          break;
          
        case 'auth/operation-not-allowed':
          Alert.alert(
            'Registration Disabled', 
            'Account creation is currently disabled. Please try again later.'
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
            'Registration Failed',
            'There was a problem creating your account. Please try again later.'
          );
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle Apple sign in
  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithApple();
      
      // We don't need to create a profile as it's handled in the Auth context
      console.log('Apple sign in successful');
    } catch (error) {
      console.log('Apple sign in error:', error);
      // Don't show an error for user cancellations
      if (error.code !== 'ERR_CANCELED') {
        // Handle audience mismatch specifically
        if (error.code === 'auth/invalid-credential' && error.message?.includes('audience')) {
          Alert.alert(
            'Authentication Error', 
            'There was a configuration issue with Apple Sign In. Please try again later or use email registration.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Apple sign in failed. Please try again.');
        }
      }
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
            onPress={() => {
              // If coming from guest upgrade, replace with Login screen 
              // (this prevents back stack issues)
              if (fromGuest) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
                // Normal back navigation
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={THEME.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create your Account</Text>
            
            {/* Guest account info banner */}
            {fromGuest && (
              <View style={styles.guestInfoBanner}>
                <Ionicons name="information-circle-outline" size={20} color={THEME.PRIMARY} style={styles.guestInfoIcon} />
                <Text style={styles.guestInfoText}>
                  Complete this form to create a permanent account. Your guest data will be transferred automatically.
                </Text>
              </View>
            )}
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
            
            {/* Social Login Section */}
            {appleAuthAvailable && (
              <View style={styles.socialSection}>
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.divider} />
                </View>
                
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-apple" size={24} color={COLORS.BLACK} style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </TouchableOpacity>
              </View>
            )}
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
    marginTop: THEME.SPACING.LARGE,
    marginHorizontal: THEME.SPACING.MEDIUM,
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
  socialSection: {
    marginTop: THEME.SPACING.MEDIUM,
    marginBottom: THEME.SPACING.LARGE,
    paddingTop: THEME.SPACING.SMALL,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.SPACING.MEDIUM,
    paddingHorizontal: THEME.SPACING.MEDIUM,
  },
  divider: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
    paddingHorizontal: THEME.SPACING.MEDIUM,
    fontWeight: '500',
    fontSize: 15,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: THEME.RADIUS.LARGE,
    padding: THEME.SPACING.MEDIUM,
    marginTop: THEME.SPACING.SMALL,
    marginHorizontal: THEME.SPACING.LARGE,
    ...THEME.SHADOWS.MEDIUM,
    height: 58,
  },
  socialIcon: {
    marginRight: THEME.SPACING.MEDIUM,
  },
  socialButtonText: {
    ...TYPOGRAPHY.BODY_1,
    color: THEME.TEXT.PRIMARY,
    fontWeight: '600',
    fontSize: 16,
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
  guestInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.SPACING.MEDIUM,
    backgroundColor: COLORS.LAVENDER,
    borderRadius: THEME.RADIUS.MEDIUM,
    marginTop: THEME.SPACING.MEDIUM,
    marginHorizontal: THEME.SPACING.SMALL,
  },
  guestInfoIcon: {
    marginRight: THEME.SPACING.SMALL,
  },
  guestInfoText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
    flex: 1,
  },
});

export default RegisterScreen;