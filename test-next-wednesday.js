// Test for "next Wednesday" date calculation
// Run with: node test-next-wednesday.js

async function testNextWednesday() {
  const API_URL = 'http://localhost:3001/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing "Next Wednesday" Date Calculation\n');
  console.log('=' .repeat(60));
  console.log('📅 Today is Friday, September 13, 2025');
  console.log('📍 "next Wednesday" should be Sept 17 (4 days away)');
  console.log('   NOT Sept 24 (11 days away)\n');

  const testText = "Create a task for me in the Rev Ops Board to send an email to Mary Sue about the rubber duckies next Wednesday at 2pm ET.";

  console.log('📝 Testing: "next Wednesday at 2pm"');
  console.log('Expected result:');
  console.log('   - Date: September 17, 2025 (NOT Sept 24)');
  console.log('   - Time: 2:00 PM Eastern');
  console.log('   - In Asana: Shows as Sept 17 at 2:00 PM\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: testText }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Task created successfully!');
      console.log(`   Title: "${data.title}"`);
      console.log(`   Project: ${data.project_name}`);
      console.log(`   Task URL: ${data.task_url}`);
      console.log('\n🎯 IMPORTANT: Check the server logs to verify:');
      console.log('   - AI should extract: 2025-09-17T14:00:00 (Sept 17)');
      console.log('   - NOT: 2025-09-24T14:00:00 (Sept 24)');
      console.log('\n📋 Check Asana to confirm the task is due on Sept 17 (not Sept 24)');
    } else if (data.error?.includes('recently created')) {
      console.log('⚠️  Task was recently created (idempotency check)');
      console.log('   Check Asana to verify the date is Sept 17');
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Also test other "next" patterns
  console.log('\n' + '=' .repeat(60));
  console.log('📝 Additional test cases to verify:');
  console.log('   - "next Monday" should be Sept 16 (3 days away)');
  console.log('   - "next Friday" should be Sept 20 (7 days away)');
  console.log('   - "Wednesday next week" should be Sept 24 (explicit next week)');
}

// Run the test
testNextWednesday().catch(console.error);