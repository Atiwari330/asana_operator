import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parsePDF } from '@/lib/utils/pdf-parser'
import { processTranscript } from '@/lib/ai/transcript-processor'
import { loadOpusConfig } from '@/lib/config/opus-config'

// Request schema for form data processing
const ProcessTranscriptSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  grainLink: z.string().url().optional().nullable(),
})

export async function POST(request: NextRequest) {
  console.log('[process-transcript] Received request')
  
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.INGEST_BEARER_TOKEN}`
    
    if (authHeader !== expectedToken) {
      console.log('[process-transcript] Unauthorized request')
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    const projectId = formData.get('projectId') as string | null
    const grainLink = formData.get('grainLink') as string | null
    
    console.log('[process-transcript] Form data:', {
      hasPdf: !!pdfFile,
      projectId,
      grainLink
    })
    
    // Validate inputs
    if (!pdfFile) {
      return NextResponse.json(
        { ok: false, error: 'PDF file is required' },
        { status: 400 }
      )
    }
    
    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }
    
    // Validate project exists in config
    const opusConfig = await loadOpusConfig()
    const project = opusConfig.projects.find(p => p.asana_id === projectId)
    
    if (!project) {
      return NextResponse.json(
        { ok: false, error: `Project ${projectId} not found in configuration` },
        { status: 400 }
      )
    }
    
    console.log('[process-transcript] Processing for project:', project.name)
    
    // Convert file to buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse PDF
    console.log('[process-transcript] Parsing PDF...')
    const pdfContent = await parsePDF(buffer)
    
    console.log('[process-transcript] PDF parsed:', {
      pages: pdfContent.pages,
      textLength: pdfContent.text.length,
      title: pdfContent.info.title
    })
    
    // Process transcript with parallel pipelines
    console.log('[process-transcript] Processing transcript...')
    const result = await processTranscript({
      projectId,
      grainLink: grainLink || undefined,
      transcriptText: pdfContent.text,
      fileName: pdfFile.name
    })
    
    console.log('[process-transcript] Processing complete:', {
      parentTaskId: result.parentTaskId,
      subtasks: result.subtaskIds.length,
      hasIntelligence: !!result.intelligenceTaskId,
      processingTime: result.processingTime,
      errors: result.errors.length
    })
    
    // Return success response
    return NextResponse.json({
      ok: true,
      parentTaskId: result.parentTaskId,
      parentTaskUrl: result.parentTaskUrl,
      subtaskIds: result.subtaskIds,
      intelligenceTaskId: result.intelligenceTaskId,
      processingTime: result.processingTime,
      projectName: project.name,
      message: `Created parent task with ${result.subtaskIds.length} action items${result.intelligenceTaskId ? ' and deal intelligence' : ''}`,
      errors: result.errors.length > 0 ? result.errors : undefined
    })
    
  } catch (error) {
    console.error('[process-transcript] Error:', error)
    
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to process transcript'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}