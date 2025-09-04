import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
// Using direct Asana API calls instead of client
import { extractMeetingMetadata, sanitizeTranscriptText, chunkTranscript } from '../utils/pdf-parser'
import { getSectionId } from '../resolver/section-resolver'

// Schema for action items
const ActionItemSchema = z.object({
  assignee: z.string().describe('Email of person responsible (gabriel@opus.com, adi@opus.com, or prospect)'),
  title: z.string().describe('Clear, actionable task title'),
  due_date: z.string().nullable().describe('Due date in YYYY-MM-DD format if mentioned'),
  section: z.string().describe('Section name: Initial Outreach, Discovery, Demo/Presentation, Proposal, Negotiation, Follow-up, etc.'),
  context: z.string().describe('Brief context from the meeting')
})

const ActionItemsSchema = z.object({
  action_items: z.array(ActionItemSchema).describe('List of concrete action items from the meeting')
})

// Schema for meeting metadata extraction
const MeetingMetadataSchema = z.object({
  client_name: z.string().describe('Name of the client/prospect company'),
  meeting_date: z.string().describe('Meeting date in YYYY-MM-DD format'),
  attendees: z.array(z.string()).describe('List of attendee names'),
  duration: z.string().nullable().describe('Meeting duration'),
  meeting_type: z.enum(['discovery', 'demo', 'negotiation', 'follow-up']).describe('Type of meeting'),
  summary: z.string().describe('Brief 1-2 sentence summary of the meeting')
})

// Schema for deal intelligence
const DealIntelligenceSchema = z.object({
  sentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
  confidence_score: z.number().min(0).max(100).describe('Confidence in closing the deal (0-100)'),
  key_points: z.array(z.string()).describe('Key discussion points from the meeting'),
  objections: z.array(z.string()).describe('Any objections or concerns raised'),
  next_best_action: z.string().describe('Recommended next step based on the conversation'),
  competitors_mentioned: z.array(z.string()).describe('Any competitors mentioned'),
  budget_discussed: z.boolean().describe('Whether budget was discussed'),
  decision_timeline: z.string().nullable().describe('Timeline for decision if mentioned')
})

export interface TranscriptProcessingResult {
  parentTaskId: string
  parentTaskUrl: string
  subtaskIds: string[]
  intelligenceTaskId?: string
  processingTime: number
  errors: string[]
}

export interface ProcessingOptions {
  projectId: string
  grainLink?: string
  transcriptText: string
  fileName?: string
}

// Pipeline A: Create parent meeting task
async function createParentMeetingTask(
  options: ProcessingOptions,
  metadata: z.infer<typeof MeetingMetadataSchema>
): Promise<{ taskId: string; taskUrl: string }> {
  // Get Meeting Notes section
  const sectionId = await getSectionId(options.projectId, '📅 Meeting Notes')
  
  const taskData: any = {
    projects: [options.projectId],
    name: `Meeting: ${metadata.client_name} - ${metadata.meeting_date}`,
    notes: `
**Meeting Summary**
${metadata.summary}

**Attendees:** ${metadata.attendees.join(', ')}
**Duration:** ${metadata.duration || 'Not specified'}
**Meeting Type:** ${metadata.meeting_type}

${options.grainLink ? `**Recording:** ${options.grainLink}` : ''}
${options.fileName ? `**Transcript:** ${options.fileName}` : ''}
    `.trim(),
    // Note: We'll resolve assignee email to ID if needed
    // For now, don't set assignee to avoid errors
    due_on: metadata.meeting_date
  }
  
  if (sectionId) {
    taskData.memberships = [{
      project: options.projectId,
      section: sectionId
    }]
  }
  
  // Create task using Asana API directly
  const response = await fetch('https://app.asana.com/api/1.0/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ASANA_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: taskData })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create parent task: ${error}`)
  }
  
  const result = await response.json()
  const task = result.data
  
  return {
    taskId: task.gid,
    taskUrl: task.permalink_url || `https://app.asana.com/0/${options.projectId}/${task.gid}`
  }
}

