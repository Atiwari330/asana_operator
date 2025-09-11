import { getAsanaClient } from '../asana/client'
import { db } from '../db/drizzle'
import { sections } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export async function getSectionId(projectId: string, sectionName: string | null): Promise<string | null> {
  if (!sectionName) return null
  
  try {
    // First check database cache
    const cachedSection = await db
      .select()
      .from(sections)
      .where(and(
        eq(sections.projectId, projectId),
        eq(sections.name, sectionName)
      ))
      .limit(1)
    
    if (cachedSection.length > 0) {
      return cachedSection[0].id
    }
    
    // Not in cache, check Asana
    const asanaClient = getAsanaClient()
    const asanaSections = await asanaClient.listSections(projectId)
    
    const matchingSection = asanaSections.find((s: any) => s.name === sectionName)
    
    if (matchingSection) {
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
    
    // Section doesn't exist, skip creation (feature disabled)
    console.log(`Section not found: ${sectionName} - creation disabled, using default`)
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
          data: { name: sectionName }
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
          name: sectionName,
          normalizedName: sectionName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
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