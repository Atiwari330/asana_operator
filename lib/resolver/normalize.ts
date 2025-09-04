/**
 * Normalize a string for matching:
 * - Convert to lowercase
 * - Remove punctuation
 * - Collapse multiple spaces
 * - Trim whitespace
 */
export function normalize(str: string): string {
  if (!str) return ''
  
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
}

/**
 * Check if two normalized strings match exactly
 */
export function exactMatch(str1: string, str2: string): boolean {
  return normalize(str1) === normalize(str2)
}

/**
 * Calculate a simple similarity score between two strings
 * Returns a value between 0 and 1
 */
export function similarityScore(str1: string, str2: string): number {
  const norm1 = normalize(str1)
  const norm2 = normalize(str2)
  
  if (norm1 === norm2) return 1
  
  // Check if one string contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLength = Math.min(norm1.length, norm2.length)
    const maxLength = Math.max(norm1.length, norm2.length)
    return minLength / maxLength
  }
  
  // Simple word overlap score
  const words1 = new Set(norm1.split(' '))
  const words2 = new Set(norm2.split(' '))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}