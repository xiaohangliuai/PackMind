import * as AppleAuthentication from 'expo-apple-authentication';
import firebase from '../firebase/firebaseConfig';

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

    // Create the Firebase credential
    const provider = new firebase.auth.OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken,
      rawNonce: nonce, // passing the nonce as rawNonce helps with validation
    });

    // Sign in to Firebase
    const userCredential = await firebase.auth().signInWithCredential(credential);
    
    // Update user profile with Apple name if available
    if (appleCredential.fullName && 
        (userCredential.additionalUserInfo?.isNewUser || 
         !userCredential.user.displayName)) {
      const displayName = `${appleCredential.fullName.givenName || ''} ${appleCredential.fullName.familyName || ''}`.trim();
      
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }
    }
    
    return userCredential;
  } catch (error) {
    // Handle user cancellation separately
    if (error.code === 'ERR_CANCELED') {
      console.log('User canceled Apple Sign In');
      throw error;
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