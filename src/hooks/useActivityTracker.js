import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

/**
 * Custom hook to track user activity when a screen is in focus
 * This helps maintain guest user accounts that are actively being used
 * and prevents them from being deleted after 3 days of inactivity
 */
export const useActivityTracker = () => {
  const { user, trackUserActivity } = useAuth();
  
  // Update activity timestamp when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && user.isAnonymous) {
        console.log('Tracking activity for guest user:', user.uid);
        trackUserActivity();
      }
      
      return () => {
        // No cleanup needed
      };
    }, [user, trackUserActivity])
  );
  
  // Also track on initial mount
  useEffect(() => {
    if (user && user.isAnonymous) {
      console.log('Tracking initial activity for guest user:', user.uid);
      trackUserActivity();
    }
  }, [user, trackUserActivity]);
}; 