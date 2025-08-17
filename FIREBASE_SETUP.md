# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the Bright Track application.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "bright-track-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication Methods

1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Enable the following sign-in providers:

### Email/Password
- Click on "Email/Password"
- Enable "Email/Password"
- Optionally enable "Email link (passwordless sign-in)"
- Click "Save"

### Google
- Click on "Google"
- Enable Google sign-in
- Enter your project's public-facing name
- Choose a support email
- Click "Save"

### Phone
- Click on "Phone"
- Enable phone authentication
- Add your phone number for testing (optional)
- Click "Save"

## 3. Configure Web App

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Enter your app nickname (e.g., "Bright Track Web")
5. Optionally set up Firebase Hosting
6. Click "Register app"

## 4. Get Configuration Keys

After registering your app, you'll see a configuration object like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 5. Update Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

## 6. Configure Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `yourdomain.com`)

## 7. Phone Authentication Setup (Additional Steps)

For phone authentication to work properly:

1. **reCAPTCHA Configuration**:
   - The app uses invisible reCAPTCHA for phone verification
   - Make sure your domain is authorized in Firebase

2. **Test Phone Numbers** (Optional):
   - In Firebase Console, go to **Authentication** > **Sign-in method** > **Phone**
   - Add test phone numbers with verification codes for development

## 8. Security Rules (Optional)

If you plan to use Firestore for user data:

1. Go to **Firestore Database** > **Rules**
2. Set up appropriate security rules for authenticated users

## 9. Testing the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try signing up with:
   - Email and password
   - Google account
   - Phone number

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/unauthorized-domain)"**
   - Add your domain to authorized domains in Firebase Console

2. **"Firebase: Error (auth/api-key-not-valid)"**
   - Check that your API key is correct in the `.env` file

3. **Phone authentication not working**
   - Ensure reCAPTCHA is properly configured
   - Check that your domain is authorized

4. **Google sign-in popup blocked**
   - Make sure popups are allowed in your browser
   - Check that the OAuth redirect URI is configured

### Environment Variables Not Loading:

Make sure your `.env` file is in the root directory and variables start with `VITE_`.

## Security Best Practices

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Use different Firebase projects** for development and production
3. **Set up proper Firestore security rules** if using the database
4. **Enable App Check** for production apps (optional but recommended)

## Next Steps

Once authentication is working:

1. Consider adding user profiles
2. Set up role-based access control if needed
3. Implement password reset functionality
4. Add email verification requirements
5. Set up user data persistence in Firestore

For more detailed information, visit the [Firebase Documentation](https://firebase.google.com/docs/auth).