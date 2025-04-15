/**
 * Cloud Functions for Firebase - Guest User Cleanup
 * 
 * This function runs on a schedule (once per day) to check for
 * guest user accounts that have been inactive for more than 3 days
 * and deletes their data from Firebase.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

/**
 * HTTP function to check if a user's email is verified
 * This can be called from the client app to enforce verification for certain actions
 */
exports.checkEmailVerification = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }
    
    // Get the user record
    const userRecord = await admin.auth().getUser(context.auth.uid);
    
    // Check if the user's email is verified
    const isEmailVerified = userRecord.emailVerified;
    
    // If the user is anonymous or email is verified, allow the action
    if (userRecord.providerData.length === 0 || isEmailVerified) {
      return { 
        verified: true,
        message: 'User is verified or anonymous' 
      };
    }
    
    // Email is not verified
    return { 
      verified: false,
      message: 'Email is not verified. Please verify your email before performing this action.' 
    };
  } catch (error) {
    console.error('Error checking email verification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * HTTP function to resend a verification email
 * This can be called from the client app to resend verification emails
 */
exports.resendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const email = data.email;
    
    if (!email) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email is required to resend verification'
      );
    }

    // Find the user by email
    const userRecord = await admin.auth().getUserByEmail(email)
      .catch(error => {
        // If user not found, throw a more user-friendly error
        if (error.code === 'auth/user-not-found') {
          throw new functions.https.HttpsError(
            'not-found',
            'No user found with this email'
          );
        }
        throw error;
      });
    
    // Check if email is already verified
    if (userRecord.emailVerified) {
      return { 
        success: false,
        message: 'Email is already verified' 
      };
    }
    
    // Generate a verification link
    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: 'https://packmind-568eb.firebaseapp.com/login',
      handleCodeInApp: false
    });
    
    // In a real application, you would send the email here using a service like Sendgrid, Mailgun, etc.
    // For this example, we just return the link
    return { 
      success: true,
      message: 'Verification email sent successfully',
      link: link // You wouldn't normally return this in production
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Scheduled function that runs daily to clean up inactive guest accounts
 * Deletes user data if they haven't been active for more than 3 days
 */
exports.cleanupInactiveGuestUsers = functions.pubsub
  .schedule('0 0 * * *') // Run once a day at midnight
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    const threeDAysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds
    
    try {
      console.log('Starting cleanup of inactive guest accounts...');
      
      // Query for guest users who haven't been active for 3+ days
      const querySnapshot = await db.collection('users')
        .where('isGuest', '==', true)
        .where('lastActivity', '<', threeDAysAgo)
        .get();
      
      if (querySnapshot.empty) {
        console.log('No inactive guest accounts found.');
        return null;
      }
      
      console.log(`Found ${querySnapshot.size} inactive guest accounts to clean up.`);
      
      // Delete each inactive guest user and their data
      const deletePromises = [];
      
      querySnapshot.forEach(doc => {
        const userId = doc.id;
        console.log(`Deleting inactive guest user: ${userId}`);
        
        // Delete user data from Firestore
        const userDataPromise = deleteUserData(userId);
        
        // Delete the user account from Authentication
        const authUserPromise = auth.deleteUser(userId)
          .catch(error => {
            console.error(`Error deleting auth user ${userId}:`, error);
            // Continue with other deletions even if one fails
          });
        
        deletePromises.push(userDataPromise, authUserPromise);
      });
      
      await Promise.all(deletePromises);
      console.log('Inactive guest account cleanup completed successfully.');
      
      return null;
    } catch (error) {
      console.error('Error in cleanupInactiveGuestUsers function:', error);
      return null;
    }
  });

/**
 * Helper function to delete all data associated with a user
 * @param {string} userId - The ID of the user to delete data for
 */
async function deleteUserData(userId) {
  try {
    const batch = db.batch();
    
    // Delete user document
    batch.delete(db.collection('users').doc(userId));
    
    // Delete all lists created by the user
    const userLists = await db.collection('lists')
      .where('userId', '==', userId)
      .get();
    
    userLists.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete all packs created by the user
    const userPacks = await db.collection('packs')
      .where('userId', '==', userId)
      .get();
    
    userPacks.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete all items created by the user
    const userItems = await db.collection('items')
      .where('userId', '==', userId)
      .get();
    
    userItems.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Execute the batch delete
    await batch.commit();
    console.log(`Successfully deleted all data for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting data for user ${userId}:`, error);
    throw error;
  }
} 