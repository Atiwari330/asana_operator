import { getAsanaClient } from '../asana/client'
import { db } from '../db/drizzle'
import { sections } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export async function getSectionId(projectId: string, sectionName: string | null = null): Promise<string | null> {
  // ALWAYS use "General" section regardless of what was requested
  const STANDARD_SECTION = "General"
  
  try {
    // First check database cache for "General" section
    const cachedSection = await db
      .select()
      .from(sections)
      .where(and(
        eq(sections.projectId, projectId),
        eq(sections.name, STANDARD_SECTION)
      ))
      .limit(1)
    
    if (cachedSection.length > 0) {
      console.log(`✅ Found cached General section for project ${projectId}`)
      return cachedSection[0].id
    }
    
    // Not in cache, check Asana for "General" section
    const asanaClient = getAsanaClient()
    const asanaSections = await asanaClient.listSections(projectId)
    
    const matchingSection = asanaSections.find((s: any) => s.name === STANDARD_SECTION)
    
    if (matchingSection) {
      console.log(`✅ Found General section in Asana for project ${projectId}`)
      // Cache it for next time
      try {
        await db.insert(sections).values({
          id: matchingSection.gid,
          projectId: projectId,
          name: matchingSection.name,
          normalizedName: matchingSection.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          updatedAt: new Date()
        }).onConflictDoNothing()
      } catch (dbError) {
        console.error('Error caching section:', dbError)
      }
      
      return matchingSection.gid
    }
    
    // General section doesn't exist, skip creation (feature disabled)
    console.log(`⚠️ General section not found for project ${projectId} - creation disabled, task will use default`)
    return null
    
    // DISABLED: Section creation code preserved below for future re-enabling
    const response = await fetch(
      `https://app.asana.com/api/1.0/projects/${projectId}/sections`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ASANA_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: STANDARD_SECTION } // Always "General"
        })
      }
    )
    
    if (response.ok) {
      const result = await response.json()
      const newSectionId = result.data.gid
      
      // Cache the new section
      try {
        await db.insert(sections).values({
          id: newSectionId,
          projectId: projectId,
          name: STANDARD_SECTION, // Always "General"
          normalizedName: STANDARD_SECTION.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          updatedAt: new Date()
        }).onConflictDoNothing()
      } catch (dbError) {
        console.error('Error caching new section:', dbError)
      }
      
      return newSectionId
    }
    
    console.error('Failed to create section:', await response.text())
    return null
    
  } catch (error) {
    console.error('Error getting section ID:', error)
    return null
  }
}