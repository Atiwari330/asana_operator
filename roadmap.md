# Asana Operator - Product Roadmap

## Executive Summary

Asana Operator is a natural language task management system that converts voice/text commands and meeting transcripts into organized Asana tasks. It's designed for sales teams (specifically Adi at Opus) to streamline task creation from client interactions.

## Current State (As of December 2024)

### ✅ What's Already Built and Working

1. **Core Infrastructure**
   - Next.js 15.5.2 application with TypeScript
   - Two API endpoints: `/api/ingest` (basic) and `/api/ingest-opus` (AI-enhanced)
   - Google Gemini AI integration for natural language processing
   - Drizzle ORM with Supabase/Postgres database
   - Comprehensive logging system for debugging

2. **Working Features**
   - Natural language to Asana task conversion
   - AI-powered project matching (matches text to correct prospect project)
   - Automatic assignee detection (defaults to gabriel@opus.com for prospects)
   - Idempotency checks (prevents duplicate tasks within 10 minutes)
   - 11 real prospect projects configured with proper Asana IDs

3. **Current Limitations**
   - Tasks are created without section assignment (they go to "Untitled" section)
   - No meeting transcript processing
   - No task relationship tracking (parent/child)
   - Basic task metadata only

## User Profile

**Primary User**: Adi (Operations & Sales Leader at Opus)
- Conducts multiple sales calls daily with behavioral health prospects
- Uses Grain for meeting recording
- Needs to track action items from each conversation
- Wants to maintain pipeline visibility in Asana

**Secondary User**: Gabriel (Sales Assistant)
- Receives assigned tasks from Adi's conversations
- Needs context about which meeting generated each task

## Roadmap Phases

---

## 📍 V1: Polish & Section-Based Organization

**Goal**: Make existing features production-ready with proper task organization

### Features to Implement

1. **Section-Based Task Routing**
   - Add section definitions to `opus-config.json`
   - Standard sections for all prospect projects:
     - 📞 Initial Outreach
     - 🔍 Discovery
     - 🎬 Demo/Presentation
     - 📝 Proposal
     - 🤝 Negotiation
     - ⏰ Follow-up
     - 📅 Meeting Notes (for parent tasks in V2)
     - 🧭 Strategy (for intelligence tasks in V3)
     - ✅ Closed Won
     - ❌ Closed Lost

2. **AI Enhancement for Section Detection**
   - Update `opus-client.ts` to analyze task content and determine appropriate section
   - Add section keyword mapping (e.g., "demo" → Demo section, "proposal" → Proposal section)
   - Default to "Follow-up" section if uncertain

3. **Database Updates**
   - Run sync script to populate sections table
   - Ensure section IDs are cached for performance

### Critical Pre-Implementation Step: Section Management

**⚠️ IMPORTANT**: Existing projects don't have our standard sections. We must handle this gracefully.

#### Section Creation Strategy

1. **Initial Setup Script** (`scripts/syncSections.ts`)
   ```typescript
   // For each project in opus-config.json:
   // 1. Fetch existing sections from Asana
   // 2. Compare with standard sections
   // 3. Create missing sections only
   // 4. Store all section IDs in database
   // 5. Log what was created vs. what existed
   ```

2. **Runtime Section Verification**
   ```typescript
   // In task creation flow:
   async function getSectionId(projectId: string, sectionName: string) {
     // 1. Check database cache first
     let sectionId = await db.getSectionId(projectId, sectionName);
     
     if (!sectionId) {
       // 2. Section missing - create it
       sectionId = await asanaClient.createSection(projectId, sectionName);
       
       // 3. Cache for future use
       await db.cacheSection(projectId, sectionName, sectionId);
     }
     
     return sectionId || null; // Fallback to no section if creation fails
   }
   ```

3. **Database Schema for Section Caching**
   ```sql
   -- Already exists in schema.ts, but ensure it's populated:
   sections (
     id: text (Asana section GID)
     project_id: text (references projects.id)
     name: text
     normalized_name: text
     updated_at: timestamp
   )
   ```

4. **Handling Edge Cases**
   - Project has custom sections → Preserve them, add ours
   - Section creation fails → Log error, create task without section
   - Asana API rate limits → Implement exponential backoff
   - Section renamed in Asana → Re-sync detects and updates

### Implementation Steps

1. **Update Configuration** (`opus-config.json`)
   ```json
   "standard_sections": {
     "prospect": [
       {
         "name": "📞 Initial Outreach",
         "keywords": ["intro", "reach out", "contact", "initial"]
       },
       // ... other sections
     ]
   }
   ```

