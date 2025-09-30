// Simple AI service test script
// Run with: node test-ai.js

import { aiService } from './src/services/aiService.js';

console.log('🚀 Testing AI Service...');

async function testAI() {
  try {
    // Test initialization
    console.log('Is AI initialized?', aiService.isInitialized());
    
    // Test connection
    await aiService.testConnection();
    
    // Test comment enhancement
    const testComment = "student was disrupting class and not listening";
    console.log('Testing comment enhancement...');
    console.log('Original:', testComment);
    
    const enhanced = await aiService.enhanceComment(testComment, {
      studentName: 'Test Student',
      timeSlot: 'Morning Block',
      behaviorType: 'classroom_behavior'
    });
    
    console.log('Enhanced:', enhanced);
    console.log('Length:', enhanced.length, 'characters');
    
    if (enhanced.length > 200) {
      console.warn('⚠️ Response too long! Should be under 200 characters');
    } else {
      console.log('✅ Response length is within limit');
    }
    
  } catch (error) {
    console.error('❌ AI test failed:', error);
  }
}

testAI();
