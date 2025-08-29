#!/usr/bin/env node

/**
 * Database Setup Script for Bright Track
 * 
 * This script helps you set up your PostgreSQL database connection.
 * Run this after creating your Vercel Postgres database.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Bright Track Database Setup');
console.log('================================');
console.log('');

console.log('📋 Steps to complete:');
console.log('');
console.log('1. Go to your Vercel Dashboard: https://vercel.com/dashboard');
console.log('2. Select your project: bright-track-3233ad6b');
console.log('3. Go to the Storage tab');
console.log('4. Click "Create Database" and select "Postgres"');
console.log('5. Name it: bright-track-db');
console.log('6. Copy the connection strings from the database settings');
console.log('');

console.log('📝 Environment Variables to set:');
console.log('');
console.log('In your Vercel project settings (Environment Variables):');
console.log('- DATABASE_URL = your_postgres_connection_string');
console.log('- POSTGRES_URL = your_postgres_connection_string');
console.log('- NODE_ENV = production');
console.log('');

console.log('🔧 Local Development:');
console.log('');
console.log('Update your .env file with the connection strings:');
console.log('');

// Read current .env file
const envPath = join(__dirname, '.env');
try {
  const currentEnv = readFileSync(envPath, 'utf8');
  console.log('Current .env file:');
  console.log('------------------');
  console.log(currentEnv);
  console.log('------------------');
  console.log('');
  console.log('Replace the DATABASE_URL and POSTGRES_URL with your actual connection strings.');
} catch (error) {
  console.log('No .env file found. Create one with your connection strings.');
}

console.log('');
console.log('🧪 Testing the connection:');
console.log('');
console.log('After setting up the database, run:');
console.log('npm run server');
console.log('');
console.log('You should see:');
console.log('✅ PostgreSQL connection pool initialized successfully');
console.log('✅ PostgreSQL schema initialized successfully');
console.log('🚀 Bright Track server running on http://localhost:3001');
console.log('');

console.log('🌐 Deployment:');
console.log('');
console.log('Your app is deployed at:');
console.log('https://bright-track-3233ad6b-63szaxstq-strongman1380s-projects.vercel.app');
console.log('');
console.log('After setting up the database, redeploy with:');
console.log('vercel --prod');
console.log('');

console.log('✨ Setup complete! Your Bright Track app is ready to use.');