// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import firebase from '../firebase/firebaseConfig';
import * as AppleAuthentication from 'expo-apple-authentication';
import appleAuth from '../utils/appleAuth';
import { signInAnonymously } from '../firebase/firebaseConfig';
import { updateUserActivity, registerGuestUser } from '../utils/userActivityTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUserData } from '../models/firestoreModels';

// Create the context
export const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Register a new user
  const register = async (email, password, displayName) => {
    try {
      setIsRegistering(true);
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      // Update the user profile with displayName
      await userCredential.user.updateProfile({
        displayName: displayName
      });
      
      // Send email verification
      await userCredential.user.sendEmailVerification();
      
      // Log out the user to force them to log in after verification
      await firebase.auth().signOut();
      
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  // Send email verification to current user
  const sendVerificationEmail = async () => {
    try {
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }
      
      await currentUser.sendEmailVerification();
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  };
  
  // Check if user's email is verified
  const checkEmailVerification = async () => {
    try {
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        return false;
      }
      
      // Reload user to get latest verification status
      await currentUser.reload();
      const freshUser = firebase.auth().currentUser;
      return freshUser.emailVerified;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  };

  // Sign in an existing user
  const login = async (email, password) => {
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      
      // Check if email is verified for non-anonymous users
      if (!userCredential.user.emailVerified && !userCredential.user.isAnonymous) {
        // Log the user out immediately
        await firebase.auth().signOut();
        
        // Throw specific error for unverified email
        const error = new Error('Email not verified');
        error.code = 'auth/email-not-verified';
        throw error;
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      console.log('AuthContext: Starting Apple Sign-In');
      const userCredential = await appleAuth.signInWithApple();
      
      // If we get here, the sign-in was successful
      console.log('AuthContext: Apple Sign-In successful');
      
      // Update user activity if applicable
      if (userCredential.user) {
        try {
          // Update lastLogin timestamp
          const userRef = firebase.firestore().collection('users').doc(userCredential.user.uid);
          await userRef.set({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          
          console.log('AuthContext: Updated user last login timestamp');
        } catch (error) {
          console.warn('Failed to update user activity after Apple login:', error);
          // Non-critical error, do not throw
        }
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('AuthContext: Apple sign in error:', error);
      
      // Specific handling for different error types
      if (error.code === 'ERR_CANCELED') {
        // User cancelled the sign-in flow, just log and rethrow
        console.log('AuthContext: User cancelled Apple Sign-In');
      } else if (error.code && error.code.startsWith('auth/')) {
        // Firebase authentication errors
        console.error('AuthContext: Firebase auth error during Apple Sign-In:', error.code);
      }
      
      throw error;
    }
  };

  // Sign in as guest (anonymous)
  const guestLogin = async () => {
    try {
      const userCredential = await signInAnonymously();
      
      // Set a display name for the anonymous user
      const guestNumber = Math.floor(Math.random() * 10000);
      const displayName = `Guest ${guestNumber}`;
      
      await userCredential.updateProfile({
        displayName: displayName
      });
      
      // Register guest user for activity tracking
      await registerGuestUser(userCredential.uid);
      
      // Save user type to AsyncStorage
      await AsyncStorage.setItem('user_type', 'guest');
      
      return userCredential;
    } catch (error) {
      console.error('Guest login error:', error);
      throw error;
    }
  };

  // Sign out the current user
  const logout = async () => {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  /**
   * Cancels and permanently deletes a user account
   * This process consists of two steps:
   * 1. Deleting all user data from Firestore (using deleteUserData)
   * 2. Deleting the Firebase Authentication account
   * 
   * After deletion, the onAuthStateChanged listener will detect that
   * the user is no longer authenticated and update the app state
   * 
   * @returns {Promise<void>}
   */
  const cancelAccount = async () => {
    try {
      // Get current user
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const userId = currentUser.uid;
      
      // Delete all user data from Firestore first
      await deleteUserData(userId);
      
      // Delete the Firebase Authentication account
      await currentUser.delete();
      
      // The onAuthStateChanged listener will handle setting user to null
      console.log('User account successfully deleted');
      
    } catch (error) {
      console.error('Error canceling account:', error);
      throw error;
    }
  };

  // Update user activity (used throughout the app)
  const trackUserActivity = async () => {
    if (user && user.isAnonymous) {
      await updateUserActivity(user.uid);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    setLoading(true);

    const unsubscribe = firebase.auth().onAuthStateChanged(async (currentUser) => {
      // If we're in the registration process, don't set the user
      // This prevents automatic login after registration
      if (isRegistering) {
        console.log("Ignoring auth state change during registration");
        setLoading(false);
        return;
      }
      
      if (currentUser) {
        console.log("User authenticated:", currentUser.uid);
        setUser(currentUser);
        
        // Update activity timestamp on login for guest users
        if (currentUser.isAnonymous) {
          updateUserActivity(currentUser.uid);
          
          // Set user type in AsyncStorage
          await AsyncStorage.setItem('user_type', 'guest');
        } else {
          // Regular logged in user
          await AsyncStorage.setItem('user_type', 'registered');
        }
      } else {
        console.log("No user authenticated");
        setUser(null);
        
        // Clear user type when logged out
        await AsyncStorage.removeItem('user_type');
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [isRegistering]);

  // Context value
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    signInWithApple,
    guestLogin,
    trackUserActivity,
    cancelAccount,
    sendVerificationEmail,
    checkEmailVerification
  };

  // Provider return
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};