// Quick test for the specific "by 10 a.m." issue
// Run with: node test-specific-due-time.js

async function testSpecificCase() {
  const API_URL = 'http://localhost:3001/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing Specific Due Time Case\n');
  console.log('=' .repeat(60));

  const testText = "Create a task for Gabriel inside of the Family Houston Prospect Asana project. On Monday by 10 a.m. is the due date for this. He has to reach out to Francis of MigrateAll and he can call them, he can text them, he can do whatever he wants but he needs to get Francis to begin scoping the data migration for Family Houston ASAP. And he needs to get the user login information from Ala and provide it to Francis so that Francis can do the work. Please create a task.";

  console.log('📝 Testing the exact user request that was failing:');
  console.log(`   "...On Monday by 10 a.m. is the due date..."\n`);

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
      console.log(`   Assignee: ${data.assignee_name || 'Not specified'}`);
      console.log(`   Task URL: ${data.task_url}`);
      console.log('\n🎉 The fix is working! Check the server logs to confirm:');
      console.log('   - due_datetime should be set (not due_date)');
      console.log('   - The time should be 10:00 AM on Monday');
      console.log('\n📋 Then check the task in Asana to verify the time is set correctly.');
    } else if (data.error?.includes('recently created')) {
      console.log('⚠️  Task was recently created (idempotency check)');
      console.log('   This means the task creation worked previously!');
      console.log('   Check Asana to verify the time is set correctly.');
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

// Run the test
testSpecificCase().catch(console.error);