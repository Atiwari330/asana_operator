#!/usr/bin/env tsx

// Load environment variables FIRST
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Create database connection AFTER environment is loaded
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { AsanaClient } from '../lib/asana/client'
import { projects, users, sections } from '../lib/db/schema'

// Create connection with loaded environment
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || ''
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables!')
  process.exit(1)
}

console.log('📊 Using database connection...')
const queryClient = postgres(connectionString)
const db = drizzle(queryClient)

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}

async function syncAsanaMetadata() {
  try {
    console.log('Starting Asana metadata sync...')

    const client = new AsanaClient()

    // Get workspaces
    const workspaces = await client.getWorkspaces()
    console.log(`Found ${workspaces.length} workspace(s)`)

    for (const workspace of workspaces) {
      console.log(`\nSyncing workspace: ${workspace.name} (${workspace.gid})`)

      // Sync projects
      console.log('  Fetching projects...')
      const asanaProjects = await client.listProjects(workspace.gid)
      console.log(`  Found ${asanaProjects.length} projects`)

      let projectCount = 0
      for (const project of asanaProjects) {
        try {
          await db
            .insert(projects)
            .values({
              id: project.gid,
              name: project.name,
              normalizedName: normalize(project.name),
              workspaceId: project.workspace.gid,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: projects.id,
              set: {
                name: project.name,
                normalizedName: normalize(project.name),
                workspaceId: project.workspace.gid,
                updatedAt: new Date(),
              },
            })
          projectCount++
          if (projectCount % 10 === 0) {
            console.log(`    Synced ${projectCount} projects...`)
          }
        } catch (error) {
          console.error(`    Failed to sync project ${project.name}:`, error)
        }
      }
      console.log(`  ✅ Synced ${projectCount} projects`)

      // Sync users
      console.log('  Fetching users...')
      const asanaUsers = await client.listUsers(workspace.gid)
      console.log(`  Found ${asanaUsers.length} users`)

      let userCount = 0
      for (const user of asanaUsers) {
        try {
          await db
            .insert(users)
            .values({
              id: user.gid,
              name: user.name,
              normalizedName: normalize(user.name),
              email: user.email || null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                name: user.name,
                normalizedName: normalize(user.name),
                email: user.email || null,
                updatedAt: new Date(),
              },
            })
          userCount++
        } catch (error) {
          console.error(`    Failed to sync user ${user.name}:`, error)
        }
      }
      console.log(`  ✅ Synced ${userCount} users`)
    }

    console.log('\n✅ Asana metadata sync completed successfully!')

    // Close the connection
    await queryClient.end()
  } catch (error) {
    console.error('Sync failed:', error)
    process.exit(1)
  }
}

syncAsanaMetadata()