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
  
  console.log('RegisterScreen: route.params =', route.params);
  console.log('RegisterScreen: fromGuest =', fromGuest);
  console.log('RegisterScreen: guestUserId =', guestUserId);
  console.log('RegisterScreen: guestDisplayName =', guestDisplayName);
  
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
  
  // Transfer guest data to new account
  const transferGuestData = async (newUserId) => {
    try {
      console.log('Starting data transfer from guest account:', guestUserId, 'to new account:', newUserId);
      
      // Copy user data from guest to permanent account
      const db = firebase.firestore();
      
      // Copy packing lists - Get all the user's lists
      const listsSnapshot = await db.collection('packingLists')
        .where('userId', '==', guestUserId)
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
        await db.collection('users').doc(guestUserId).delete();
        
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
      if (fromGuest && guestUserId) {
        console.log('Registering new account from guest:', guestUserId);
        
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
        
        // Transfer data from guest to new account
        const transferSuccess = await transferGuestData(user.uid);
        
        if (transferSuccess) {
          Alert.alert(
            'Account Created', 
            'Your account has been created successfully and your guest data has been transferred!',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Account Created', 
            'Your account has been created successfully, but we encountered an issue transferring your guest data.',
            [{ text: 'OK' }]
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
      let errorMessage = 'Failed to create account. Please try again.';
      console.error('Registration error:', error);
      
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
                  <Ionicons name="logo-apple" size={20} color={COLORS.BLACK} style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Sign up with Apple</Text>
                </TouchableOpacity>
              </View>
            )}
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
  socialSection: {
    marginTop: THEME.SPACING.LARGE,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.SPACING.MEDIUM,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    ...TYPOGRAPHY.BODY_2,
    color: THEME.TEXT.SECONDARY,
    paddingHorizontal: THEME.SPACING.MEDIUM,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: THEME.RADIUS.LARGE,
    padding: THEME.SPACING.MEDIUM,
    marginTop: THEME.SPACING.SMALL,
    ...THEME.SHADOWS.SMALL,
    height: 50,
  },
  socialIcon: {
    marginRight: THEME.SPACING.SMALL,
  },
  socialButtonText: {
    ...TYPOGRAPHY.BODY_1,
    color: THEME.TEXT.PRIMARY,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.SPACING.XLARGE * 2.3,
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