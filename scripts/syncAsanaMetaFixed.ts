#!/usr/bin/env tsx

// IMPORTANT: Load environment variables FIRST before any imports that use them
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// NOW import modules that use environment variables
import { AsanaClient } from '../lib/asana/client'
import { db } from '../lib/db/drizzle'
import { projects, users, sections } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

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

      for (const project of asanaProjects) {
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

        // Sync sections for each project
        try {
          const asanaSections = await client.listSections(project.gid)
          if (asanaSections.length > 0) {
            console.log(`    Syncing ${asanaSections.length} sections for project ${project.name}`)

            for (const section of asanaSections) {
              await db
                .insert(sections)
                .values({
                  id: section.gid,
                  projectId: section.project.gid,
                  name: section.name,
                  normalizedName: normalize(section.name),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: sections.id,
                  set: {
                    projectId: section.project.gid,
                    name: section.name,
                    normalizedName: normalize(section.name),
                    updatedAt: new Date(),
                  },
                })
            }
          }
        } catch (error) {
          console.error(`    Failed to sync sections for project ${project.name}:`, error)
        }
      }

      // Sync users
      console.log('  Fetching users...')
      const asanaUsers = await client.listUsers(workspace.gid)
      console.log(`  Found ${asanaUsers.length} users`)

      for (const user of asanaUsers) {
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
      }
    }

    console.log('\n✅ Asana metadata sync completed successfully!')
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

syncAsanaMetadata()