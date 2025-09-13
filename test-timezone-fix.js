// Test timezone conversion fix
// Run with: node test-timezone-fix.js

async function testTimezoneConversion() {
  const API_URL = 'http://localhost:3001/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing Timezone Conversion Fix\n');
  console.log('=' .repeat(60));
  console.log('📍 This test verifies that times are correctly converted from Eastern to UTC\n');

  const tests = [
    {
      name: "Morning time (10 AM)",
      text: "Create task for Gabriel in Family Houston project to call vendor Monday at 10:00 AM",
      expectedLocal: "10:00 AM",
      expectedUTC: "14:00 UTC (2:00 PM)",
      description: "Should convert 10 AM EDT to 14:00 UTC"
    },
    {
      name: "Afternoon time (3 PM)",
      text: "Task for Gabriel in Family Houston project: Meeting on Tuesday at 3:00 PM",
      expectedLocal: "3:00 PM",
      expectedUTC: "19:00 UTC (7:00 PM)",
      description: "Should convert 3 PM EDT to 19:00 UTC"
    },
    {
      name: "Early morning (8 AM)",
      text: "Gabriel needs to send Family Houston update by Wednesday at 8:00 AM",
      expectedLocal: "8:00 AM",
      expectedUTC: "12:00 UTC (12:00 PM)",
      description: "Should convert 8 AM EDT to 12:00 UTC"
    }
  ];

  for (const test of tests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: "${test.text}"`);
    console.log(`   Expected Local: ${test.expectedLocal}`);
    console.log(`   Expected UTC: ${test.expectedUTC}`);
    console.log(`   ${test.description}`);

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
        console.log(`      Task URL: ${data.task_url}`);
        console.log(`      Check server logs for timezone conversion details`);
      } else if (data.error?.includes('recently created')) {
        console.log(`   ⚠️  Skipped (idempotency check) - task was recently created`);
      } else {
        console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }

    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 IMPORTANT: Check your server logs to verify:');
  console.log('   1. AI extracts local time (no Z suffix): e.g., "2025-09-15T10:00:00"');
  console.log('   2. Timezone conversion shows: "Local Eastern: 2025-09-15T10:00:00"');
  console.log('   3. UTC result shows: "UTC Result: 2025-09-15T14:00:00.000Z"');
  console.log('   4. Offset shows: "+4 hours" (for EDT)');
  console.log('\n📋 Then check Asana to verify tasks show correct local times!');
  console.log('   - 10:00 AM tasks should show as 10:00 AM (not 6:00 AM)');
  console.log('   - 3:00 PM tasks should show as 3:00 PM (not 11:00 AM)');
}

// Run the test
testTimezoneConversion().catch(console.error);