// Pipeline B: Extract and create action item subtasks
async function createActionItemSubtasks(
  transcriptText: string,
  parentTaskId: string,
  projectId: string
): Promise<string[]> {
  const model = google('gemini-1.5-flash')
  const subtaskIds: string[] = []
  
  // Process transcript in chunks if needed
  const chunks = chunkTranscript(transcriptText, 10000)
  const allActionItems: z.infer<typeof ActionItemSchema>[] = []
  
  for (const chunk of chunks) {
    try {
      const result = await generateObject({
        model,
        schema: ActionItemsSchema,
        prompt: `You are analyzing a sales meeting transcript. Extract ONLY concrete action items.

For each action item, identify:
1. WHO is responsible (use gabriel@opus.com for most tasks, adi@opus.com for strategic items, or note if it's the prospect's responsibility)
2. WHAT needs to be done (specific, actionable task)
3. WHEN it's due (if mentioned)
4. WHICH section it belongs to:
   - "📞 Initial Outreach" for initial contact tasks
   - "🔍 Discovery" for research/learning tasks
   - "🎬 Demo/Presentation" for demo-related tasks
   - "📝 Proposal" for proposal/pricing tasks
   - "🤝 Negotiation" for negotiation tasks
   - "⏰ Follow-up" for follow-up tasks

Transcript chunk:
${chunk}

Extract action items:`
      })
      
      allActionItems.push(...result.object.action_items)
    } catch (error) {
      console.error('Error extracting action items from chunk:', error)
    }
  }
  
  // Create subtasks for each action item
  for (const item of allActionItems) {
    try {
      // Get the appropriate section
      const sectionId = await getSectionId(projectId, item.section)
      
      const subtaskData: any = {
        parent: parentTaskId,
        name: item.title,
        notes: `Context: ${item.context}`,
        // Note: assignee should be Asana user ID, not email
        // For now, don't set assignee to avoid errors
        // Note: Subtasks inherit the parent's project, don't set projects field
      }
      
      if (item.due_date) {
        subtaskData.due_on = item.due_date
      }
      
      // Note: Subtasks cannot be assigned to sections directly in Asana API
      // They inherit the parent's project and can only be in one section
      
      // Create subtask using Asana API directly
      const response = await fetch('https://app.asana.com/api/1.0/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ASANA_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: subtaskData })
      })
      
      if (response.ok) {
        const result = await response.json()
        subtaskIds.push(result.data.gid)
      } else {
        const error = await response.text()
        console.error(`Failed to create subtask "${item.title}": ${error}`)
      }
      
    } catch (error) {
      console.error(`Error creating subtask: ${item.title}`, error)
    }
  }
  
  return subtaskIds
}

