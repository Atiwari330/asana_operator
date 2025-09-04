import { db } from '../db/drizzle'
import { projects, users, sections } from '../db/schema'
import { eq, and, or, like } from 'drizzle-orm'
import { normalize, exactMatch, similarityScore } from './normalize'
import Fuse from 'fuse.js'

export interface MatchResult<T> {
  id?: string
  candidates?: T[]
}

export interface ProjectCandidate {
  id: string
  name: string
}

export interface UserCandidate {
  id: string
  name: string
  email?: string | null
}

export interface SectionCandidate {
  id: string
  name: string
}

/**
 * Find a project ID by name
 * Returns exact ID if single match, or candidates if ambiguous
 */
export async function findProjectIdByName(name: string): Promise<MatchResult<ProjectCandidate>> {
  console.log('\n🔍 Project Matcher: Finding project by name:', name)
  
  if (!name) {
    console.log('⚠️ Project Matcher: No name provided')
    return {}
  }

  const normalizedName = normalize(name)
  console.log('  Normalized name:', normalizedName)
  
  // First, try exact match on normalized name
  const exactMatches = await db
    .select({
      id: projects.id,
      name: projects.name,
    })
    .from(projects)
    .where(eq(projects.normalizedName, normalizedName))

  console.log('  Exact matches found:', exactMatches.length)
  
  if (exactMatches.length === 1) {
    console.log('✅ Project Matcher: Single exact match:', exactMatches[0].name)
    return { id: exactMatches[0].id }
  }

  if (exactMatches.length > 1) {
    console.log('⚠️ Project Matcher: Multiple exact matches:', exactMatches.map(m => m.name).join(', '))
    return { candidates: exactMatches }
  }

  // If no exact match, use fuzzy search
  console.log('  No exact match, trying fuzzy search...')
  
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      normalizedName: projects.normalizedName,
    })
    .from(projects)

  console.log('  Total projects in database:', allProjects.length)

  // Use Fuse.js for fuzzy matching
  const fuse = new Fuse(allProjects, {
    keys: ['name', 'normalizedName'],
    threshold: 0.3, // Lower is more strict
    includeScore: true,
  })

  const results = fuse.search(name)
  
  console.log('  Fuzzy search results:', results.length)
  if (results.length > 0) {
    console.log('  Top matches:')
    results.slice(0, 3).forEach(r => {
      console.log(`    - ${r.item.name} (score: ${r.score?.toFixed(3)})`)
    })
  }
  
  if (results.length === 0) {
    console.log('❌ Project Matcher: No fuzzy matches found')
    return {}
  }

  // If we have a single high-confidence match, return it
  if (results.length === 1 && results[0].score && results[0].score < 0.1) {
    console.log('✅ Project Matcher: High-confidence fuzzy match:', results[0].item.name)
    return { id: results[0].item.id }
  }

  // Return top candidates (max 5)
  const topCandidates = results
    .slice(0, 5)
    .map(r => ({
      id: r.item.id,
      name: r.item.name,
    }))

  console.log('⚠️ Project Matcher: Returning candidates:', topCandidates.map(c => c.name).join(', '))
  
  return { candidates: topCandidates }
}

/**
 * Find a user ID by name or email
 * Returns exact ID if single match, or candidates if ambiguous
 */
export async function findUserIdByName(name: string): Promise<MatchResult<UserCandidate>> {
  if (!name) {
    return {}
  }

  const normalizedName = normalize(name)
  
  // Check if it looks like an email
  const isEmail = name.includes('@')
  
  if (isEmail) {
    // Try exact email match
    const emailMatches = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, name.toLowerCase()))

    if (emailMatches.length === 1) {
      return { id: emailMatches[0].id }
    }

    if (emailMatches.length > 1) {
      return { candidates: emailMatches }
    }
  }

  // Try exact match on normalized name
  const exactMatches = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.normalizedName, normalizedName))

  if (exactMatches.length === 1) {
    return { id: exactMatches[0].id }
  }

  if (exactMatches.length > 1) {
    return { candidates: exactMatches }
  }

  // If no exact match, use fuzzy search
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      normalizedName: users.normalizedName,
    })
    .from(users)

  // Use Fuse.js for fuzzy matching
  const fuse = new Fuse(allUsers, {
    keys: ['name', 'normalizedName', 'email'],
    threshold: 0.3,
    includeScore: true,
  })

  const results = fuse.search(name)
  
  if (results.length === 0) {
    return {}
  }

  // If we have a single high-confidence match, return it
  if (results.length === 1 && results[0].score && results[0].score < 0.1) {
    return { id: results[0].item.id }
  }

  // Return top candidates (max 5)
  const topCandidates = results
    .slice(0, 5)
    .map(r => ({
      id: r.item.id,
      name: r.item.name,
      email: r.item.email,
    }))

  return { candidates: topCandidates }
}

/**
 * Find a section ID by name within a specific project
 * Returns exact ID if single match, or candidates if ambiguous
 */
export async function findSectionIdByName(
  projectId: string, 
  name: string
): Promise<MatchResult<SectionCandidate>> {
  if (!name || !projectId) {
    return {}
  }

  const normalizedName = normalize(name)
  
  // First, try exact match on normalized name
  const exactMatches = await db
    .select({
      id: sections.id,
      name: sections.name,
    })
    .from(sections)
    .where(
      and(
        eq(sections.projectId, projectId),
        eq(sections.normalizedName, normalizedName)
      )
    )

  if (exactMatches.length === 1) {
    return { id: exactMatches[0].id }
  }

  if (exactMatches.length > 1) {
    return { candidates: exactMatches }
  }

  // If no exact match, get all sections for the project and use fuzzy search
  const projectSections = await db
    .select({
      id: sections.id,
      name: sections.name,
      normalizedName: sections.normalizedName,
    })
    .from(sections)
    .where(eq(sections.projectId, projectId))

  if (projectSections.length === 0) {
    return {}
  }

  // Use Fuse.js for fuzzy matching
  const fuse = new Fuse(projectSections, {
    keys: ['name', 'normalizedName'],
    threshold: 0.3,
    includeScore: true,
  })

  const results = fuse.search(name)
  
  if (results.length === 0) {
    return {}
  }

  // If we have a single high-confidence match, return it
  if (results.length === 1 && results[0].score && results[0].score < 0.1) {
    return { id: results[0].item.id }
  }

  // Return top candidates (max 5)
  const topCandidates = results
    .slice(0, 5)
    .map(r => ({
      id: r.item.id,
      name: r.item.name,
    }))

  return { candidates: topCandidates }
}