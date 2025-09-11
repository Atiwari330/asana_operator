// Test script for section-based task routing
// Run with: node test-section-routing.js

const testCases = [
  {
    text: "Schedule demo for True North next Tuesday",
    expected: {
      project: "[PROSPECT] True North",
      section: "🎬 Demo/Presentation",
      assignee: "gabriel@opus.com"
    }
  },
  {
    text: "Send proposal to Family Houston with pricing options",
    expected: {
      project: "[PROSPECT] Family Houston", 
      section: "📝 Proposal",
      assignee: "gabriel@opus.com"
    }
  },
  {
    text: "Follow up with Shiloh about integration questions",
    expected: {
      project: "[PROSPECT] Shiloh Treatment Center",
      section: "⏰ Follow-up",
      assignee: "gabriel@opus.com"
    }
  },
  {
    text: "Initial outreach to NeuPath Mind Wellness",
    expected: {
      project: "[PROSPECT] NeuPath Mind Wellness",
      section: "📞 Initial Outreach",
      assignee: "gabriel@opus.com"
    }
  },
  {
    text: "Discovery call notes for We Fix Brains",
    expected: {
      project: "[PROSPECT] We Fix Brains",
      section: "🔍 Discovery",
      assignee: "gabriel@opus.com"
    }
  }
];

async function testIngestAPI(testCase) {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const BEARER_TOKEN = process.env.INGEST_BEARER_TOKEN || 'test-token-123';

  console.log('\n📝 Testing:', testCase.text);
  console.log('   Expected project:', testCase.expected.project);
  console.log('   Expected section:', testCase.expected.section);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      body: JSON.stringify({ text: testCase.text })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('   ✅ Success!');
      console.log('   Task created:', result.title);
      console.log('   Project:', result.project_name);
      console.log('   Assignee:', result.assignee_name);
      console.log('   URL:', result.task_url);
    } else {
      console.log('   ❌ Failed:', result.error);
      if (result.details) {
        console.log('   Details:', JSON.stringify(result.details, null, 2));
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Section Routing Tests');
  console.log('================================\n');
  console.log('Note: Make sure the dev server is running (npm run dev)');
  console.log('Note: Set INGEST_BEARER_TOKEN in environment or update the script\n');

  for (const testCase of testCases) {
    await testIngestAPI(testCase);
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✨ Tests complete!');
}

// Run the tests
runTests().catch(console.error);