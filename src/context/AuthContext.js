// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import firebase from '../firebase/firebaseConfig';

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

  // Sign out the current user
  const logout = async () => {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
    logout
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