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