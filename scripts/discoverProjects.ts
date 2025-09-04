#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import { AsanaClient } from '../lib/asana/client'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ProjectInfo {
  gid: string
  name: string
  workspace: {
    gid: string
    name: string
  }
}

async function discoverProjects() {
  console.log('🔍 Discovering all Asana projects...\n')

  try {
    const client = new AsanaClient()
    
    // Get all workspaces
    const workspaces = await client.getWorkspaces()
    console.log(`Found ${workspaces.length} workspace(s)\n`)

    const allProjects: ProjectInfo[] = []

    for (const workspace of workspaces) {
      console.log(`📁 Workspace: ${workspace.name} (${workspace.gid})`)
      console.log('─'.repeat(50))

      // Get projects in this workspace
      const projects = await client.listProjects(workspace.gid)
      
      for (const project of projects) {
        allProjects.push({
          gid: project.gid,
          name: project.name,
          workspace: project.workspace,
        })
        
        // Determine suggested category based on name
        let suggestedCategory = 'unknown'
        const nameLower = project.name.toLowerCase()
        
        if (nameLower.includes('onboarding') || nameLower.includes('implementation')) {
          suggestedCategory = 'department (onboarding)'
        } else if (nameLower.includes('engineering') || nameLower.includes('dev') || nameLower.includes('tech')) {
          suggestedCategory = 'department (engineering)'
        } else if (nameLower.includes('support') || nameLower.includes('help')) {
          suggestedCategory = 'department (support)'
        } else if (nameLower.includes('sales') || nameLower.includes('deal')) {
          suggestedCategory = 'department (sales)'
        } else if (nameLower.includes('marketing') || nameLower.includes('campaign')) {
          suggestedCategory = 'department (marketing)'
        } else if (nameLower.includes('customer') || nameLower.includes('client')) {
          suggestedCategory = 'customer'
        } else if (nameLower.includes('prospect') || nameLower.includes('lead')) {
          suggestedCategory = 'prospect'
        } else if (nameLower.includes('project') || nameLower.includes('initiative')) {
          suggestedCategory = 'strategic'
        }

        console.log(`  📋 ${project.name}`)
        console.log(`     ID: ${project.gid}`)
        console.log(`     Suggested category: ${suggestedCategory}`)
        console.log()
      }
      
      console.log(`  Total projects in workspace: ${projects.length}\n`)
    }

    // Save to file for reference
    const outputPath = path.join(process.cwd(), 'discovered-projects.json')
    fs.writeFileSync(
      outputPath,
      JSON.stringify(allProjects, null, 2)
    )
    
    console.log('─'.repeat(50))
    console.log(`\n✅ Discovery complete!`)
    console.log(`📄 Full project list saved to: ${outputPath}`)
    console.log(`\nTotal projects found: ${allProjects.length}`)
    
    console.log('\n📝 Next steps:')
    console.log('1. Review discovered-projects.json')
    console.log('2. Update opus-config.json with the projects you want to track')
    console.log('3. Add the Asana project IDs (gid) to each project in the config')
    console.log('4. Define rich context for each project')
    console.log('5. Run "npm run sync:opus" to sync selected projects')

  } catch (error) {
    console.error('❌ Discovery failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Run if called directly
if (require.main === module) {
  discoverProjects()
}