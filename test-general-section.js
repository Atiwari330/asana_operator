// Test script to verify General section functionality
// Run with: node test-general-section.js

const testRequests = [
  {
    name: "Rev Ops Task Test",
    text: "Create a Rev Ops task to send an email to Johnny Smith about the Q4 budget review"
  },
  {
    name: "Simple Task Test", 
    text: "Create a task to follow up with the marketing team about the campaign"
  },
  {
    name: "Meeting Task Test",
    text: "Schedule a demo with Mindcare Solutions next Tuesday"
  }
];

async function testIngestAPI() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = process.env.INGEST_BEARER_TOKEN || 'test-token-123';
  
  console.log('🧪 Testing General Section Implementation\n');
  console.log('=========================================\n');
  
  for (const test of testRequests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: "${test.text}"`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({ text: test.text })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log(`   ✅ Success!`);
        console.log(`   - Task: ${data.title}`);
        console.log(`   - Project: ${data.project_name}`);
        console.log(`   - Section: General (automatic)`);
        console.log(`   - URL: ${data.task_url}`);
      } else {
        console.log(`   ❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n=========================================');
  console.log('✅ All tasks should now be in "General" sections');
  console.log('\nNOTE: Make sure you have:');
  console.log('1. Created "General" sections in your Asana projects');
  console.log('2. Updated opus-config.json with your project IDs');
  console.log('3. Set up your environment variables');
}

// Check if running in Node.js
if (typeof window === 'undefined') {
  console.log('⚠️  Make sure the dev server is running: npm run dev\n');
  testIngestAPI().catch(console.error);
} else {
  console.log('This script should be run with Node.js');
}