2. **Modify Task Creation Flow**
   - Update `/api/ingest-opus` to include section assignment
   - Pass `sectionId` to `asanaClient.createTask()`
   - Add logging for section selection logic

3. **Test Cases**
   - "Create a demo task for True North" → Goes to Demo section
   - "Follow up with NeuPath about pricing" → Goes to Follow-up section
   - "Send proposal to Shiloh Treatment" → Goes to Proposal section

### Acceptance Criteria
- [ ] Section sync script successfully runs without errors
- [ ] All 11 prospect projects have standard sections created
- [ ] Existing custom sections in projects are preserved
- [ ] Section cache in database is populated correctly
- [ ] Runtime section creation works if section is missing
- [ ] All tasks are created in appropriate sections
- [ ] Section selection is logged and traceable
- [ ] Fallback to no section works if section creation fails
- [ ] No duplicate sections are created on re-run

---

## 📍 V2: Meeting Transcript Processing

**Goal**: Extract and organize action items from sales meeting transcripts

### Features to Implement

1. **New UI Component** (`/app/meeting-processor/page.tsx`)
   - File upload for PDF transcript
   - Text input for Grain recording link
   - Dropdown to select prospect project
   - Submit button to process
   - Progress indicator for processing status

2. **New API Endpoint** (`/api/process-transcript`)
   - Accepts: PDF file, Grain link, project ID
   - Returns: Parent task ID, subtask IDs, status

3. **Parent-Child Task Structure**
   - Parent task: "Meeting: [Client Name] - [Date]"
   - Contains: Grain link, transcript attachment, attendee list, duration
   - Lives in: "📅 Meeting Notes" section
   - Subtasks: Individual action items distributed to appropriate sections

4. **Three Parallel Processing Pipelines**

   **Pipeline A: Parent Task Creation**
   ```typescript
   // Quick creation of parent meeting task
   // Extract: meeting date, attendees, duration
   // Create task in Meeting Notes section
   // Return task ID immediately
   ```

   **Pipeline B: Action Items Extraction**
   ```typescript
   // Focused prompt for action extraction
   // Extract: WHO does WHAT by WHEN
   // Create subtask for each action
   // Route to appropriate section
   // Link to parent task
   ```

   **Pipeline C: Deal Intelligence (Basic)**
   ```typescript
   // Analyze conversation sentiment
   // Create summary task in Strategy section
   // Include: key points, next best action
   ```

### Custom Fields to Add in Asana
- `meeting_date` (Date field)
- `meeting_type` (Dropdown: Discovery/Demo/Negotiation/Follow-up)
- `grain_link` (URL field)
- `attendees` (Text field)

### AI Prompting Strategy

**For Action Item Extraction:**
```
You are analyzing a sales meeting transcript. Extract ONLY concrete action items.

For each action item, identify:
1. WHO is responsible (Gabriel, Adi, or the prospect)
2. WHAT needs to be done (specific task)
3. WHEN it's due (if mentioned)
4. WHICH section it belongs to (Demo, Proposal, Follow-up, etc.)

Format as JSON array:
[{
  "assignee": "gabriel@opus.com",
  "title": "Send pricing proposal",
  "due_date": "2024-01-20",
  "section": "Proposal",
  "context": "Discussed enterprise pricing tier"
}]
```

### Implementation Steps

1. **Create PDF parsing utility** (`lib/utils/pdf-parser.ts`)
   - Use pdf-parse or similar library
   - Extract text content from transcript
   - Handle multi-page documents

2. **Build parallel processing system** (`lib/ai/transcript-processor.ts`)
   - Use Promise.all() for parallel execution
   - Implement error handling for partial failures
   - Add progress tracking

3. **Create UI components**
   - File upload with drag-and-drop
   - Project selector with search
   - Results display with task links

### Acceptance Criteria
- [ ] PDF upload and parsing works reliably
- [ ] Parent task contains all meeting metadata
- [ ] Action items are created as subtasks
- [ ] Each subtask is routed to correct section
- [ ] Grain link is preserved and accessible
- [ ] Processing completes within 30 seconds for typical transcript

---

## 📍 V3: Advanced Deal Intelligence

**Goal**: Provide strategic insights from meeting conversations

### Features to Implement

1. **Enhanced Intelligence Task**
   - Sentiment analysis with confidence score
   - Deal stage progression tracking
   - Win probability calculation
   - Competitor mentions
   - Budget discussions
   - Decision criteria identified

