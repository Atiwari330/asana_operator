// Quick test to verify simple tasks stay simple
// Run with: node test-simple-task.js

const simpleTests = [
  "Email Karl from True North",
  "Call Shiloh Treatment Center back",
  "Follow up with Janelle about onboarding",
  "Add to my rev ops board to call vendor",
  "Send proposal to NeuPath",
];

async function testSimpleTasks() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';

  console.log('🧪 Testing Simple Task Handling\n');
  console.log('=' .repeat(50));

  for (const text of simpleTests) {
    console.log(`\n📝 Input: "${text}"`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (data.ok) {
        console.log(`✅ Task: "${data.title}"`);
        console.log(`   Project: ${data.project_name}`);
        console.log(`   Title length: ${data.title.length} chars (${data.title.length > 40 ? '⚠️ Complex' : '✓ Simple'})`);
      } else {
        console.log(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Test complete - check if titles are appropriately simple above');
}

testSimpleTasks().catch(console.error);