import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { getGeminiClient } from '@/lib/ai/client'
import { getAsanaClient } from '@/lib/asana/client'
import { 
  findProjectIdByName, 
  findUserIdByName
} from '@/lib/resolver/match'
import { getSectionId } from '@/lib/resolver/section-resolver'
import { db } from '@/lib/db/drizzle'
import { recentOps } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import crypto from 'crypto'

// Request schema
const IngestRequestSchema = z.object({
  text: z.string().min(1),
  confirmed_ids: z.object({
    project_id: z.string().optional(),
    assignee_id: z.string().optional(),
    // section_id removed - all tasks use "General" section
  }).optional(),
})

// Response types
interface SuccessResponse {
  ok: true
  task_id: string
  task_url: string
  project_name: string
  assignee_name?: string
  title: string
}

interface ConfirmationNeededResponse {
  ok: false
  needs_confirmation: true
  options: {
    project?: Array<{ id: string; name: string }>
    assignee?: Array<{ id: string; name: string; email?: string | null }>
    section?: Array<{ id: string; name: string }>
  }
}

interface ErrorResponse {
  ok: false
  error: string
}

type IngestResponse = SuccessResponse | ConfirmationNeededResponse | ErrorResponse

// Helper to check auth
function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.INGEST_BEARER_TOKEN
  
  if (!expectedToken) {
    console.warn('INGEST_BEARER_TOKEN not set')
    return true // Allow in development if not set
  }
  
  return authHeader === `Bearer ${expectedToken}`
}

// Helper to generate operation hash for idempotency
function generateOpHash(projectId: string, assigneeId: string, title: string): string {
  const timeBucket = Math.floor(Date.now() / (10 * 60 * 1000)) // 10-minute buckets
  const content = `${projectId}:${assigneeId}:${title}:${timeBucket}`
  return crypto.createHash('sha256').update(content).digest('hex')
}

// Helper to check if operation was recently performed
async function wasRecentlyPerformed(opHash: string): Promise<boolean> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  
  const recent = await db
    .select()
    .from(recentOps)
    .where(
      and(
        eq(recentOps.opHash, opHash),
        gte(recentOps.createdAt, tenMinutesAgo)
      )
    )
    .limit(1)
  
  return recent.length > 0
}

// Helper to record operation
async function recordOperation(opHash: string): Promise<void> {
  await db.insert(recentOps).values({
    opHash,
    createdAt: new Date(),
  }).onConflictDoNothing()
}

export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const { text, confirmed_ids } = IngestRequestSchema.parse(body)

    // Step 1: Extract intent using Gemini
    const geminiClient = getGeminiClient()
    const extraction = await geminiClient.extractTaskIntent(text)
    
    if (extraction.intent === 'none') {
      return NextResponse.json({
        ok: false,
        error: 'No task creation intent detected in the input',
      })
    }

    // Step 2: Resolve names to IDs
    let projectId = confirmed_ids?.project_id
    let assigneeId = confirmed_ids?.assignee_id
    // Section handling removed - will use General section
    
    const needsConfirmation: ConfirmationNeededResponse['options'] = {}

    // Resolve project
    if (!projectId && extraction.projectName) {
      const projectResult = await findProjectIdByName(extraction.projectName)
      if (projectResult.id) {
        projectId = projectResult.id
      } else if (projectResult.candidates) {
        needsConfirmation.project = projectResult.candidates
      }
    }

    // Resolve assignee
    if (!assigneeId && extraction.assigneeName) {
      const userResult = await findUserIdByName(extraction.assigneeName)
      if (userResult.id) {
        assigneeId = userResult.id
      } else if (userResult.candidates) {
        needsConfirmation.assignee = userResult.candidates
      }
    }

    // Always use General section if we have a project
    let sectionId: string | null = null
    if (projectId) {
      sectionId = await getSectionId(projectId)
      if (!sectionId) {
        console.log('⚠️ General section not found for project')
      }
    }

    // Check if we need confirmation
    if (Object.keys(needsConfirmation).length > 0) {
      return NextResponse.json({
        ok: false,
        needs_confirmation: true,
        options: needsConfirmation,
      })
    }

    // Validate we have minimum required fields
    if (!projectId) {
      return NextResponse.json({
        ok: false,
        error: 'Could not determine project. Please specify a project name.',
      })
    }

    if (!extraction.title) {
      return NextResponse.json({
        ok: false,
        error: 'Could not determine task title from the input.',
      })
    }

    // Check for idempotency
    const opHash = generateOpHash(
      projectId, 
      assigneeId || 'unassigned', 
      extraction.title
    )
    
    if (await wasRecentlyPerformed(opHash)) {
      return NextResponse.json({
        ok: false,
        error: 'This task was recently created (within 10 minutes). Skipping duplicate.',
      })
    }

    // Step 3: Create task in Asana
    const asanaClient = getAsanaClient()
    const task = await asanaClient.createTask({
      name: extraction.title,
      notes: extraction.description || undefined,
      projectId,
      assigneeId: assigneeId || undefined,
      sectionId: sectionId || undefined,
    })

    // Record the operation
    await recordOperation(opHash)

    // Return success response
    return NextResponse.json({
      ok: true,
      task_id: task.gid,
      task_url: task.permalink_url,
      project_name: extraction.projectName || 'Project',
      assignee_name: extraction.assigneeName || undefined,
      title: extraction.title,
    })

  } catch (error) {
    console.error('Ingest error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: `Invalid request: ${error.issues[0].message}` },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}