#!/usr/bin/env node

// Database setup script for Bright Track with Supabase
import { initializeDatabase, initializeSchema } from './src/database/postgres.js';

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Bright Track database...');
    
    // Initialize connection
    console.log('📡 Connecting to Supabase PostgreSQL...');
    await initializeDatabase();
    
    // Create schema
    console.log('🏗️  Creating database schema...');
    await initializeSchema();
    
    console.log('✅ Database setup completed successfully!');
    console.log('🎉 Your Bright Track app is ready to use with Supabase!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();