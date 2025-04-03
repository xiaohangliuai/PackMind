import * as AppleAuthentication from 'expo-apple-authentication';
import firebase from '../firebase/firebaseConfig';
import Constants from 'expo-constants';

/**
 * Checks if Apple authentication is available on the current device
 * @returns {Promise<boolean>} Whether Apple authentication is available
 */
export const isAppleAuthAvailable = async () => {
  return await AppleAuthentication.isAvailableAsync();
};

/**
 * Handles Apple sign in flow and returns Firebase user credentials
 * @returns {Promise<firebase.auth.UserCredential>} Firebase user credential
 */
export const signInWithApple = async () => {
  try {
    // Check if Apple authentication is available
    const isAvailable = await isAppleAuthAvailable();
    if (!isAvailable) {
      throw new Error('Apple authentication is not available on this device');
    }

    // Get Apple credentials
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create a Firebase credential
    const { identityToken, nonce } = appleCredential;
    if (!identityToken) {
      throw new Error('No identity token provided from Apple');
    }

    console.log('Apple authentication successful, creating Firebase credential');

    // ---------- DEVELOPMENT WORKAROUND ----------
    // Detect if we're running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('Running in Expo Go, using workaround for Apple Sign-In');
      // In Expo Go, we need to use a different approach
      // Instead of using Firebase's OAuthProvider, we'll manually authenticate with email
      
      try {
        // Extract the email from the Apple credential if available
        const email = appleCredential.email;
        const appleId = appleCredential.user;
        
        // If we have an email, we can try to sign in or create a user
        if (email) {
          // Generate a secure password from the Apple user ID (not ideal, but works for testing)
          const securePassword = `Apple-${appleId}-${Date.now()}`;
          
          // Check if user exists
          try {
            // Try to sign in first
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, securePassword);
            console.log('Found existing user account, signed in');
            return userCredential;
          } catch (signInError) {
            if (signInError.code === 'auth/user-not-found') {
              // User doesn't exist, create a new account
              try {
                console.log('Creating new user account for Apple Sign-In in Expo Go');
                const newUserCredential = await firebase.auth().createUserWithEmailAndPassword(email, securePassword);
                
                // Update user profile with Apple name if available
                if (appleCredential.fullName) {
                  const displayName = `${appleCredential.fullName.givenName || ''} ${appleCredential.fullName.familyName || ''}`.trim();
                  
                  if (displayName) {
                    await newUserCredential.user.updateProfile({
                      displayName: displayName
                    });
                    
                    // Save to Firestore
                    try {
                      const db = firebase.firestore();
                      await db.collection('users').doc(newUserCredential.user.uid).set({
                        displayName: displayName,
                        email: email,
                        appleId: appleId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                        authProvider: 'apple-expo',
                      }, { merge: true });
                    } catch (firestoreError) {
                      console.error('Error saving user to Firestore:', firestoreError);
                    }
                  }
                }
                
                return newUserCredential;
              } catch (createError) {
                console.error('Error creating user account:', createError);
                throw createError;
              }
            } else {
              console.error('Error signing in:', signInError);
              throw signInError;
            }
          }
        } else {
          throw new Error('No email provided from Apple, cannot authenticate in Expo Go');
        }
      } catch (expoWorkaroundError) {
        console.error('Expo Go workaround failed:', expoWorkaroundError);
        throw expoWorkaroundError;
      }
    }
    // ---------- END DEVELOPMENT WORKAROUND ----------

    // Standard production flow (when not in Expo Go)
    // Create the Firebase credential
    const provider = new firebase.auth.OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken,
      rawNonce: nonce, // passing the nonce as rawNonce helps with validation
    });

    // Sign in to Firebase
    console.log('Signing in to Firebase with Apple credential');
    const userCredential = await firebase.auth().signInWithCredential(credential);
    
    // Update user profile with Apple name if available
    if (appleCredential.fullName && 
        (userCredential.additionalUserInfo?.isNewUser || 
         !userCredential.user.displayName)) {
      
      const displayName = `${appleCredential.fullName.givenName || ''} ${appleCredential.fullName.familyName || ''}`.trim();
      
      if (displayName) {
        console.log('Updating user profile with name from Apple');
        await userCredential.user.updateProfile({
          displayName: displayName
        });
        
        // Also save the user data to Firestore if this is a new user
        if (userCredential.additionalUserInfo?.isNewUser) {
          try {
            const db = firebase.firestore();
            await db.collection('users').doc(userCredential.user.uid).set({
              displayName: displayName,
              email: userCredential.user.email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
              authProvider: 'apple',
            }, { merge: true });
            console.log('User profile saved to Firestore');
          } catch (firestoreError) {
            console.error('Error saving user to Firestore:', firestoreError);
            // Continue anyway since authentication was successful
          }
        }
      }
    }
    
    console.log('Apple Sign In completed successfully');
    return userCredential;
  } catch (error) {
    // Handle user cancellation separately
    if (error.code === 'ERR_CANCELED') {
      console.log('User canceled Apple Sign In');
      throw error;
    }
    
    // Handle Firebase errors
    if (error.code?.startsWith('auth/')) {
      console.error('Firebase Authentication Error:', error.code, error.message);
    }
    
    // Log detailed errors for debugging
    console.error('Apple Sign In Error:', error);
    
    // Rethrow for handling upstream
    throw error;
  }
};

export default {
  isAppleAuthAvailable,
  signInWithApple
}; 