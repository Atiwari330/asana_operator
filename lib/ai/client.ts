import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { TaskExtractionSchema, type TaskExtraction } from './schema'
import { SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from './prompt'

export class GeminiClient {
  private model: ReturnType<typeof google> | null = null

  private getModel(): ReturnType<typeof google> {
    if (!this.model) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set')
      }
      
      // Using gemini-1.5-flash for fast, cost-effective structured output
      this.model = google('gemini-1.5-flash')
    }
    return this.model
  }

  async extractTaskIntent(text: string): Promise<TaskExtraction> {
    try {
      // Build the prompt with few-shot examples
      const fewShotPrompt = FEW_SHOT_EXAMPLES.map(example => 
        `Input: "${example.input}"\nOutput: ${JSON.stringify(example.output)}`
      ).join('\n\n')

      const fullPrompt = `${SYSTEM_PROMPT}\n\nExamples:\n${fewShotPrompt}\n\nNow extract from this input: "${text}"`

      const { object } = await generateObject({
        model: this.getModel(),
        schema: TaskExtractionSchema,
        prompt: fullPrompt,
        temperature: 0.1, // Low temperature for consistent, deterministic outputs
        maxRetries: 2,
      })

      return object
    } catch (error) {
      console.error('Failed to extract task intent:', error)
      
      // Retry once with stricter prompt if first attempt fails
      try {
        const strictPrompt = `${SYSTEM_PROMPT}\n\nIMPORTANT: You MUST return valid JSON that exactly matches the schema. No additional text or explanation.\n\nExtract from: "${text}"`
        
        const { object } = await generateObject({
          model: this.getModel(),
          schema: TaskExtractionSchema,
          prompt: strictPrompt,
          temperature: 0,
          maxRetries: 1,
        })

        return object
      } catch (retryError) {
        console.error('Retry failed:', retryError)
        // Return a safe default
        return {
          intent: 'none',
          projectName: null,
          assigneeName: null,
          title: null,
          description: null,
          sectionName: null,
          labels: null,
          dueDate: null,
        }
      }
    }
  }
}

// Export singleton instance getter
let geminiClientInstance: GeminiClient | null = null

export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient()
  }
  return geminiClientInstance
}