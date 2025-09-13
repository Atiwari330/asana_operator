// Quick test for the 2 PM timezone fix
// Run with: node test-2pm-fix.js

async function test2PMFix() {
  const API_URL = 'http://localhost:3001/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing 2 PM Timezone Fix\n');
  console.log('=' .repeat(60));

  const testText = "Create a task in the RevOps board for myself to send an email to Ben about faxing the paper records to Bridgestone Recovery. This task should be completed next Tuesday by 2pm.";

  console.log('📝 Testing the exact case that was failing:');
  console.log(`   "...next Tuesday by 2pm"\n`);
  console.log('Expected behavior:');
  console.log('   - AI extracts: 2025-09-16T14:00:00 (2 PM Eastern)');
  console.log('   - Converts to: 2025-09-16T18:00:00.000Z (6 PM UTC)');
  console.log('   - Shows in Asana: 2:00 PM (not 6:00 PM)\n');

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
      console.log('✅ SUCCESS! Task created with:');
      console.log(`   Title: "${data.title}"`);
      console.log(`   Project: ${data.project_name}`);
      console.log(`   Task URL: ${data.task_url}`);
      console.log('\n🎉 The fix is working! Check the server logs to confirm:');
      console.log('   - Local Eastern: 2025-09-16T14:00:00');
      console.log('   - UTC Result: Should be 2025-09-16T18:00:00.000Z (NOT 22:00)');
      console.log('   - Offset: Should show +4 hours');
      console.log('\n📋 Check Asana to verify the task shows 2:00 PM (not 6:00 PM).');
    } else if (data.error?.includes('recently created')) {
      console.log('⚠️  Task was recently created (idempotency check)');
      console.log('   Check Asana to see if the time is now correct (2:00 PM).');
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

// Run the test
test2PMFix().catch(console.error);