2. **Automated Follow-up Suggestions**
   - Generate personalized follow-up email templates
   - Suggest optimal next meeting topics
   - Identify stakeholders to engage

3. **Pattern Recognition Across Meetings**
   - Track sentiment changes over time
   - Identify recurring objections
   - Surface successful talk tracks

### Implementation Approach
- Separate, more sophisticated AI pipeline
- Larger context window for analysis
- Historical meeting context inclusion
- Integration with CRM data (future)

---

## 🚫 Out of Scope (For Now)

1. **V1-V3 Exclusions**
   - Grain API integration (using PDF upload instead)
   - Real-time transcription
   - Voice input processing
   - Multi-workspace support
   - User authentication (single-user system)
   - Email notifications
   - Asana webhook integration
   - Risk signals and buying signals extraction
   - Automated email sending

2. **Technical Limitations**
   - No offline support
   - No mobile app (web only)
   - English only
   - Single timezone (user's local time)

## Technical Architecture

### Data Flow
```
User Input → API Endpoint → AI Processing → Database Cache → Asana API
                                  ↓
                            Logging System
```

### AI Processing Approach
- **Separate LLM calls** for different tasks (avoid context pollution)
- **Parallel processing** where possible (speed optimization)
- **Fallback strategies** for AI failures
- **Comprehensive logging** at each step

### Database Schema Extensions Needed
```sql
-- For V2: Meeting tracking
meetings (
  id: string (PK)
  project_id: string (FK)
  meeting_date: timestamp
  grain_link: string
  transcript_url: string
  parent_task_id: string
  processed_at: timestamp
)

-- For V3: Intelligence tracking
meeting_intelligence (
  id: string (PK)
  meeting_id: string (FK)
  sentiment_score: float
  win_probability: float
  key_insights: jsonb
  created_at: timestamp
)
```

## Success Metrics

### V1 Success Criteria
- 95% of tasks routed to correct section
- Section selection takes <2 seconds
- Zero tasks lost to "Untitled" section

### V2 Success Criteria
- Process 10-page transcript in <30 seconds
- Extract 90% of explicit action items
- Zero duplicate task creation
- Parent-child relationship 100% accurate

### V3 Success Criteria
- Intelligence summary rated "helpful" 80% of time
- Suggested next actions align with sales methodology
- Deal probability correlation with actual outcomes >70%

## Development Guidelines

### For the Next AI Agent

1. **Start with V1** - Get section-based routing working perfectly
2. **Test with real data** - Use actual prospect names and scenarios
3. **Preserve logging** - The comprehensive logging is crucial for debugging
4. **Maintain backward compatibility** - Don't break the existing natural language endpoint
5. **Use TypeScript strictly** - Type safety prevents runtime errors
6. **Follow existing patterns** - The codebase has established patterns for AI calls, database queries, and error handling

### Key Files to Understand
- `/app/api/ingest-opus/route.ts` - Main API logic
- `/lib/ai/opus-client.ts` - AI integration
- `/lib/config/opus-config.ts` - Configuration system
- `/lib/asana/client.ts` - Asana API wrapper
- `/opus-config.json` - Project definitions

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
ASANA_PAT=
GOOGLE_GENERATIVE_AI_API_KEY=
INGEST_BEARER_TOKEN=
```

## Next Immediate Steps

1. **Create section sync script** (`scripts/syncSections.ts`) - **DO THIS FIRST**
   - Fetch existing sections from each project
   - Compare with standard sections from config
   - Create ONLY missing sections (preserve existing)
   - Store ALL section IDs in database
   - Add `--force` flag to recreate all sections (dangerous)
   - Add `--dry-run` flag to preview changes without creating

2. **Update opus-client.ts**
   - Add `determineSection()` method
   - Implement keyword matching logic
   - Return section name with task details

3. **Modify ingest-opus route**
   - Fetch section ID from database
   - Pass to task creation
   - Log section selection

4. **Test with examples**:
   - "Schedule demo for True North next week"
   - "Send proposal to Family Houston"
   - "Follow up with Shiloh about integration questions"

---

## Questions for Product Clarification

Before building V2, confirm:
1. Should subtasks inherit ALL parent custom fields or just specific ones?
2. Is 30-second processing time acceptable for transcripts?
3. Should we show processing progress in real-time or just success/fail?
4. Do we need to handle non-English transcripts?
5. Should Deal Intelligence tasks be visible to Gabriel or just Adi?

---

*This roadmap is a living document. Update it as decisions are made and features are completed.*