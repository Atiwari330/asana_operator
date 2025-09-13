# Asana Operator - Features Guide

## Overview
Asana Operator is an AI-powered system that converts natural language into Asana tasks. Simply speak or type what you need, and it automatically creates tasks in the right project with the right assignee.

## Core Features

### 1. Natural Language Task Creation
Convert spoken or typed instructions directly into Asana tasks without manual entry.

**Example Phrases:**
- "Create a task to follow up with Sarah about the marketing campaign"
- "Add a task for Gabriel to send the proposal to True North"
- "Remind me to review the Q4 budget next Friday"
- "Schedule a demo with Mindcare Solutions for Tuesday"

### 2. Smart Project Matching
Automatically identifies which Asana project the task belongs to based on keywords and context.

**Configured Projects:**
- **Sales Prospects**: True North, NeuPath Mind Wellness, Relationships Australia, Shiloh Treatment Center, etc.
- **Personal Boards**: Adi Rev Ops (your personal board)
- **Department Boards**: Onboarding Leadership (Janelle's team)

**Example Phrases:**
- "Create a task for True North demo follow-up" → Goes to [PROSPECT] True North
- "Add to my rev ops board to call the vendor" → Goes to Adi Rev Ops
- "Task for onboarding team to review implementation timeline" → Goes to Onboarding Leadership

### 3. Intelligent Assignee Resolution
Automatically assigns tasks to the right person based on context and keywords.

**Smart Routing:**
- Sales/Demo tasks → Gabriel (Deal Assistant)
- Onboarding tasks → Janelle (Onboarding Director)
- Support issues → Rodrigo (Support Head)
- Engineering/bugs → Hector (Engineering Head)
- Marketing → Shawn (Marketing Head)
- Rev Ops → Adi (You)

**Example Phrases:**
- "Create a bug report about the login issue" → Assigns to Hector
- "Schedule demo follow-up" → Assigns to Gabriel
- "Task about customer onboarding delay" → Assigns to Janelle

### 4. Meeting Transcript Processing
Upload PDF meeting transcripts to automatically extract action items and create tasks.

**What it extracts:**
- Action items with assignees
- Meeting metadata (date, attendees, duration)
- Deal intelligence (sentiment, confidence score, objections)
- Key discussion points
- Next best actions

**Example Usage:**
- Upload a Grain/Zoom transcript PDF
- System creates all follow-up tasks automatically
- Each task includes context from the meeting

### 5. Voice Dictation Support
Optimized for voice input with fuzzy matching for common speech patterns.

**Your Personal Board Triggers:**
- "Add to my board..."
- "Create a task for me..."
- "Adi rev ops..."
- "My rev ops task..."
- "Personal task to..."

### 6. Duplicate Prevention (Idempotency)
Prevents creating duplicate tasks within a 10-minute window.

**How it works:**
- Checks for identical tasks created recently
- Blocks duplicates if you accidentally submit twice
- Protects against system retries

### 7. Rich Context Support
Each project can have custom context that the AI uses when creating tasks.

**Current Context Types:**
- Company information
- Sales stage and pain points
- Department responsibilities
- Key stakeholders
- Common task patterns

### 8. Flexible Task Details
Extracts and applies various task attributes from natural language.

**Supported Attributes:**
- Task title (clear and actionable)
- Detailed description
- Priority (high/medium/low)
- Due dates
- Tags
- All tasks go to "General" section

**Example Phrases:**
- "High priority task to fix the billing issue by Friday"
- "Create a follow-up task for next week to review the proposal"
- "Low priority task to update the documentation"

## API Endpoints

### `/api/ingest` - Standard Mode
Basic task creation with simple project/assignee matching.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Create a task in Marketing for Shawn"}'
```

### `/api/ingest-opus` - Enhanced Mode
Advanced task creation with Opus configuration and rich context.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/ingest-opus \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Follow up with True North about their EHR requirements"}'
```

## Common Use Cases

### Sales Workflow
- "Schedule a demo with [Prospect Name] next Tuesday"
- "Follow up on the proposal for [Company]"
- "Send contract to [Client] for review"
- "Research [Company Name] before the discovery call"

### Personal Task Management
- "Add to my board to review vendor contracts"
- "My task to update the sales pipeline"
- "Remind me to check the budget report"
- "Personal task to call the RCM partner"

### Team Coordination
- "Task for Janelle about the implementation delay"
- "Ask Gabriel to update HubSpot for True North"
- "Engineering task to fix the API timeout"
- "Support ticket about password reset issue"

### Meeting Follow-ups
- "Create follow-up tasks from the True North meeting"
- "Action items from today's demo"
- "Next steps after the discovery call"

## Pro Tips

1. **Be specific with names**: Use full company names for better matching
2. **Include context**: More details help the AI create better task descriptions
3. **Use natural language**: No need for special syntax or formatting
4. **Voice-friendly**: System handles various pronunciations and speech patterns
5. **Batch operations**: Can create multiple related tasks from one transcript

## Testing the System

Test files are available for verification:
- `test-adi-revops.js` - Test your personal board
- `test-onboarding-leadership.js` - Test Janelle's board
- `test-general-section.js` - Test section routing

Run tests with:
```bash
node test-[feature-name].js
```

## Current Limitations

- All tasks go to "General" section (simplified from previous multi-section routing)
- 10-minute duplicate prevention window
- Requires exact project configuration in `opus-config.json`
- PDF transcript processing requires specific format

## Configuration

Projects and routing rules are configured in:
- `opus-config.json` - Project definitions and matching rules
- Environment variables - API keys and authentication tokens