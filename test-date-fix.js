// Test script to verify date calculation fix
// Run with: node test-date-fix.js

const testRequests = [
  {
    name: "Next Tuesday test",
    text: "Create a task for Gabriel to review proposal next Tuesday",
    expectedDate: "September 17, 2025" // If today is Friday Sept 13
  },
  {
    name: "Tomorrow test",
    text: "Task for Gabriel to send email tomorrow",
    expectedDate: "September 14, 2025" // If today is Friday Sept 13
  },
  {
    name: "Next Friday test",
    text: "Task to follow up next Friday",
    expectedDate: "September 20, 2025" // If today is Friday Sept 13
  },
  {
    name: "Next week test",
    text: "Review budget next week",
    expectedDate: "September 20, 2025" // Exactly 7 days from Sept 13
  },
  {
    name: "Tuesday next week test",
    text: "Meeting on Tuesday next week",
    expectedDate: "September 24, 2025" // The Tuesday in the following week
  }
];

async function testDateCalculation() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing Date Calculation Fix\n');
  console.log(`Today is: ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}\n`);
  console.log('=' .repeat(60));

  for (const test of testRequests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: "${test.text}"`);
    console.log(`   Expected date: ${test.expectedDate}`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: test.text + " for my rev ops board" // Add context to ensure project matches
        }),
      });

      const data = await response.json();

      if (data.ok) {
        console.log(`   ✅ Task created successfully`);
        console.log(`      Task URL: ${data.task_url}`);
        console.log(`      Check Asana to verify the due date is ${test.expectedDate}`);
      } else {
        console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n💡 Please check the created tasks in Asana to verify:');
  console.log('   1. "Next Tuesday" should be September 17 (not 24)');
  console.log('   2. "Tomorrow" should be September 14');
  console.log('   3. "Next Friday" should be September 20');
  console.log('   4. Dates are calculated correctly based on today being Friday');
}

// Run the test
testDateCalculation().catch(console.error);