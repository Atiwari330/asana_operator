// For Zod v4, use direct named imports
import { z } from 'zod'

// Schema for the Opus configuration
export const OpusProjectSchema = z.object({
  asana_id: z.string(),
  name: z.string(),
  category: z.enum(['department', 'prospect', 'customer', 'strategic']),
  matching_keywords: z.array(z.string()),
  default_assignee: z.string().optional(),
  rich_context: z.record(z.any()),
})

export const OpusConfigSchema = z.object({
  company_context: z.object({
    business: z.string(),
    industry: z.string(),
    key_products: z.record(z.string()),
    pricing: z.record(z.any()),
    competitors: z.array(z.string()),
    differentiators: z.array(z.string()),
  }),
  team_structure: z.record(z.any()),
  projects: z.array(OpusProjectSchema),
  smart_routing: z.record(z.any()),
  task_templates: z.record(z.any()).optional(),
})

export type OpusProject = z.infer<typeof OpusProjectSchema>
export type OpusConfig = z.infer<typeof OpusConfigSchema>

// Load and validate configuration
export async function loadOpusConfig(): Promise<OpusConfig> {
  try {
    // Load JSON using Node.js fs module to bypass import issues
    const fs = require('fs')
    const path = require('path')
    
    const configPath = path.join(process.cwd(), 'opus-config.json')
    const configText = fs.readFileSync(configPath, 'utf8')
    const configData = JSON.parse(configText)
    
    console.log('Loaded config keys:', Object.keys(configData))
    console.log('Zod object type:', typeof z)
    console.log('Zod keys:', Object.keys(z))
    console.log('OpusConfigSchema type:', typeof OpusConfigSchema)
    
    // Try parsing with the schema
    return OpusConfigSchema.parse(configData)
  } catch (error) {
    console.error('Failed to load Opus configuration:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    throw new Error('Invalid Opus configuration')
  }
}

// Helper to find a project by keywords
export function findProjectByKeywords(
  text: string,
  projects: OpusProject[]
): OpusProject | null {
  const lowercaseText = text.toLowerCase()
  
  // Score each project based on keyword matches
  const projectScores = projects.map(project => {
    let score = 0
    for (const keyword of project.matching_keywords) {
      if (lowercaseText.includes(keyword.toLowerCase())) {
        // Longer keywords get higher scores (more specific)
        score += keyword.length
      }
    }
    return { project, score }
  })
  
  // Sort by score and return the best match
  const sorted = projectScores.sort((a, b) => b.score - a.score)
  
  if (sorted.length > 0 && sorted[0].score > 0) {
    return sorted[0].project
  }
  
  return null
}

// Helper to determine assignee based on routing rules
export function determineAssignee(
  text: string,
  project: OpusProject,
  config: OpusConfig
): string {
  const lowercaseText = text.toLowerCase()
  
  // Check keyword-based routing first
  const keywordRouting = config.smart_routing.keyword_to_assignee
  for (const [keyword, assignee] of Object.entries(keywordRouting)) {
    if (lowercaseText.includes(keyword.toLowerCase())) {
      return assignee as string
    }
  }
  
  // Use project's default assignee if specified
  if (project.default_assignee) {
    return project.default_assignee
  }
  
  // Use category-based default
  const categoryDefault = config.smart_routing.default_assignee_by_category[project.category]
  if (categoryDefault && categoryDefault !== 'department_head') {
    return categoryDefault
  }
  
  // For departments, try to extract from project context
  if (project.category === 'department' && project.rich_context) {
    // This would need to be more sophisticated in practice
    return project.default_assignee || 'adi@opus.com'
  }
  
  return 'adi@opus.com' // Ultimate fallback
}