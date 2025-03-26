# PackMind

A mobile app to help you organize and remember what to pack for different trips and activities.

## Features

- Create packing lists for different activities and trips
- Save templates for quick list creation
- Collaborative lists with friends and family
- Weather-based recommendations
- Guest login option with automatic data cleanup

## Technology Stack

- React Native
- Expo
- Firebase (Authentication, Firestore, Storage, Cloud Functions)
- React Navigation

## Guest User System

PackMind includes a guest login feature that allows users to try the app without creating an account:

- Guest accounts are created anonymously through Firebase Authentication
- Guest user data is stored in Firestore with appropriate tags
- Activity tracking system monitors guest user engagement
- Cloud Function automatically cleans up inactive guest accounts after 3 days
- Guest users can convert to permanent accounts if they want to preserve their data