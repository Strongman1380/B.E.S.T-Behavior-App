#!/usr/bin/env node

/**
 * Firebase Setup Helper Script
 * This script helps you quickly set up Firebase configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupFirebase() {
  console.log('\n🔥 Firebase Authentication Setup Helper\n');
  console.log('This script will help you configure Firebase for your Bright Track app.\n');
  
  console.log('Please have your Firebase project configuration ready.');
  console.log('You can find this in Firebase Console > Project Settings > General > Your apps\n');

  try {
    const apiKey = await question('Enter your Firebase API Key: ');
    const authDomain = await question('Enter your Auth Domain (project-id.firebaseapp.com): ');
    const projectId = await question('Enter your Project ID: ');
    const storageBucket = await question('Enter your Storage Bucket (project-id.appspot.com): ');
    const messagingSenderId = await question('Enter your Messaging Sender ID: ');
    const appId = await question('Enter your App ID: ');

    const envContent = `# Firebase Configuration
VITE_FIREBASE_API_KEY=${apiKey}
VITE_FIREBASE_AUTH_DOMAIN=${authDomain}
VITE_FIREBASE_PROJECT_ID=${projectId}
VITE_FIREBASE_STORAGE_BUCKET=${storageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId}
VITE_FIREBASE_APP_ID=${appId}
`;

    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ Firebase configuration saved to .env file!');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure you have enabled the following sign-in methods in Firebase Console:');
    console.log('   - Email/Password');
    console.log('   - Google');
    console.log('   - Phone');
    console.log('2. Add your domain to authorized domains in Firebase Console');
    console.log('3. Run: npm run dev');
    console.log('\n🚀 Your app should now have Firebase authentication enabled!');

  } catch (error) {
    console.error('\n❌ Error setting up Firebase:', error.message);
  } finally {
    rl.close();
  }
}

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('\n⚠️  .env file already exists.');
  question('Do you want to overwrite it? (y/N): ').then(answer => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupFirebase();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  setupFirebase();
}