import * as z from 'zod'

export const TaskExtractionSchema = z.object({
  intent: z.enum(['create_task', 'none']).describe('Whether the user wants to create a task or not'),
  projectName: z.string().nullable().optional().describe('The name of the Asana project'),
  assigneeName: z.string().nullable().optional().describe('The name of the person to assign the task to'),
  title: z.string().nullable().optional().describe('The title/name of the task'),
  description: z.string().nullable().optional().describe('Additional details or description for the task'),
  sectionName: z.string().nullable().optional().describe('The name of the section within the project'),
  labels: z.array(z.string()).nullable().optional().describe('Tags or labels for the task'),
  dueDate: z.string().nullable().optional().describe('Due date in ISO format or natural language'),
})

export type TaskExtraction = z.infer<typeof TaskExtractionSchema>