// Simple behavior summary test without path aliases
import OpenAI from 'openai';

console.log('🧪 Testing Behavior Summary Generation...');

// Load environment variables
const apiKey = process.env.VITE_OPENAI_API_KEY;
console.log('API Key:', apiKey ? `✅ Found (${apiKey.slice(0, 10)}...)` : '❌ Not found');

if (!apiKey) {
  console.error('❌ No OpenAI API key found. Make sure VITE_OPENAI_API_KEY is set in .env.local');
  process.exit(1);
}

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

// Test data
const testComments = [
  {
    content: "Student was very attentive during math lesson and completed all problems correctly",
    type: "positive",
    source: "Daily Evaluation",
    date: "2024-01-10",
    rating: 4
  },
  {
    content: "Had difficulty following directions during group work",
    type: "concern",
    source: "Daily Evaluation", 
    date: "2024-01-10",
    rating: 2
  },
  {
    content: "Threw pencil when frustrated with assignment",
    type: "incident",
    source: "Incident Report",
    date: "2024-01-11",
    rating: 1
  }
];

const dateRange = { startDate: '2024-01-10', endDate: '2024-01-11' };
const options = {
  studentId: 'test-student',
  studentName: 'Test Student',
  gradeLevel: '3rd Grade'
};

async function testBehaviorSummary() {
  try {
    console.log('🔍 Testing behavior summary generation...');
    
    const systemPrompt = `You are a professional behavior analyst creating comprehensive student behavior summaries for educational documentation.

Your task: Analyze behavioral data and create a structured JSON response with specific clinical insights.

Response Format (JSON only):
{
  "general_overview": "3-4 sentence overview of overall behavior patterns",
  "strengths": "2-3 sentence summary of positive behavioral observations", 
  "improvements": "2-3 sentence summary of areas needing improvement",
  "incidents": "1-2 sentence summary of behavioral incidents (if any)",
  "recommendations": "2-3 sentence summary of recommended interventions"
}

Guidelines:
- Use professional behavioral terminology
- Be objective and clinical
- Focus on observable behaviors
- Provide actionable insights
- Keep each field concise but comprehensive`;

    const userPrompt = `Analyze behavioral data for ${options.studentName} (${options.gradeLevel}) from ${dateRange.startDate} to ${dateRange.endDate}:

BEHAVIORAL OBSERVATIONS (${testComments.length} total):
${testComments.map((comment, index) => 
  `${index + 1}. ${comment.source} (${comment.date}) - Rating: ${comment.rating}/4
     "${comment.content}"`
).join('\n\n')}

Create a comprehensive behavioral analysis in the required JSON format.`;

    console.log('📝 Sending request to OpenAI...');
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1200,
      top_p: 0.8,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    const response = completion.choices[0].message.content;
    console.log('📋 Raw AI Response:');
    console.log(response);
    
    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(response);
      console.log('✅ Successfully parsed JSON:');
      console.log(JSON.stringify(analysis, null, 2));
    } catch (parseError) {
      console.log('⚠️  JSON parse failed, trying to extract...');
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted JSON:');
          console.log(JSON.stringify(analysis, null, 2));
        } catch (e) {
          console.error('❌ Failed to parse extracted JSON:', e.message);
          return;
        }
      } else {
        console.error('❌ No JSON found in response');
        return;
      }
    }
    
    console.log('🎉 Behavior summary generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.status === 401) {
      console.error('   Check your OpenAI API key');
    } else if (error.status === 429) {
      console.error('   Rate limit exceeded');
    }
  }
}

// Load .env.local if in Node.js environment
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n').filter(line => line.includes('='));
      
      envVars.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      });
      
      console.log('📄 Loaded .env.local file');
    }
  } catch (error) {
    console.log('⚠️  Could not load .env.local:', error.message);
  }
}

testBehaviorSummary();
