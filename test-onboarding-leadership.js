// Test script for Onboarding Leadership board
// Run with: INGEST_BEARER_TOKEN=sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t node test-onboarding-leadership.js

const testRequests = [
  {
    name: "Direct Onboarding Task",
    text: "Create onboarding task for Janelle to review the implementation timeline for True North"
  },
  {
    name: "Janelle Hall by Full Name",
    text: "Create task for Janelle Hall to update the onboarding documentation"
  },
  {
    name: "Onboarding Leadership Reference",
    text: "Add task to onboarding leadership about customer training schedule"
  },
  {
    name: "Implementation Team Task",
    text: "Create implementation team task to coordinate with sales on new customer handoff"
  },
  {
    name: "Customer Onboarding Task",
    text: "Add customer onboarding task to resolve Practice Suite integration issues"
  },
  {
    name: "Training Task",
    text: "Create training task for Janelle to develop new customer workshop materials"
  },
  {
    name: "Leadership Oversight",
    text: "Create onboarding leadership task to review team performance metrics"
  },
  {
    name: "Process Optimization",
    text: "Add task to onboarding team to optimize the implementation checklist"
  }
];

async function testOnboardingLeadership() {
  const API_URL = 'http://localhost:3000/api/ingest-opus';
  const TOKEN = process.env.INGEST_BEARER_TOKEN || 'sk-asana-op-7f3d4b2a9c1e5h8m2x4v7w9q3n6p8r5t';
  
  console.log('🚀 Testing Onboarding Leadership Board Integration\n');
  console.log('=================================================\n');
  console.log('Project: Onboarding Leadership');
  console.log('Asana ID: 1211116494194833');
  console.log('Default Assignee: janelle@opus.com');
  console.log('Section: General');
  console.log('Key Stakeholders: Janelle Hall (Director), Adi (Executive Sponsor)\n');
  console.log('=================================================\n');
  
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
        console.log(`   - Assignee: ${data.assignee_name || 'janelle'}`);
        if (data.task_url && !data.task_url.includes('demo')) {
          console.log(`   - URL: ${data.task_url}`);
        }
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
  
  console.log('\n=================================================');
  console.log(`📊 Results: ${successCount} succeeded, ${failCount} failed`);
  console.log('\n✨ All successful tasks will be in the "General" section');
  console.log('🔗 View the board: https://app.asana.com/0/1211116494194833/list');
  
  if (failCount > 0) {
    console.log('\n⚠️  Some tests failed. Check if:');
    console.log('   - The dev server is running (npm run dev)');
    console.log('   - The "General" section exists in the project');
  }
}

// Run the test
if (typeof window === 'undefined') {
  console.log('⚠️  Make sure the dev server is running: npm run dev\n');
  testOnboardingLeadership().catch(console.error);
} else {
  console.log('This script should be run with Node.js');
}