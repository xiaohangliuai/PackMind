import firebase from '../firebase/firebaseConfig';

/**
 * Updates the last activity timestamp for the current user
 * This is particularly important for guest users to prevent automatic deletion
 */
export const updateUserActivity = async (userId) => {
  if (!userId) return;
  
  try {
    const currentTimestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    // Update the user's activity timestamp in Firestore
    await firebase.firestore()
      .collection('users')
      .doc(userId)
      .set({
        lastActivity: currentTimestamp,
      }, { merge: true }); // Use merge to prevent overwriting other data
      
    console.log('User activity timestamp updated');
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
};

/**
 * Creates or updates the user document with guest status and activity timestamp
 * Should be called when a guest user signs in
 */
export const registerGuestUser = async (userId) => {
  if (!userId) return;
  
  try {
    const currentTimestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    // Create or update the user document
    await firebase.firestore()
      .collection('users')
      .doc(userId)
      .set({
        isGuest: true,
        createdAt: currentTimestamp,
        lastActivity: currentTimestamp,
      }, { merge: true });
      
    console.log('Guest user registered with activity tracking');
  } catch (error) {
    console.error('Error registering guest user:', error);
  }
};

export default {
  updateUserActivity,
  registerGuestUser
}; 