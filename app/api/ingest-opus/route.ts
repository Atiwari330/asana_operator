// Force Node.js runtime to avoid Edge runtime bundling issues - MUST be first!
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { getOpusAIClient } from '@/lib/ai/opus-client'
import { getAsanaClient } from '@/lib/asana/client'
import { loadOpusConfig } from '@/lib/config/opus-config'
import { db } from '@/lib/db/drizzle'
import { projects as projectsTable, users, recentOps } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import crypto from 'crypto'

// Request schema
const IngestRequestSchema = z.object({
  text: z.string().min(1),
})

// Response types
interface SuccessResponse {
  ok: true
  task_id: string
  task_url: string
  project_name: string
  assignee_name?: string
  title: string
  description_preview: string
}

interface ErrorResponse {
  ok: false
  error: string
  details?: any
}

type IngestResponse = SuccessResponse | ErrorResponse

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
function generateOpHash(projectId: string, assigneeEmail: string, title: string): string {
  const timeBucket = Math.floor(Date.now() / (10 * 60 * 1000)) // 10-minute buckets
  const content = `${projectId}:${assigneeEmail}:${title}:${timeBucket}`
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

// Helper to find assignee ID by email
async function findAssigneeId(email: string): Promise<string | null> {
  if (!email) return null
  
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  
  return user.length > 0 ? user[0].id : null
}

// Helper to get or create section ID
async function getSectionId(projectId: string, sectionName: string | null): Promise<string | null> {
  if (!sectionName) return null
  
  try {
    // Since we don't have database access in local dev, we'll create sections on-demand via Asana API
    // In production, this would first check the database cache
    
    const asanaClient = getAsanaClient()
    
    // Get existing sections for the project
    const sections = await asanaClient.listSections(projectId)
    
    // Find matching section
    const matchingSection = sections.find(s => s.name === sectionName)
    
    if (matchingSection) {
      console.log(`✅ Found existing section: ${sectionName} (${matchingSection.gid})`)
      return matchingSection.gid
    }
    
    // Section doesn't exist, create it
    console.log(`⚠️ Section not found, creating: ${sectionName}`)
    
    const response = await fetch(
      `https://app.asana.com/api/1.0/projects/${projectId}/sections`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ASANA_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: sectionName }
        })
      }
    )
    
    if (!response.ok) {
      console.error(`Failed to create section: ${response.statusText}`)
      return null
    }
    
    const result = await response.json()
    console.log(`✅ Created new section: ${sectionName} (${result.data.gid})`)
    return result.data.gid
    
  } catch (error) {
    console.error('Error getting/creating section:', error)
    return null
  }
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
    const { text } = IngestRequestSchema.parse(body)

    console.log('\n=== 📝 OPUS API: Processing request ===', text)

    // Load Opus configuration
    const opusConfig = await loadOpusConfig()
    console.log('📋 Loaded Opus config with', opusConfig.projects.length, 'projects')
    opusConfig.projects.forEach(p => {
      console.log(`  - ${p.name} (${p.category}) ID: ${p.asana_id}`)
    })
    
    // Get configured projects from database - include ALL categories for now
    const dbProjects = await db
      .select()
      .from(projectsTable)
      // Remove category filter to get all projects including 'prospect'
      .limit(50)
    
    console.log('🗄️ Found', dbProjects.length, 'projects in database:')
    dbProjects.forEach(p => {
      console.log(`  - ${p.name} (${p.category}) ID: ${p.id}`)
    })
    
    // Create AI client
    const aiClient = getOpusAIClient()
    
    // Stage 1: Match project
    console.log('\n🎯 Stage 1: Matching project...')
    console.log('  Input text:', text)
    console.log('  Available projects:', opusConfig.projects.map(p => p.name).join(', '))
    
    const matchResult = await aiClient.matchProject(
      text,
      opusConfig.projects,
      opusConfig
    )
    
    console.log('🤖 AI Match Result:', {
      matched: matchResult.project?.name || 'NONE',
      confidence: matchResult.confidence,
      reasoning: matchResult.reasoning
    })
    
    if (!matchResult.project) {
      console.error('❌ No project matched!')
      return NextResponse.json({
        ok: false,
        error: 'Could not determine which project to use. Please be more specific about the project or department.',
        details: { 
          reasoning: matchResult.reasoning,
          availableProjects: opusConfig.projects.map(p => p.name)
        }
      })
    }
    
    console.log(`✅ Matched project: ${matchResult.project.name} (${matchResult.confidence} confidence)`)
    
    // Stage 2: Create contextual task
    console.log('\n📋 Stage 2: Creating contextual task...')
    console.log('  For project:', matchResult.project.name)
    
    const taskDetails = await aiClient.createContextualTask(
      text,
      matchResult.project,
      opusConfig
    )
    
    console.log('🤖 AI Task Details:', {
      title: taskDetails.title,
      assignee: taskDetails.assignee_email || 'unassigned',
      section: taskDetails.section_name || 'none',
      descriptionLength: taskDetails.description.length
    })
    console.log('✅ Task created:', taskDetails.title)
    
    // Find assignee ID
    let assigneeId: string | null = null
    if (taskDetails.assignee_email) {
      console.log('\n🔍 Looking up assignee:', taskDetails.assignee_email)
      assigneeId = await findAssigneeId(taskDetails.assignee_email)
      if (assigneeId) {
        console.log(`✅ Found assignee ID: ${assigneeId}`)
      } else {
        console.log('⚠️ Assignee not found in database, task will be unassigned')
      }
    } else {
      console.log('ℹ️ No assignee specified')
    }
    
    // Check for idempotency
    const opHash = generateOpHash(
      matchResult.project.asana_id,
      taskDetails.assignee_email || 'unassigned',
      taskDetails.title
    )
    
    if (await wasRecentlyPerformed(opHash)) {
      return NextResponse.json({
        ok: false,
        error: 'This task was recently created (within 10 minutes). Skipping duplicate.',
      })
    }
    
    // Get section ID if section name was determined
    let sectionId: string | null = null
    if (taskDetails.section_name) {
      console.log('\n🔍 Looking up section:', taskDetails.section_name)
      sectionId = await getSectionId(matchResult.project.asana_id, taskDetails.section_name)
      if (sectionId) {
        console.log(`✅ Using section ID: ${sectionId}`)
      } else {
        console.log('⚠️ Section not found/created, task will go to default section')
      }
    }
    
    // Create task in Asana
    console.log('\n🚀 Creating task in Asana...')
    console.log('  Project ID:', matchResult.project.asana_id)
    console.log('  Task Title:', taskDetails.title)
    console.log('  Assignee ID:', assigneeId || 'unassigned')
    console.log('  Section ID:', sectionId || 'default')
    
    const asanaClient = getAsanaClient()
    
    // Skip actual Asana creation if project ID is a placeholder
    if (matchResult.project.asana_id.startsWith('PLACEHOLDER')) {
      console.log('⚠️ Skipping Asana API call - placeholder project ID')
      
      // Still record the operation to prevent duplicates
      await recordOperation(opHash)
      
      return NextResponse.json({
        ok: true,
        task_id: 'demo-' + Date.now(),
        task_url: '#demo-mode',
        project_name: matchResult.project.name,
        assignee_name: taskDetails.assignee_email?.split('@')[0],
        title: taskDetails.title,
        description_preview: taskDetails.description.substring(0, 200) + '...',
      })
    }
    
    const task = await asanaClient.createTask({
      name: taskDetails.title,
      notes: taskDetails.description,
      projectId: matchResult.project.asana_id,
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
      project_name: matchResult.project.name,
      assignee_name: taskDetails.assignee_email?.split('@')[0],
      title: taskDetails.title,
      description_preview: taskDetails.description.substring(0, 200) + '...',
    })

  } catch (error) {
    console.error('❌ Ingest error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: `Invalid request: ${error.issues[0].message}` },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}