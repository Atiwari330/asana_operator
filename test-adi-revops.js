// Test script for Adi's Rev Ops personal board
// Run with: INGEST_BEARER_TOKEN=sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t node test-adi-revops.js

const testRequests = [
  {
    name: "Direct Rev Ops Request",
    text: "Create a RevOps task to follow up with vendor A about the contract renewal"
  },
  {
    name: "Personal Task for Me",
    text: "Create RevOps task for me to review the Q4 budget projections"
  },
  {
    name: "Spelling Out Name",
    text: "Create RevOps task for A-D-I to send that email to the Mindcare Solutions customer"
  },
  {
    name: "My Board Reference",
    text: "Add a task to my Rev Ops board to analyze the sales pipeline"
  },
  {
    name: "Adi's Board Reference",
    text: "Create a task on Adi's board to schedule meeting with finance team"
  },
  {
    name: "Operations Task",
    text: "Create an operations task to update the vendor contact list"
  },
  {
    name: "Personal List",
    text: "Add to my list to call the AWS account manager about pricing"
  },
  {
    name: "For Me Variation",
    text: "Create a task for me to prepare the board presentation slides"
  }
];

async function testAdiRevOps() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = process.env.INGEST_BEARER_TOKEN || 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';
  
  console.log('🎯 Testing Adi\'s Rev Ops Board Integration\n');
  console.log('==========================================\n');
  console.log('Project: Adi Rev Ops');
  console.log('Asana ID: 1211317165447198');
  console.log('Default Assignee: adi@opus.com');
  console.log('Section: General\n');
  console.log('==========================================\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const test of testRequests) {
    console.log(`\n📝 Test ${testRequests.indexOf(test) + 1}: ${test.name}`);
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
        successCount++;
        console.log(`   ✅ Success!`);
        console.log(`   - Task: ${data.title}`);
        console.log(`   - Project: ${data.project_name}`);
        console.log(`   - Assignee: ${data.assignee_name || 'adi'}`);
        console.log(`   - URL: ${data.task_url}`);
      } else {
        failCount++;
        console.log(`   ❌ Failed: ${data.error}`);
        if (data.details) {
          console.log(`   - Reason: ${data.details.reasoning || 'Unknown'}`);
        }
      }
    } catch (error) {
      failCount++;
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n==========================================');
  console.log(`📊 Results: ${successCount} succeeded, ${failCount} failed`);
  console.log('\n✨ All successful tasks will be in the "General" section');
  console.log('🔗 View your board: https://app.asana.com/0/1211317165447198/list');
  
  if (failCount > 0) {
    console.log('\n⚠️  Some tests failed. The AI might need more context.');
    console.log('   Try being more specific or check the matching keywords.');
  }
}

// Run the test
if (typeof window === 'undefined') {
  console.log('⚠️  Make sure the dev server is running: npm run dev\n');
  testAdiRevOps().catch(console.error);
} else {
  console.log('This script should be run with Node.js');
}