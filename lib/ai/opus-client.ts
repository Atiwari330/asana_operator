import { google } from '@ai-sdk/google'
import { generateObject, generateText } from 'ai'
import * as z from 'zod'
import type { OpusProject, OpusConfig } from '../config/opus-config'

// Schema for project matching
const ProjectMatchSchema = z.object({
  matched_project_name: z.string().nullable().describe('The name of the matched project or null if no match'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the match'),
  reasoning: z.string().describe('Brief explanation of why this project was chosen'),
})

// Schema for enhanced task creation
const EnhancedTaskSchema = z.object({
  title: z.string().describe('Clear, actionable task title'),
  description: z.string().describe('Detailed task description with relevant context'),
  assignee_email: z.string().nullable().describe('Email of the person to assign the task to'),
  // Removed section_name - all tasks now go to "General" section
  priority: z.enum(['high', 'medium', 'low']).optional().describe('Task priority based on content'),
  due_date: z.string().nullable().optional().describe('Due date in YYYY-MM-DD format if only date is specified'),
  due_datetime: z.string().nullable().optional().describe('Due date and time in LOCAL Eastern Time format (YYYY-MM-DDTHH:mm:ss) without Z suffix'),
  tags: z.array(z.string()).optional().describe('Relevant tags for the task'),
})

export class OpusAIClient {
  private model: ReturnType<typeof google> | null = null

  private getModel(): ReturnType<typeof google> {
    if (!this.model) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set')
      }
      this.model = google('gemini-1.5-flash')
    }
    return this.model
  }

  /**
   * Stage 1: Match the user's request to an Opus project
   */
  async matchProject(
    text: string,
    projects: OpusProject[],
    config: OpusConfig
  ): Promise<{ project: OpusProject | null; confidence: string; reasoning: string }> {
    console.log('\n🤖 AI Client: Starting project matching...')
    console.log('  Input text:', text)
    console.log('  Available projects:', projects.length)
    
    const projectList = projects.map(p => ({
      name: p.name,
      category: p.category,
      keywords: p.matching_keywords,
    }))

    const prompt = `You are an assistant for Adi, who leads Operations & Sales at Opus, a modern EHR for behavioral health providers.

Match this request to the appropriate project from the list below. Consider the context and keywords.

User request: "${text}"

Available projects:
${JSON.stringify(projectList, null, 2)}

Context about Opus:
- Behavioral health EHR company
- Key team members: Gabriel (sales assistant), Janelle (onboarding), Hector (engineering), Rodrigo (support), Shawn (marketing), Humberto (CEO)
- Project categories: [DEPT] for departments, [PROSPECT] for potential customers, [CUSTOMER] for existing clients, [PROJECT] for strategic initiatives

Common patterns:
- Gabriel, demos, proposals, MSAs → Usually sales/prospect related
- Janelle, onboarding, implementation → [DEPT] Onboarding
- Hector, bugs, features, technical → [DEPT] Engineering
- Rodrigo, support tickets → [DEPT] Support
- Practice Suite, RCM issues → Could be strategic project or onboarding

Return the name of the best matching project, or null if no clear match.`

    console.log('📝 AI Client: Sending prompt to Gemini (', prompt.length, 'chars)')
    
    try {
      const { object } = await generateObject({
        model: this.getModel(),
        schema: ProjectMatchSchema,
        prompt,
        temperature: 0.1,
        maxRetries: 2,
      })

      console.log('📨 AI Client: Received response from Gemini:', {
        matched_project_name: object.matched_project_name,
        confidence: object.confidence,
        reasoning: object.reasoning
      })

      // Find the actual project object
      const matchedProject = projects.find(p => p.name === object.matched_project_name) || null

      if (matchedProject) {
        console.log('✅ AI Client: Found matching project:', matchedProject.name)
      } else if (object.matched_project_name) {
        console.log('⚠️ AI Client: Gemini suggested project not found in list:', object.matched_project_name)
      } else {
        console.log('❌ AI Client: No project match found')
      }

      return {
        project: matchedProject,
        confidence: object.confidence,
        reasoning: object.reasoning,
      }
    } catch (error) {
      console.error('❌ AI Client: Failed to match project:', error)
      return {
        project: null,
        confidence: 'low',
        reasoning: 'Error occurred during project matching',
      }
    }
  }

  /**
   * Stage 2: Create an enhanced task with full project context
   */
  async createContextualTask(
    text: string,
    project: OpusProject,
    config: OpusConfig
  ): Promise<{
    title: string
    description: string
    assignee_email: string | null
    // section_name removed - using "General" for all tasks
    priority?: string
    due_date?: string | null
    due_datetime?: string | null
    tags?: string[]
  }> {
    console.log('\n🤖 AI Client: Creating contextual task...')
    console.log('  For project:', project.name)
    console.log('  Default assignee:', project.default_assignee || 'none')
    
    const contextPrompt = `You are creating an Asana task for Adi, Operations & Sales leader at Opus.

COMPANY CONTEXT:
${JSON.stringify(config.company_context, null, 2)}

PROJECT CONTEXT:
Project: ${project.name}
Category: ${project.category}
${JSON.stringify(project.rich_context, null, 2)}

TEAM CONTEXT:
${JSON.stringify(config.team_structure, null, 2)}

// All tasks will be placed in the "General" section

USER REQUEST: "${text}"

CRITICAL: Analyze the complexity of the user's request and match your response accordingly:

1. SIMPLE REQUESTS (< 20 words, basic actions):
   - Create a minimal task with a brief title
   - Description should be 1-2 sentences maximum
   - Example: "Email Karl" → Task: "Email Karl", Description: "Send follow-up email to Karl"
   - DO NOT add details about products, pricing, or features

2. DETAILED REQUESTS (user provides specific instructions):
   - Preserve ALL specific details the user mentioned
   - Include exact instructions they provided
   - Example: If user mentions "find email about Alaska trip and mention lab integration" → Include those exact details
   - Only add what the user explicitly stated

3. NEVER ADD:
   - Product pricing unless user mentions it
   - Feature lists unless user mentions them
   - Competitor comparisons unless user mentions them
   - Meeting details unless user describes them
   - Business context unless user provides it

Create the task with:
1. A clear title that reflects the request
2. A description that matches the input complexity (brief for simple, detailed for complex)
3. The appropriate assignee based on the task nature and team structure
4. Priority level ONLY if apparent from the request
5. Tags ONLY if clearly relevant

Assignment logic (use context to route, not to add content):
- Sales/demos/follow-ups → Gabriel (dlacap@opusbehavioral.com)
- Department heads → Appropriate head
- Strategic items → Adi (adi@opus.com)

Remember: Mirror the user's level of detail. Don't manufacture information.

DATE HANDLING (Today is ${new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})} - ${new Date().toISOString().split('T')[0]}):
- If user mentions a date without time (e.g., "September 15", "next Friday", "tomorrow"), set due_date in YYYY-MM-DD format
- If user mentions a date WITH time, set due_datetime as LOCAL TIME in format YYYY-MM-DDTHH:mm:ss (NO 'Z' suffix - this is Eastern Time)
  Examples that indicate time (all times are Eastern Time):
  * "September 15 at 9:30am" → due_datetime: "2025-09-15T09:30:00"
  * "tomorrow at 2pm" → due_datetime: "2025-09-14T14:00:00"
  * "Monday by 10 a.m." → due_datetime: "2025-09-15T10:00:00"
  * "next week by 3pm" → due_datetime: "2025-09-20T15:00:00"
  * "by end of day" → due_datetime with time set to "17:00:00" (5 PM)
  * "by noon" → due_datetime with time set to "12:00:00"
- Convert natural language dates:
  * "tomorrow" = the next day
  * "next [weekday]" = the NEXT occurrence of that weekday (e.g., if today is Friday, "next Tuesday" is Sept 17, not Sept 24)
  * "next week" = exactly 7 days from today
  * "[weekday] next week" = that weekday in the following week
- IMPORTANT: "by [time]" means the same as "at [time]" - both indicate a specific deadline time
- IMPORTANT: Generate times as LOCAL Eastern Time, NOT UTC. Do NOT add 'Z' to the end.
- NEVER set both due_date and due_datetime - choose based on whether time was specified
- If no date is mentioned, leave both fields null`

    console.log('📝 AI Client: Sending task creation prompt to Gemini')
    
    try {
      const { object } = await generateObject({
        model: this.getModel(),
        schema: EnhancedTaskSchema,
        prompt: contextPrompt,
        temperature: 0.2, // Slightly higher for more creative descriptions
        maxRetries: 2,
      })

      console.log('📨 AI Client: Received task details from Gemini:', {
        title: object.title,
        assignee: object.assignee_email || 'unassigned',
        section: 'General', // Always use General section
        priority: object.priority,
        has_due_date: !!object.due_date || !!object.due_datetime,
        tags_count: object.tags?.length || 0
      })

      return {
        title: object.title,
        description: object.description,
        assignee_email: object.assignee_email,
        // section_name removed - using General
        priority: object.priority,
        due_date: object.due_date || undefined,
        due_datetime: object.due_datetime || undefined,
        tags: object.tags,
      }
    } catch (error) {
      console.error('❌ AI Client: Failed to create contextual task:', error)
      console.log('⚠️ AI Client: Using fallback task creation')
      
      // Fallback to simple extraction
      return {
        title: text.substring(0, 100),
        description: text,
        assignee_email: project.default_assignee || null,
        // section_name removed - using General
      }
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async extractTaskIntent(text: string): Promise<any> {
    // This method is kept for backward compatibility
    // In the new flow, we use matchProject and createContextualTask instead
    return {
      intent: 'create_task',
      projectName: null,
      assigneeName: null,
      title: text.substring(0, 100),
      description: text,
      sectionName: null,
      labels: null,
      dueDate: null,
    }
  }
}

// Export singleton instance getter
let opusClientInstance: OpusAIClient | null = null

export function getOpusAIClient(): OpusAIClient {
  if (!opusClientInstance) {
    opusClientInstance = new OpusAIClient()
  }
  return opusClientInstance
}