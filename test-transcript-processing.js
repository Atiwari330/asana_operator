// Test script for transcript processing
// Run with: node test-transcript-processing.js

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Create a sample PDF-like test (you'll need a real PDF for production testing)
const createSampleTranscript = () => {
  const sampleText = `
Meeting: Discovery Call with True North Behavioral Health
Date: January 15, 2025
Duration: 45 minutes
Attendees: Adi (Opus), Gabriel (Opus), Sarah Johnson (True North), Mike Chen (True North)

[00:00] Adi: Good morning everyone, thank you for joining today's discovery call. I'm excited to learn more about True North's needs.

[02:15] Sarah: Thanks for having us. We're really interested in streamlining our patient intake process. Currently, it takes our staff about 30 minutes per patient.

[05:30] Mike: Yes, and we're seeing about 50 new patients per week, so this is a significant time investment.

[08:45] Gabriel: That's definitely something our platform can help with. We've seen other clinics reduce intake time by 60%.

[12:00] Sarah: That sounds promising. Can you show us a demo of the intake workflow?

[15:20] Adi: Absolutely. Gabriel, could you schedule a demo for next Tuesday at 2 PM?

[15:45] Gabriel: I'll send over a calendar invite right after this call.

[20:30] Mike: What about pricing? We have a budget of around $5,000 per month for software solutions.

[22:15] Adi: I'll prepare a detailed proposal with our enterprise pricing. Gabriel will send that along with the demo invite.

[28:00] Sarah: Also, we need to ensure HIPAA compliance. Can you provide documentation?

[30:00] Gabriel: Yes, I'll include our HIPAA compliance certificate and security documentation in the follow-up email.

[35:00] Mike: We're also evaluating SimplePractice and TherapyNotes. How do you compare?

[37:30] Adi: Great question. I'll include a competitive comparison in the proposal highlighting our unique features.

[42:00] Sarah: This has been very helpful. We need to make a decision by the end of the month.

[44:00] Adi: Perfect. Let's plan to have the demo on Tuesday, and I'll have the proposal ready by Thursday. Any other questions?

[45:00] Sarah: No, I think we're good. Looking forward to the demo!

Action Items:
1. Gabriel to schedule demo for Tuesday at 2 PM
2. Gabriel to send calendar invite today
3. Adi to prepare pricing proposal by Thursday
4. Gabriel to send HIPAA compliance documentation
5. Adi to include competitive comparison in proposal
6. Follow up after demo to address any questions
`;

  // Note: This is just text - you'll need a real PDF for actual testing
  // For testing, you could save this as a .txt file and manually convert to PDF
  return Buffer.from(sampleText);
};

async function testTranscriptProcessing() {
  const API_URL = 'http://localhost:3000/api/process-transcript';
  const BEARER_TOKEN = process.env.INGEST_BEARER_TOKEN || 'test-token-123';
  
  console.log('🚀 Testing Transcript Processing');
  console.log('================================\n');
  console.log('Note: This test requires a real PDF file.');
  console.log('Note: Make sure the dev server is running (npm run dev)\n');

  // Check if we have a test PDF file
  const testPdfPath = path.join(__dirname, 'test-transcript.pdf');
  
  if (!fs.existsSync(testPdfPath)) {
    console.log('⚠️  No test PDF found at:', testPdfPath);
    console.log('\nTo test, please:');
    console.log('1. Create or download a sample meeting transcript PDF');
    console.log('2. Save it as "test-transcript.pdf" in the project root');
    console.log('3. Run this test again\n');
    
    console.log('Creating a sample text file you can convert to PDF...');
    fs.writeFileSync(
      path.join(__dirname, 'test-transcript.txt'),
      createSampleTranscript().toString()
    );
    console.log('✅ Created test-transcript.txt - convert this to PDF for testing');
    return;
  }

  try {
    const form = new FormData();
    
    // Add the PDF file
    form.append('pdf', fs.createReadStream(testPdfPath), {
      filename: 'test-transcript.pdf',
      contentType: 'application/pdf',
    });
    
    // Add project ID (True North)
    form.append('projectId', '1211174798540700');
    
    // Add optional Grain link
    form.append('grainLink', 'https://grain.com/share/recording/example-123');

    console.log('📤 Sending request to process transcript...\n');

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Success! Transcript processed\n');
      console.log('📋 Results:');
      console.log('   Parent Task URL:', result.parentTaskUrl);
      console.log('   Project:', result.projectName);
      console.log('   Subtasks created:', result.subtaskIds?.length || 0);
      console.log('   Intelligence task:', result.intelligenceTaskId ? '✓' : '✗');
      console.log('   Processing time:', `${(result.processingTime / 1000).toFixed(1)} seconds`);
      
      if (result.errors?.length > 0) {
        console.log('\n⚠️  Some issues occurred:');
        result.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
    } else {
      console.log('❌ Failed:', result.error);
      if (result.details) {
        console.log('   Details:', JSON.stringify(result.details, null, 2));
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the test
testTranscriptProcessing().catch(console.error);