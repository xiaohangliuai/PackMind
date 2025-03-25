// src/navigation/RootNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/main/HomeScreen';
import CreateListScreen from '../screens/main/CreateListScreen';
import ListDetailsScreen from '../screens/main/ListDetailsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import ActivityTemplatesScreen from '../screens/main/ActivityTemplatesScreen';
import CollaborativeListScreen from '../screens/main/CollaborativeListScreen';

const Stack = createStackNavigator();

// Auth Navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main Stack Navigator
const MainStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Create" component={CreateListScreen} />
    <Stack.Screen name="ListDetails" component={ListDetailsScreen} />
    <Stack.Screen name="ActivityTemplates" component={ActivityTemplatesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="CollaborativeList" component={CollaborativeListScreen} />
  </Stack.Navigator>
);

// Root Navigator
const RootNavigator = () => {
  // Use the auth context to check if the user is logged in
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Return the appropriate navigator based on auth state
  return isLoggedIn ? <MainStackNavigator /> : <AuthNavigator />;
};

export default RootNavigator; 