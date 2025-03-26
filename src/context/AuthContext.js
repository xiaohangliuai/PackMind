// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import firebase from '../firebase/firebaseConfig';
import * as AppleAuthentication from 'expo-apple-authentication';
import appleAuth from '../utils/appleAuth';
import { signInAnonymously } from '../firebase/firebaseConfig';
import { updateUserActivity, registerGuestUser } from '../utils/userActivityTracker';

// Create the context
export const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register a new user
  const register = async (email, password, displayName) => {
    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      // Update the user profile with displayName
      await userCredential.user.updateProfile({
        displayName: displayName
      });
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Sign in an existing user
  const login = async (email, password) => {
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      const userCredential = await appleAuth.signInWithApple();
      return userCredential.user;
    } catch (error) {
      console.error('Apple sign in error:', error);
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

    const unsubscribe = firebase.auth().onAuthStateChanged((currentUser) => {
      if (currentUser) {
        console.log("User authenticated:", currentUser.uid);
        setUser(currentUser);
        
        // Update activity timestamp on login for guest users
        if (currentUser.isAnonymous) {
          updateUserActivity(currentUser.uid);
        }
      } else {
        console.log("No user authenticated");
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Context value
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    signInWithApple,
    guestLogin,
    trackUserActivity
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