// Pipeline C: Create deal intelligence task
async function createDealIntelligenceTask(
  transcriptText: string,
  projectId: string,
  clientName: string,
  meetingDate: string
): Promise<string | undefined> {
  const model = google('gemini-1.5-flash')
  
  try {
    const result = await generateObject({
      model,
      schema: DealIntelligenceSchema,
      prompt: `Analyze this sales meeting transcript for strategic insights.

Consider:
- Overall sentiment and buying signals
- Confidence in closing the deal (0-100)
- Key discussion points and objections
- Competitors mentioned
- Budget and timeline discussions
- Recommended next best action

Transcript:
${transcriptText.substring(0, 15000)} // Limit context for intelligence analysis

Provide strategic analysis:`
    })
    
    const intelligence = result.object
    
    // Get Strategy section
    const sectionId = await getSectionId(projectId, '🧭 Strategy')
    
    const taskData: any = {
      projects: [projectId],
      name: `Deal Intelligence: ${clientName} - ${meetingDate}`,
      notes: `
**Sentiment:** ${intelligence.sentiment} (Confidence: ${intelligence.confidence_score}%)

**Key Points:**
${intelligence.key_points.map(p => `• ${p}`).join('\n')}

**Objections/Concerns:**
${intelligence.objections.length > 0 ? intelligence.objections.map(o => `• ${o}`).join('\n') : 'None identified'}

**Competitors Mentioned:**
${intelligence.competitors_mentioned.length > 0 ? intelligence.competitors_mentioned.join(', ') : 'None'}

**Budget Discussed:** ${intelligence.budget_discussed ? 'Yes' : 'No'}
**Decision Timeline:** ${intelligence.decision_timeline || 'Not specified'}

**Recommended Next Action:**
${intelligence.next_best_action}
      `.trim(),
      // Note: assignee should be Asana user ID, not email
      // For now, don't set assignee to avoid errors
    }
    
    if (sectionId) {
      taskData.memberships = [{
        project: projectId,
        section: sectionId
      }]
    }
    
    // Create task using Asana API directly
    const response = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ASANA_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: taskData })
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.data.gid
    } else {
      const error = await response.text()
      console.error(`Failed to create intelligence task: ${error}`)
      return undefined
    }
    
  } catch (error) {
    console.error('Error creating deal intelligence task:', error)
    return undefined
  }
}

// Main processing function with parallel pipelines
export async function processTranscript(options: ProcessingOptions): Promise<TranscriptProcessingResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const model = google('gemini-1.5-flash')
  
  // First, extract meeting metadata
  const transcriptText = sanitizeTranscriptText(options.transcriptText)
  
  let metadata: z.infer<typeof MeetingMetadataSchema>
  
  try {
    // Use AI to extract structured metadata
    const metadataResult = await generateObject({
      model,
      schema: MeetingMetadataSchema,
      prompt: `Extract meeting metadata from this transcript. 
      
Focus on identifying:
- Client/prospect company name
- Meeting date
- Attendees
- Meeting type (discovery, demo, negotiation, or follow-up)
- Brief summary

Transcript beginning:
${transcriptText.substring(0, 3000)}

Extract metadata:`
    })
    
    metadata = metadataResult.object
  } catch (error) {
    console.error('Error extracting metadata:', error)
    // Fallback metadata
    const basicMetadata = extractMeetingMetadata(transcriptText)
    metadata = {
      client_name: 'Unknown Client',
      meeting_date: basicMetadata.date || new Date().toISOString().split('T')[0],
      attendees: basicMetadata.attendees || [],
      duration: basicMetadata.duration || null,
      meeting_type: 'discovery',
      summary: 'Meeting transcript processed'
    }
  }
  
  // First create the parent task
  const parentTaskResult = await createParentMeetingTask(options, metadata).catch(error => {
    errors.push(`Parent task creation failed: ${error.message}`)
    throw error // This is critical, so we throw
  })
  
  // Then execute the other pipelines in parallel
  const [subtaskIds, intelligenceTaskId] = await Promise.all([
    // Pipeline B: Extract and create action items using the parent task ID
    createActionItemSubtasks(
      transcriptText,
      parentTaskResult.taskId,
      options.projectId
    ).catch(error => {
      errors.push(`Action items extraction failed: ${error.message}`)
      return []
    }),
    
    // Pipeline C: Create deal intelligence task
    createDealIntelligenceTask(
      transcriptText,
      options.projectId,
      metadata.client_name,
      metadata.meeting_date
    ).catch(error => {
      errors.push(`Deal intelligence creation failed: ${error.message}`)
      return undefined
    })
  ])
  
  const processingTime = Date.now() - startTime
  
  return {
    parentTaskId: parentTaskResult.taskId,
    parentTaskUrl: parentTaskResult.taskUrl,
    subtaskIds: subtaskIds,
    intelligenceTaskId,
    processingTime,
    errors
  }
}