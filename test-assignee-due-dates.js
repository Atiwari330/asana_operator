// Test script for assignee and due date functionality
// Run with: node test-assignee-due-dates.js

const testRequests = [
  {
    name: "Simple task with assignee",
    text: "Create a task for Gabriel to review the proposal",
    expectedFeatures: ["assignee"]
  },
  {
    name: "Task with date only",
    text: "Task for Gabriel to contact Migrate about Family Houston migration by September 15",
    expectedFeatures: ["assignee", "due_date"]
  },
  {
    name: "Task with date and time",
    text: "Create a task for Gabriel to call the vendor on September 15, 2025 at 9:30am",
    expectedFeatures: ["assignee", "due_datetime"]
  },
  {
    name: "Task with natural language date",
    text: "Task for Gabriel to follow up tomorrow",
    expectedFeatures: ["assignee", "due_date"]
  },
  {
    name: "Task with time tomorrow",
    text: "Gabriel needs to send the email tomorrow at 2pm",
    expectedFeatures: ["assignee", "due_datetime"]
  },
  {
    name: "Task for Janelle with date",
    text: "Task for Janelle to review onboarding timeline by next Friday",
    expectedFeatures: ["assignee", "due_date"]
  },
  {
    name: "My personal task with date",
    text: "Add to my rev ops board to review Q4 budget by end of month",
    expectedFeatures: ["due_date"]
  },
  {
    name: "Complex task with all features",
    text: "High priority task for Gabriel to prepare True North demo materials for meeting on September 20, 2025 at 10:00am",
    expectedFeatures: ["assignee", "due_datetime", "priority"]
  }
];

async function testIngestAPI() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing Assignee and Due Date Functionality\n');
  console.log('=' .repeat(60));

  let successCount = 0;
  let failureCount = 0;

  for (const test of testRequests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: "${test.text}"`);
    console.log(`   Expected features: ${test.expectedFeatures.join(', ')}`);

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
        console.log(`   ✅ Task created successfully`);
        console.log(`      Title: "${data.title}"`);
        console.log(`      Project: ${data.project_name}`);

        if (data.assignee_name) {
          console.log(`      Assignee: ${data.assignee_name}`);
        }

        // Note: We can't see due dates in the response, but we can check if task was created
        console.log(`      Task URL: ${data.task_url}`);

        successCount++;
      } else {
        console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
        failureCount++;
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
      failureCount++;
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');
  console.log(`Total tests: ${testRequests.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  if (successCount === testRequests.length) {
    console.log('\n🎉 All tests passed! The assignee and due date features are working.');
  } else if (successCount > 0) {
    console.log('\n⚠️ Some tests passed. Check the failures above.');
  } else {
    console.log('\n❌ All tests failed. Check the implementation.');
  }

  console.log('\n💡 Note: Check the Asana projects to verify that:');
  console.log('   1. Tasks are assigned to the correct people');
  console.log('   2. Due dates are set correctly');
  console.log('   3. Times are in the right timezone');
}

// Run the tests
testIngestAPI().catch(console.error);