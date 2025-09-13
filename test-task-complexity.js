// Test script to verify intelligent task complexity handling
// Run with: node test-task-complexity.js

const testRequests = [
  {
    name: "Simple Task Test 1",
    text: "Email Karl back",
    expectedComplexity: "simple"
  },
  {
    name: "Simple Task Test 2",
    text: "Call vendor about pricing",
    expectedComplexity: "simple"
  },
  {
    name: "Simple Task Test 3",
    text: "Follow up with True North",
    expectedComplexity: "simple"
  },
  {
    name: "Complex Task Test 1",
    text: "Create a task for Gabriel to go to my email inbox, find the email from Karl where I talked about visiting him in Alaska in early October, and send a generic follow-up email just acknowledging and telling him thank you so much and letting them know we'll be getting back to him very shortly if we're going to be able to swing it. Also in the email include the fact that I talked to Janelle, and looks like the lab integration is going well.",
    expectedComplexity: "complex"
  },
  {
    name: "Complex Task Test 2",
    text: "Task for Janelle to review the onboarding timeline for Mindcare Solutions, specifically looking at the delays from Practice Suite that are causing claim rejections. She should coordinate with Arun about the RCM issues and prepare a report for me by Friday with recommendations on whether we should expedite the RCM partner transition for this client.",
    expectedComplexity: "complex"
  },
  {
    name: "Medium Task Test",
    text: "Schedule a demo with We Fix Brains next week and make sure to cover the neurotherapy documentation features",
    expectedComplexity: "medium"
  }
];

async function testIngestAPI() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing Task Complexity Handling\n');
  console.log('=' .repeat(50));

  let results = [];

  for (const test of testRequests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`Input (${test.text.length} chars): "${test.text.substring(0, 50)}${test.text.length > 50 ? '...' : ''}"`);
    console.log(`Expected: ${test.expectedComplexity} complexity`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: test.text }),
      });

      const data = await response.json();

      if (data.ok) {
        // Success - task was created
        console.log(`✅ Task created: "${data.title}"`);

        // Note: We can't see the full description from the API response,
        // but we can judge based on the title length as a proxy
        const titleComplexity = data.title.length > 50 ? 'complex' : 'simple';
        console.log(`   Title length: ${data.title.length} chars`);
        console.log(`   Project: ${data.project_name}`);
        if (data.assignee_name) {
          console.log(`   Assignee: ${data.assignee_name}`);
        }

        results.push({
          test: test.name,
          success: true,
          titleLength: data.title.length,
          matched: test.expectedComplexity
        });
      } else {
        console.log(`❌ Error: ${data.error || 'Unknown error'}`);
        results.push({
          test: test.name,
          success: false,
          error: data.error
        });
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY\n');

  const successful = results.filter(r => r.success).length;
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${results.length - successful}`);

  console.log('\nTitle Length Analysis:');
  results.filter(r => r.success).forEach(r => {
    const complexity = r.titleLength > 50 ? 'Complex' : 'Simple';
    console.log(`  ${r.test}: ${r.titleLength} chars (${complexity})`);
  });

  if (successful === results.length) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above.');
  }
}

// Run the tests
testIngestAPI().catch(console.error);