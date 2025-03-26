# PackMind - Firebase Cloud Functions

This directory contains Cloud Functions for the PackMind application.

## What's Included

### Guest User Cleanup
A scheduled function that runs daily to clean up inactive guest accounts. It deletes guest user data if they haven't been active for more than 3 days.

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project set up and initialized
3. Node.js 18 or higher

## Development

### Local Testing

To test functions locally:

```bash
cd functions
npm install
npm run serve
```

This will start the Firebase emulator suite.

### Deploying Functions

To deploy the functions to your Firebase project:

```bash
cd functions
npm run deploy
```

Or from the project root:

```bash
firebase deploy --only functions
```

## Function Details

### cleanupInactiveGuestUsers

This function runs on a schedule (daily at midnight) and:

1. Queries for guest users who haven't been active for more than 3 days
2. Deletes all their data from Firestore (users, lists, packs, items)
3. Deletes their authentication record

This helps keep the database clean by removing unused guest accounts while allowing active guests to continue using the app.

## Integration with App

The app tracks guest user activity through:

1. The `userActivityTracker.js` utility that updates a timestamp in Firestore
2. The `useActivityTracker.js` hook that's used in main screens
3. The `AuthContext.js` that handles guest login and activity tracking

As long as guest users open the app at least once every 3 days, their data will be preserved. 