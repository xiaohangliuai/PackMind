// src/screens/main/PremiumScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePremium } from '../../context/PremiumContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, THEME } from '../../constants/theme';
import firebase from '../../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default premium values
const DEFAULT_PREMIUM_STATE = {
  isPremium: false,
  subscriptionType: null,
  pricing: {
    MONTHLY: 1.99,
    ANNUAL: 14.99, 
    LIFETIME: 24.99
  },
  limits: {
    MAX_LISTS: 3
  }
};

const PremiumScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  
  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  
  // State for modals
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  
  // Safely try to use premium context
  let premiumContext = null;
  let isPremium = false;
  let subscriptionType = null;
  let subscriptionExpiryDate = null;
  let pricing = DEFAULT_PREMIUM_STATE.pricing;
  let limits = DEFAULT_PREMIUM_STATE.limits;
  let products = [];
  let isRestoring = false;
  let subscribeToPremium = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
  let restorePurchases = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
  
  // Try to get premium context
  try {
    premiumContext = usePremium();
    if (premiumContext) {
      isPremium = premiumContext.isPremium;
      subscriptionType = premiumContext.subscriptionType;
      subscriptionExpiryDate = premiumContext.subscriptionExpiryDate;
      pricing = premiumContext.pricing || DEFAULT_PREMIUM_STATE.pricing;
      limits = premiumContext.limits || DEFAULT_PREMIUM_STATE.limits;
      products = premiumContext.products || [];
      isRestoring = premiumContext.isRestoring || false;
      subscribeToPremium = premiumContext.subscribeToPremium;
      restorePurchases = premiumContext.restorePurchases;
    }
  } catch (error) {
    console.log('Premium context not available yet:', error);
  }
  
  // Find real product prices if available
  const getProductPrice = (planType) => {
    // Default prices
    let price = pricing.MONTHLY;
    if (planType === 'annual') price = pricing.ANNUAL;
    if (planType === 'lifetime') price = pricing.LIFETIME;
    
    // Try to get real price from store products
    if (products && products.length > 0) {
      const productId = planType === 'monthly' ? 'com.packmind.premium.monthly' :
                         planType === 'annual' ? 'com.packmind.premium.annual' :
                         'com.packmind.premium.lifetime';
      
      const product = products.find(p => p.productId === productId);
      if (product && product.price) {
        return product.localizedPrice || `$${product.price}`;
      }
    }
    
    // Fallback to default pricing if no product info
    return `$${price.toFixed(2)}`;
  };
  
  // Handle selecting a plan during trial
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  // Handle subscribe
  const handleSubscribe = async () => {
    // If user is anonymous, inform them they need to create an account first
    if (user?.isAnonymous) {
      Alert.alert(
        'Account Required',
        'Please create a full account to subscribe to premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Account', 
            onPress: () => navigation.navigate('AuthStack')
          }
        ]
      );
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const success = await subscribeToPremium(selectedPlan);
      
      if (success) {
        Alert.alert(
          'Subscription Successful!',
          'Thank you for subscribing to PackMind+ Premium!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle goBack
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Handle restore purchases
  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'This will restore any previous purchases you made with your current account. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          onPress: async () => {
            try {
              await restorePurchases();
            } catch (error) {
              console.error('Error in restore purchases:', error);
            }
          } 
        }
      ]
    );
  };
  
  // Check if premium context is available
  const isPremiumAvailable = premiumContext !== null;
  
  // Handle open Terms of Service
  const handleOpenTerms = () => {
    setIsTermsModalVisible(true);
  };
  
  // Handle close Terms of Service
  const handleCloseTerms = () => {
    setIsTermsModalVisible(false);
  };
  
  // Handle open Privacy Policy
  const handleOpenPrivacy = () => {
    setIsPrivacyModalVisible(true);
  };
  
  // Handle close Privacy Policy
  const handleClosePrivacy = () => {
    setIsPrivacyModalVisible(false);
  };
  
  // If premium context is not available, show loading indicator
  if (!isPremiumAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.PRIMARY} />
          <Text style={styles.loadingText}>Loading premium information...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Show loading while restoring purchases
  if (isRestoring) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.PRIMARY} />
          <Text style={styles.loadingText}>Restoring purchases...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isPremium ? 'Premium Status' : 'Upgrade to Premium'}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isPremium ? (
          // Premium user content
          <View style={styles.premiumActiveContainer}>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={30} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>Premium Active</Text>
            </View>
            
            <Text style={styles.thankYouText}>
              Thank you for being a premium subscriber!
            </Text>
            
            <Text style={styles.currentPlanText}>
              Current Plan: {
                            subscriptionType === 'monthly' ? 'Monthly' :
                            subscriptionType === 'annual' ? 'Annual' : 'Lifetime'}
            </Text>
            
            {/* Restore Purchases button for premium users */}
            <TouchableOpacity
              style={styles.premiumRestoreButton}
              onPress={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={THEME.PRIMARY} />
              ) : (
                <Text style={styles.premiumRestoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Non-premium user content - now available for all users including guest users
          <>
            {/* Premium Features */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresSectionTitle}>Premium Features</Text>
              
              <View style={styles.feature}>
                <Ionicons name="infinite" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Unlimited Lists</Text>
                  <Text style={styles.featureDescription}>
                    Create as many packing lists as you need (Free: {limits.MAX_LISTS} lists)
                  </Text>
                </View>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="notifications" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Advanced Notifications</Text>
                  <Text style={styles.featureDescription}>
                    Custom reminders, recurring notifications, and more
                  </Text>
                </View>
              </View>

              <View style={styles.feature}>
                <Ionicons name="happy" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Custom Emoji Icons</Text>
                  <Text style={styles.featureDescription}>
                    Personalize your packing list items with custom emoji icons
                  </Text>
                </View>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="headset" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Priority Support</Text>
                  <Text style={styles.featureDescription}>
                    Get help faster when you need it
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Pricing Plans */}
            <View style={styles.pricingSection}>
              <Text style={styles.pricingSectionTitle}>Choose Your Plan</Text>
              
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan('monthly')}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Monthly</Text>
                  {selectedPlan === 'monthly' && (
                    <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
                  )}
                </View>
                <Text style={styles.planPrice}>{getProductPrice('monthly')}</Text>
                <Text style={styles.planDescription}>Auto-renewed monthly Until Cancelled</Text>
              </TouchableOpacity>
              
              {/* Annual Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'annual' && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan('annual')}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Annual</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>Save 37%</Text>
                  </View>
                  {selectedPlan === 'annual' && (
                    <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
                  )}
                </View>
                <Text style={styles.planPrice}>{getProductPrice('annual')}</Text>
                <Text style={styles.monthlyEquivalent}>
                  ($1.25/month)
                </Text>
              <View style={styles.freeTrialBadge}>
                <Ionicons name="gift-outline" size={16} color="white" />
                <Text style={styles.freeTrialBadgeText}>14-Day Free Trial</Text>
              </View>
              <Text style={styles.planDescription}>Auto-renewed annually until cancelled</Text>
              </TouchableOpacity>
              
              {/* Lifetime Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'lifetime' && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan('lifetime')}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Lifetime</Text>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>Best Value</Text>
                  </View>
                  {selectedPlan === 'lifetime' && (
                    <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
                  )}
                </View>
                <Text style={styles.planPrice}>{getProductPrice('lifetime')}</Text>
                <Text style={styles.planDescription}>One-time payment</Text>
              </TouchableOpacity>
            </View>
            
            {/* Subscribe button */}
            <TouchableOpacity
              style={[styles.subscribeButton, isProcessing && styles.disabledButton]}
              onPress={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedPlan === 'annual' ? 'Start Free Trial' : 'Subscribe Now'}
              </Text>
              )}
            </TouchableOpacity>
            
            {/* Restore Purchases button */}
            <TouchableOpacity
              style={styles.restorePurchasesButton}
              onPress={handleRestorePurchases}
              disabled={isProcessing}
            >
              <Text style={styles.restorePurchasesText}>Restore Purchases</Text>
            </TouchableOpacity>
            
            {/* Terms and conditions */}
            <Text style={styles.termsText}>
              By subscribing, you agree to our{' '}
              <Text style={styles.termsLink} onPress={handleOpenTerms}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.termsLink} onPress={handleOpenPrivacy}>
                Privacy Policy
              </Text>. 
              {selectedPlan === 'annual' 
                ? ' 14-day free trial available for new Annual subscribers. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.' 
                : selectedPlan === 'lifetime'
                  ? ' Lifetime plan is a one-time payment that grants access to all premium features without recurring charges.'
                  : ' Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.'}
            </Text>
          </>
        )}
      </ScrollView>
      
      {/* Terms of Service Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTermsModalVisible}
        onRequestClose={handleCloseTerms}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleCloseTerms}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>PackMind+ Terms of Service</Text>
              <Text style={styles.legalDate}>Last Updated: April 13, 2025</Text>
              
              <Text style={styles.legalSectionTitle}>1. Introduction</Text>
              <Text style={styles.legalText}>
                PackMind+ is a personal organization application that helps users create and manage packing lists for various activities and trips. By downloading, installing, or using PackMind+ ("App"), you agree to be bound by these Terms of Service. If you do not agree with these terms, please do not use the App.
              </Text>
              
              <Text style={styles.legalSectionTitle}>2. Email Verification</Text>
              <Text style={styles.legalText}>
                The email verification feature ensures that users verify their email addresses before they can log in to the app. This helps improve security, reduces spam accounts, and ensures that users provide valid contact information.
              </Text>
              
              <Text style={styles.legalSubtitle}>2.1 How It Works</Text>
              <Text style={styles.legalText}>
                Registration Process:
                {'\n'}1. When a user registers with an email and password, a verification email is automatically sent.
                {'\n'}2. After registration, the user is automatically logged out and redirected to the login screen.
                {'\n'}3. The user is prompted to check their email and verify their account before attempting to log in.
                {'\n'}4. The user must click the verification link in the email to complete the verification process.
              </Text>
              
              <Text style={styles.legalSubtitle}>2.2 Login Process</Text>
              <Text style={styles.legalText}>
                1. When a user tries to log in, the system checks if their email is verified.
                {'\n'}2. If their email is not verified:
                {'\n'}   - They are prevented from logging in
                {'\n'}   - They are given the option to resend the verification email via a Cloud Function
                {'\n'}   - They must verify their email before they can access the app
              </Text>
              
              <Text style={styles.legalSubtitle}>2.3 Verification Emails</Text>
              <Text style={styles.legalText}>
                - Initial verification emails are sent automatically during registration
                {'\n'}- Users can request additional verification emails if needed
                {'\n'}- Verification is handled via Firebase's built-in email verification system
                {'\n'}- A custom Cloud Function is used to resend verification emails when needed
              </Text>
              
              <Text style={styles.legalSectionTitle}>3. User Responsibilities</Text>
              <Text style={styles.legalSubtitle}>3.1 Accurate Information</Text>
              <Text style={styles.legalText}>
                You agree to provide accurate and complete information when creating an account and using the App.
              </Text>
              <Text style={styles.legalSubtitle}>3.2 Lawful Use</Text>
              <Text style={styles.legalText}>
                You agree not to use the App for any illegal or unauthorized purpose. You must not attempt to interfere with the App's functionality or security.
              </Text>
              <Text style={styles.legalSubtitle}>3.3 User Conduct</Text>
              <Text style={styles.legalText}>
                You are responsible for all activities that occur under your account. You must not engage in any activity that could harm, disable, or impair the App.
              </Text>
              
              <Text style={styles.legalSectionTitle}>4. Account & Access</Text>
              <Text style={styles.legalSubtitle}>4.1 Firebase Integration</Text>
              <Text style={styles.legalText}>
                We use Firebase for data storage and authentication. Your use of the App is also subject to Google's Terms of Service for Firebase.
              </Text>
              <Text style={styles.legalSubtitle}>4.2 Account Security</Text>
              <Text style={styles.legalText}>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities performed under your account.
              </Text>
              <Text style={styles.legalSubtitle}>4.3 Data Synchronization</Text>
              <Text style={styles.legalText}>
                Your packing lists and preferences may be synchronized across devices using your account credentials.
              </Text>
              
              <Text style={styles.legalSectionTitle}>5. Subscription & In-App Purchases</Text>
              <Text style={styles.legalSubtitle}>5.1 Subscription Options</Text>
              <Text style={styles.legalText}>
                We offer the following premium subscription options:
                {'\n'}- Monthly subscription
                {'\n'}- Annual subscription (includes a 14-day free trial)
                {'\n'}- Lifetime purchase (one-time payment)
              </Text>
              <Text style={styles.legalSubtitle}>5.2 Free Trial</Text>
              <Text style={styles.legalText}>
                Users who select the annual subscription receive a 14-day free trial. If you do not cancel before the trial period ends, you will be automatically charged for the annual subscription.
              </Text>
              <Text style={styles.legalSubtitle}>5.3 Payment Processing</Text>
              <Text style={styles.legalText}>
                All payments are processed through the App Store. Subscription fees are set at the time of purchase.
              </Text>
              <Text style={styles.legalSubtitle}>5.4 Auto-Renewal</Text>
              <Text style={styles.legalText}>
                Subscriptions automatically renew unless canceled at least 24 hours before the current period ends. Refunds must be requested from the App Store.
              </Text>
              <Text style={styles.legalSubtitle}>5.5 Subscription Management</Text>
              <Text style={styles.legalText}>
                You can manage or cancel your subscription through your App Store account settings.
              </Text>
              <Text style={styles.legalSubtitle}>5.6 Refund Policy</Text>
              <Text style={styles.legalText}>
                We do not process refunds directly. All refund requests must be submitted through the App Store according to their policies.
              </Text>
              
              <Text style={styles.legalSectionTitle}>6. Intellectual Property</Text>
              <Text style={styles.legalSubtitle}>6.1 App Ownership</Text>
              <Text style={styles.legalText}>
                PackMind+ and its original content, features, and functionality are owned by the developer and are protected by international copyright, trademark, and other intellectual property laws.
              </Text>
              <Text style={styles.legalSubtitle}>6.2 User Content</Text>
              <Text style={styles.legalText}>
                You retain ownership of any content you create using the App. However, you grant us a non-exclusive license to use this content to provide and improve the App's services.
              </Text>
              <Text style={styles.legalSubtitle}>6.3 Restrictions</Text>
              <Text style={styles.legalText}>
                You may not copy, modify, distribute, sell, or lease any part of the App without explicit permission.
              </Text>
              
              <Text style={styles.legalSectionTitle}>7. Termination</Text>
              <Text style={styles.legalSubtitle}>7.1 Termination by Developer</Text>
              <Text style={styles.legalText}>
                We may suspend or terminate your account and access to the App immediately, without prior notice for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </Text>
              <Text style={styles.legalSubtitle}>7.2 Termination by User</Text>
              <Text style={styles.legalText}>
                You may terminate your use of the App at any time by uninstalling the App and discontinuing its use. If you have an active subscription, you must cancel it separately through your App Store account.
              </Text>
              <Text style={styles.legalSubtitle}>7.3 Effect of Termination</Text>
              <Text style={styles.legalText}>
                Upon termination, your right to use the App will immediately cease. If you terminate your account, we may retain certain data for legitimate business purposes.
              </Text>
              
              <Text style={styles.legalSectionTitle}>8. Limitation of Liability</Text>
              <Text style={styles.legalSubtitle}>8.1 Disclaimer of Warranties</Text>
              <Text style={styles.legalText}>
                THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE APP WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.
              </Text>
              <Text style={styles.legalSubtitle}>8.2 Limitation of Liability</Text>
              <Text style={styles.legalText}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO DATA LOSS OR CORRUPTION, DEVICE DAMAGE, OR FINANCIAL LOSS.
              </Text>
              <Text style={styles.legalSubtitle}>8.3 Data Responsibility</Text>
              <Text style={styles.legalText}>
                You are responsible for maintaining backup copies of your data. We are not responsible for data loss resulting from user actions, device failures, or service interruptions.
              </Text>
              
              <Text style={styles.legalSectionTitle}>9. Apple App Store Terms</Text>
              <Text style={styles.legalSubtitle}>9.1 Third-Party Beneficiary</Text>
              <Text style={styles.legalText}>
                Apple and its subsidiaries are third-party beneficiaries of this agreement. Upon your acceptance of these terms, Apple will have the right to enforce this agreement against you as a third-party beneficiary.
              </Text>
              <Text style={styles.legalSubtitle}>9.2 Responsibility for App</Text>
              <Text style={styles.legalText}>
                We, not Apple, are solely responsible for the App and its services, including maintenance, support, warranties, and addressing any claims.
              </Text>
              <Text style={styles.legalSubtitle}>9.3 Compliance with Third-Party Terms</Text>
              <Text style={styles.legalText}>
                You agree to comply with all applicable third-party agreements when using the App, such as your wireless data service agreement.
              </Text>
              
              <Text style={styles.legalSectionTitle}>10. Changes to Terms</Text>
              <Text style={styles.legalText}>
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting in the App. Your continued use of the App after any changes indicates your acceptance of the modified Terms.
              </Text>
              
              <Text style={styles.legalSectionTitle}>11. Contact Information</Text>
              <Text style={styles.legalText}>
                For questions about these Terms, please contact:
                {'\n'}Email: 2024@xiaohangliuai.com
              </Text>
              
              <Text style={styles.legalDate}>Effective Date: April 13, 2025</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isPrivacyModalVisible}
        onRequestClose={handleClosePrivacy}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleClosePrivacy}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>PackMind+ Privacy Policy</Text>
              <Text style={styles.legalDate}>Last Updated: April 13, 2025</Text>
              
              <Text style={styles.legalSectionTitle}>Introduction</Text>
              <Text style={styles.legalText}>
                PackMind+ ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Information Collected</Text>
              <Text style={styles.legalText}>
                We may collect the following types of information:
              </Text>
              <Text style={styles.legalSectionTitle}>Personal Information</Text>
              <Text style={styles.legalText}>
                • Account Information: Name, email address, your packing list information and so on
                {'\n'}• Firebase ID: Unique identifier for authentication and data synchronization
              </Text>
              
              <Text style={styles.legalSectionTitle}>How We Use Your Information</Text>
              <Text style={styles.legalText}>
                We use the information we collect to:
                {'\n'}• Create and manage your account
                {'\n'}• Synchronize your packing lists across devices
                {'\n'}• Send reminder notifications for your scheduled activities
                {'\n'}• Troubleshoot technical issues
                {'\n'}• Process and manage your subscription
                {'\n'}• Communicate important updates about the app
              </Text>
              
              <Text style={styles.legalSectionTitle}>Data Sharing & Third Parties</Text>
              <Text style={styles.legalSectionTitle}>Firebase</Text>
              <Text style={styles.legalText}>
                We use Google Firebase for authentication, data storage, and synchronization. Your use of these services is subject to Google's Privacy Policy.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Apple Services</Text>
              <Text style={styles.legalText}>
                Payment information for subscriptions is processed directly by Apple. We do not store your payment details on our servers.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Data Protection Commitment</Text>
              <Text style={styles.legalText}>
                We are committed to protecting your personal data. As part of this commitment, we will never sell, rent, or trade your personal information to any third parties for marketing or advertising purposes. Any sharing of your data is strictly limited to what is necessary to provide our services and will only occur with your explicit consent, except where required by law.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Security Measures</Text>
              <Text style={styles.legalText}>
                Your privacy and the security of your data are of utmost importance to us. We implement industry-standard technical safeguards and administrative protocols to protect your information from unauthorized access, accidental loss, or alteration. While no digital system can guarantee absolute security, we continuously review and enhance our security practices to provide the highest level of protection possible for your personal information.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Policy Updates</Text>
              <Text style={styles.legalText}>
                We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date at the top of this policy. When we make significant changes, you will be notified through an app update, and the latest privacy policy will always be available within the current version of the app. To ensure you're aware of any changes, we recommend keeping your app updated to the latest version and reviewing this Privacy Policy periodically.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Contact Information</Text>
              <Text style={styles.legalText}>
                If you have questions or concerns about this Privacy Policy, please contact us at:
                {'\n'}Email: 2024@xiaohangliuai.com
              </Text>
              
              <Text style={styles.legalDate}>Effective Date: April 13, 2025</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pricingSection: {
    marginBottom: 25,
  },
  pricingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  planCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: THEME.PRIMARY,
    backgroundColor: 'rgba(143, 133, 246, 0.05)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.PRIMARY,
    marginTop: 5,
  },
  monthlyEquivalent: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  lifetimeNote: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: COLORS.SUCCESS_LIGHT,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 5,
  },
  saveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.SUCCESS,
  },
  bestValueBadge: {
    backgroundColor: COLORS.GOLD_LIGHT,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 5,
  },
  bestValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.GOLD_DARK,
  },
  featuresSection: {
    marginBottom: 25,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  featureIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 14,
    color: '#777',
  },
  subscribeButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  highlightedButton: {
    backgroundColor: THEME.PRIMARY,
  },
  highlightedButtonText: {
    color: 'white',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  termsLink: {
    color: THEME.PRIMARY,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalBackButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  legalContent: {
    paddingBottom: 40,
  },
  legalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  legalDate: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
  },
  legalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  legalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 15,
    marginBottom: 5,
  },
  legalText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 15,
  },
  premiumActiveContainer: {
    alignItems: 'center',
    padding: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GOLD_LIGHT,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  premiumBadgeText: {
    color: COLORS.GOLD_DARK,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  currentPlanText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#777',
    marginTop: 10,
  },
  premiumRestoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  
  restorePurchasesButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  restorePurchasesText: {
    color: THEME.PRIMARY,
    fontWeight: '600',
  },
  premiumRestoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 5,
    width: '70%',
  },
  premiumRestoreText: {
    color: THEME.PRIMARY,
    fontWeight: '600',
  },
 
  freeTrialBadge: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  freeTrialBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
});

export default PremiumScreen; 