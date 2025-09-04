#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import { AsanaClient } from '../lib/asana/client'
import { db } from '../lib/db/drizzle'
import { projects, users } from '../lib/db/schema'
import { sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'
import type { OpusConfig } from '../lib/config/opus-config'

// Load environment variables
dotenv.config({ path: '.env.local' })

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}

async function syncOpusProjects() {
  console.log('🚀 Starting Opus-specific project sync...\n')

  try {
    // Load Opus configuration
    const configPath = path.join(process.cwd(), 'opus-config.json')
    if (!fs.existsSync(configPath)) {
      console.error('❌ opus-config.json not found!')
      console.log('Please create opus-config.json with your project configuration')
      process.exit(1)
    }

    const opusConfig: OpusConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    console.log(`📋 Loaded configuration with ${opusConfig.projects.length} projects\n`)

    const client = new AsanaClient()

    // Process each configured project
    for (const projectConfig of opusConfig.projects) {
      if (projectConfig.asana_id.startsWith('PLACEHOLDER')) {
        console.log(`⚠️  Skipping ${projectConfig.name} - placeholder ID`)
        console.log(`   Run "npm run discover:projects" to find the actual Asana ID`)
        continue
      }

      console.log(`📁 Syncing project: ${projectConfig.name}`)
      
      try {
        // Upsert project with enhanced metadata
        await db
          .insert(projects)
          .values({
            id: projectConfig.asana_id,
            name: projectConfig.name,
            normalizedName: normalize(projectConfig.name),
            category: projectConfig.category,
            richContext: projectConfig.rich_context,
            matchingKeywords: projectConfig.matching_keywords,
            defaultAssignee: projectConfig.default_assignee,
            workspaceId: null, // Will be updated if we fetch from Asana
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: projects.id,
            set: {
              name: projectConfig.name,
              normalizedName: normalize(projectConfig.name),
              category: projectConfig.category,
              richContext: projectConfig.rich_context,
              matchingKeywords: projectConfig.matching_keywords,
              defaultAssignee: projectConfig.default_assignee,
              updatedAt: new Date(),
            },
          })

        console.log(`   ✅ Synced with category: ${projectConfig.category}`)
      } catch (error) {
        console.error(`   ❌ Failed to sync: ${error}`)
      }
    }

    // Sync team members from configuration
    console.log('\n👥 Syncing team members...')
    
    const teamMembers = [
      { email: 'gabriel@opus.com', name: 'Gabriel', role: 'Deal Assistant' },
      { email: 'janelle@opus.com', name: 'Janelle', role: 'Head of Onboarding' },
      { email: 'hector@opus.com', name: 'Hector', role: 'Head of Engineering' },
      { email: 'rodrigo@opus.com', name: 'Rodrigo', role: 'Head of Support' },
      { email: 'shawn@opus.com', name: 'Shawn', role: 'Head of Marketing' },
      { email: 'humberto@opus.com', name: 'Humberto', role: 'CEO' },
      { email: 'adi@opus.com', name: 'Adi', role: 'Operations & Sales Leader' },
      { email: 'john@opus.com', name: 'John', role: 'Support Team' },
      { email: 'nick@opus.com', name: 'Nick', role: 'CRM Specialist' },
      { email: 'esha@opus.com', name: 'Esha', role: 'CRM Specialist' },
      { email: 'nicole@opus.com', name: 'Nicole', role: 'DoseSpot Specialist' },
      { email: 'arun@opus.com', name: 'Arun', role: 'RCM Specialist' },
    ]

    for (const member of teamMembers) {
      // Generate a pseudo-ID based on email (since we don't have real Asana IDs yet)
      const pseudoId = `opus_${member.email.split('@')[0]}`
      
      await db
        .insert(users)
        .values({
          id: pseudoId,
          name: member.name,
          normalizedName: normalize(member.name),
          email: member.email,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            name: member.name,
            normalizedName: normalize(member.name),
            email: member.email,
            updatedAt: new Date(),
          },
        })
    }

    console.log(`   ✅ Synced ${teamMembers.length} team members`)

    // Show summary
    console.log('\n📊 Sync Summary:')
    const projectCount = await db.select({ count: sql<number>`count(*)` }).from(projects)
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users)
    
    console.log(`   Projects in database: ${projectCount[0].count}`)
    console.log(`   Users in database: ${userCount[0].count}`)
    
    console.log('\n✅ Opus sync completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Update any PLACEHOLDER project IDs in opus-config.json')
    console.log('2. Run "npm run dev" to start the application')
    console.log('3. Test task creation with natural language')

  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Run if called directly
if (require.main === module) {
  syncOpusProjects()
}