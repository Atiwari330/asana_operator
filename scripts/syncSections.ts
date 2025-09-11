#!/usr/bin/env node

import dotenv from 'dotenv'
import * as pathModule from 'path'

// Load .env.local file
dotenv.config({ path: pathModule.resolve(process.cwd(), '.env.local') })

import { getAsanaClient } from '../lib/asana/client'
import { db } from '../lib/db/drizzle'
import { sections, projects } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { loadOpusConfig } from '../lib/config/opus-config'

interface StandardSection {
  name: string
  keywords: string[]
}

// Standard sections for prospect projects
const STANDARD_SECTIONS: StandardSection[] = [
  { name: '📞 Initial Outreach', keywords: ['intro', 'reach out', 'contact', 'initial'] },
  { name: '🔍 Discovery', keywords: ['discovery', 'learn', 'understand', 'research'] },
  { name: '🎬 Demo/Presentation', keywords: ['demo', 'presentation', 'show', 'demonstrate'] },
  { name: '📝 Proposal', keywords: ['proposal', 'quote', 'pricing', 'contract'] },
  { name: '🤝 Negotiation', keywords: ['negotiate', 'terms', 'agreement', 'discussion'] },
  { name: '⏰ Follow-up', keywords: ['follow up', 'check in', 'follow', 'reminder'] },
  { name: '📅 Meeting Notes', keywords: ['meeting', 'notes', 'discussion', 'call'] },
  { name: '🧭 Strategy', keywords: ['strategy', 'plan', 'approach', 'intelligence'] },
  { name: '✅ Closed Won', keywords: ['won', 'success', 'closed won', 'signed'] },
  { name: '❌ Closed Lost', keywords: ['lost', 'declined', 'closed lost', 'no go'] }
]

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')
const isVerbose = args.includes('--verbose') || isDryRun

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n')
}

if (isForce) {
  console.log('⚠️  FORCE MODE - Will recreate all sections\n')
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
}

async function syncSectionsForProject(
  asanaClient: any,
  projectId: string,
  projectName: string
): Promise<void> {
  try {
    console.log(`\n📋 Processing project: ${projectName} (${projectId})`)
    
    // Fetch existing sections from Asana
    const existingSections = await asanaClient.listSections(projectId)
    
    if (isVerbose) {
      console.log(`  Found ${existingSections.length} existing sections:`)
      existingSections.forEach((section: any) => {
        console.log(`    - ${section.name} (${section.gid})`)
      })
    }
    
    const existingSectionNames = existingSections.map((s: any) => s.name.toLowerCase())
    
    // Track what we'll do
    const toCreate: string[] = []
    const toCache: Array<{ name: string; gid: string }> = []
    
    // Check each standard section
    for (const standardSection of STANDARD_SECTIONS) {
      const exists = existingSectionNames.includes(standardSection.name.toLowerCase())
      
      if (exists && !isForce) {
        // Section exists - just cache it
        const existingSection = existingSections.find(
          (s: any) => s.name.toLowerCase() === standardSection.name.toLowerCase()
        )
        if (existingSection) {
          toCache.push({ name: standardSection.name, gid: existingSection.gid })
          if (isVerbose) {
            console.log(`  ✓ Section exists: ${standardSection.name}`)
          }
        }
      } else if (!exists || isForce) {
        // Section missing or force mode - mark for creation
        toCreate.push(standardSection.name)
        if (isVerbose) {
          console.log(`  + Will create: ${standardSection.name}`)
        }
      }
    }
    
    // Create missing sections (if not dry run)
    const createdSections: Array<{ name: string; gid: string }> = []
    
    if (toCreate.length > 0 && !isDryRun) {
      console.log(`  Creating ${toCreate.length} new sections...`)
      
      for (const sectionName of toCreate) {
        try {
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
            throw new Error(`Failed to create section: ${response.statusText}`)
          }
          
          const result = await response.json()
          createdSections.push({ name: sectionName, gid: result.data.gid })
          console.log(`    ✅ Created: ${sectionName} (${result.data.gid})`)
          
          // Rate limiting - be nice to the API
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`    ❌ Failed to create section ${sectionName}:`, error)
        }
      }
    }
    
    // Update database cache (if not dry run)
    const allSectionsToCache = [...toCache, ...createdSections]
    
    if (allSectionsToCache.length > 0 && !isDryRun) {
      console.log(`  Updating database cache with ${allSectionsToCache.length} sections...`)
      
      for (const section of allSectionsToCache) {
        const normalizedName = await normalizeString(section.name)
        
        await db.insert(sections).values({
          id: section.gid,
          projectId: projectId,
          name: section.name,
          normalizedName: normalizedName,
          updatedAt: new Date()
        }).onConflictDoUpdate({
          target: sections.id,
          set: {
            name: section.name,
            normalizedName: normalizedName,
            updatedAt: new Date()
          }
        })
        
        if (isVerbose) {
          console.log(`    💾 Cached: ${section.name}`)
        }
      }
    }
    
    // Summary
    if (isDryRun) {
      console.log(`\n  📊 DRY RUN Summary for ${projectName}:`)
      console.log(`     Would create: ${toCreate.length} sections`)
      console.log(`     Would cache: ${allSectionsToCache.length} sections`)
    } else {
      console.log(`\n  ✅ Completed ${projectName}:`)
      console.log(`     Created: ${createdSections.length} sections`)
      console.log(`     Cached: ${allSectionsToCache.length} sections`)
    }
    
  } catch (error) {
    console.error(`\n❌ Error processing ${projectName}:`, error)
  }
}

async function main() {
  try {
    console.log('🚀 Starting Asana Sections Sync\n')
    
    // Load configuration
    const opusConfig = await loadOpusConfig()
    const prospectProjects = opusConfig.projects.filter(p => p.category === 'prospect')
    
    console.log(`Found ${prospectProjects.length} prospect projects to process`)
    
    // Initialize Asana client
    const asanaClient = getAsanaClient()
    
    // Process each project
    for (const project of prospectProjects) {
      await syncSectionsForProject(asanaClient, project.asana_id, project.name)
      
      // Rate limiting between projects
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log('\n✨ Sections sync complete!')
    
    if (isDryRun) {
      console.log('\n💡 This was a dry run. To apply changes, run without --dry-run flag')
    }
    
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { syncSectionsForProject, STANDARD_SECTIONS }