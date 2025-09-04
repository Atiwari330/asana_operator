import PDFParser from 'pdf2json'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

export interface PDFContent {
  text: string
  pages: number
  info: {
    title?: string
    author?: string
    creationDate?: Date
    modificationDate?: Date
  }
}

export async function parsePDF(buffer: Buffer): Promise<PDFContent> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a temporary file to work with pdf2json
      const tempDir = os.tmpdir()
      const tempFileName = `pdf_${crypto.randomBytes(16).toString('hex')}.pdf`
      const tempFilePath = path.join(tempDir, tempFileName)
      
      // Write buffer to temp file
      await fs.writeFile(tempFilePath, buffer)
      
      // Create parser instance (bypass TypeScript types issue)
      const pdfParser = new (PDFParser as any)(null, 1)
      
      // Set up event handlers
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        // Clean up temp file
        fs.unlink(tempFilePath).catch(() => {})
        reject(new Error(errData.parserError || 'Failed to parse PDF'))
      })
      
      pdfParser.on('pdfParser_dataReady', async (pdfData: any) => {
        try {
          // Clean up temp file
          await fs.unlink(tempFilePath).catch(() => {})
          
          // Extract raw text content
          const rawText = pdfParser.getRawTextContent()
          
          // Clean up the text
          const cleanedText = rawText
            .replace(/%20/g, ' ')
            .replace(/%2C/g, ',')
            .replace(/%3A/g, ':')
            .replace(/%2F/g, '/')
            .replace(/%3F/g, '?')
            .replace(/%3D/g, '=')
            .replace(/%26/g, '&')
            .replace(/%23/g, '#')
            .replace(/%2B/g, '+')
            .replace(/%22/g, '"')
            .replace(/%27/g, "'")
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim()
          
          // Get page count
          const pageCount = pdfData.Pages ? pdfData.Pages.length : 1
          
          // Extract metadata if available
          const metadata = pdfData.Meta || {}
          
          resolve({
            text: cleanedText || 'No text content found in PDF',
            pages: pageCount,
            info: {
              title: metadata.Title,
              author: metadata.Author,
              creationDate: metadata.CreationDate ? new Date(metadata.CreationDate) : undefined,
              modificationDate: metadata.ModDate ? new Date(metadata.ModDate) : undefined
            }
          })
        } catch (error) {
          reject(error)
        }
      })
      
      // Load and parse the PDF file
      pdfParser.loadPDF(tempFilePath)
      
    } catch (error) {
      console.error('Error parsing PDF:', error)
      reject(new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

export function extractMeetingMetadata(text: string): {
  date?: string
  attendees?: string[]
  duration?: string
  topic?: string
} {
  const metadata: {
    date?: string
    attendees?: string[]
    duration?: string
    topic?: string
  } = {}

  // Extract date (various formats)
  const datePatterns = [
    /Date:\s*([^\n]+)/i,
    /Meeting Date:\s*([^\n]+)/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\w+ \d{1,2}, \d{4})/
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      metadata.date = match[1].trim()
      break
    }
  }

  // Extract attendees
  const attendeePatterns = [
    /Attendees?:\s*([^\n]+(?:\n[^\n]+)*)/i,
    /Participants?:\s*([^\n]+(?:\n[^\n]+)*)/i,
    /Present:\s*([^\n]+(?:\n[^\n]+)*)/i
  ]
  
  for (const pattern of attendeePatterns) {
    const match = text.match(pattern)
    if (match) {
      const attendeeText = match[1].trim()
      metadata.attendees = attendeeText
        .split(/[,\n]/)
        .map(a => a.trim())
        .filter(a => a.length > 0 && a.length < 100) // Filter out empty strings and long text
      break
    }
  }

  // Extract duration
  const durationPatterns = [
    /Duration:\s*([^\n]+)/i,
    /Length:\s*([^\n]+)/i,
    /(\d+\s*(?:hours?|hrs?|minutes?|mins?))/i
  ]
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern)
    if (match) {
      metadata.duration = match[1].trim()
      break
    }
  }

  // Extract topic/subject
  const topicPatterns = [
    /Subject:\s*([^\n]+)/i,
    /Topic:\s*([^\n]+)/i,
    /Meeting:\s*([^\n]+)/i,
    /Title:\s*([^\n]+)/i
  ]
  
  for (const pattern of topicPatterns) {
    const match = text.match(pattern)
    if (match) {
      metadata.topic = match[1].trim()
      break
    }
  }

  return metadata
}

export function sanitizeTranscriptText(text: string): string {
  // Remove excessive whitespace
  let sanitized = text.replace(/\s+/g, ' ')
  
  // Remove page numbers and headers/footers that commonly appear
  sanitized = sanitized.replace(/Page \d+ of \d+/gi, '')
  sanitized = sanitized.replace(/\d+\/\d+\/\d{2,4}\s+\d{1,2}:\d{2}\s*[AP]M/gi, '')
  
  // Remove common transcript artifacts
  sanitized = sanitized.replace(/\[inaudible\]/gi, '')
  sanitized = sanitized.replace(/\[crosstalk\]/gi, '')
  sanitized = sanitized.replace(/\[pause\]/gi, '')
  
  // Trim and return
  return sanitized.trim()
}

export function chunkTranscript(text: string, maxChunkSize: number = 10000): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
    }
    currentChunk += sentence + ' '
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}