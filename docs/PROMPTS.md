# LLM Prompts and Schema

## System Prompt

The system prompt instructs Gemini to extract structured task information from natural language:

```
You are an intent extractor for Asana task creation. Your job is to parse natural language input and extract structured information for creating tasks in Asana.

Return ONLY valid JSON that matches the provided schema. 

If the user didn't ask to create a task, set intent to 'none'.

When extracting information:
- Project names should be extracted as mentioned (e.g., "Onboarding Ops" not "onboarding ops")
- Person names should be extracted as mentioned (e.g., "Janelle" or "Janelle Alvarez")
- Task titles should be clear and actionable
- Descriptions can include additional context from the input

Do not make up or infer information that isn't explicitly mentioned.
```

## JSON Schema (Zod)

```typescript
{
  intent: "create_task" | "none",
  projectName?: string | null,
  assigneeName?: string | null,
  title?: string | null,
  description?: string | null,
  sectionName?: string | null,
  labels?: string[] | null,
  dueDate?: string | null
}
```

## Few-Shot Examples

### Example 1: Complete Task Request
**Input**: "Create a task in Onboarding Ops for Janelle to update the SOP for client upgrades"

**Output**:
```json
{
  "intent": "create_task",
  "projectName": "Onboarding Ops",
  "assigneeName": "Janelle",
  "title": "Update the SOP for client upgrades",
  "description": null,
  "sectionName": null,
  "labels": null,
  "dueDate": null
}
```

### Example 2: Task with Due Date
**Input**: "Add a task to the Marketing project for Sarah Chen to review the Q4 campaign materials by end of week"

**Output**:
```json
{
  "intent": "create_task",
  "projectName": "Marketing",
  "assigneeName": "Sarah Chen",
  "title": "Review the Q4 campaign materials",
  "description": null,
  "sectionName": null,
  "labels": null,
  "dueDate": "end of week"
}
```

### Example 3: Task with Section
**Input**: "In the Engineering Backlog, create a task called 'Fix login bug' and assign it to Mike in the Bugs section"

**Output**:
```json
{
  "intent": "create_task",
  "projectName": "Engineering Backlog",
  "assigneeName": "Mike",
  "title": "Fix login bug",
  "description": null,
  "sectionName": "Bugs",
  "labels": null,
  "dueDate": null
}
```

### Example 4: Non-Task Input
**Input**: "What's the weather today?"

**Output**:
```json
{
  "intent": "none",
  "projectName": null,
  "assigneeName": null,
  "title": null,
  "description": null,
  "sectionName": null,
  "labels": null,
  "dueDate": null
}
```

### Example 5: Minimal Task
**Input**: "Create a task to prepare investor deck for the board meeting next Tuesday"

**Output**:
```json
{
  "intent": "create_task",
  "projectName": null,
  "assigneeName": null,
  "title": "Prepare investor deck for the board meeting",
  "description": null,
  "sectionName": null,
  "labels": null,
  "dueDate": "next Tuesday"
}
```

## Model Configuration

- **Model**: Gemini 1.5 Flash
- **Temperature**: 0.1 (for consistency)
- **Max Retries**: 2
- **Validation**: Strict Zod schema enforcement

## Error Handling

1. **Primary Attempt**: Use full prompt with examples
2. **Retry on Failure**: Stricter prompt, temperature 0
3. **Fallback**: Return `intent: "none"` if parsing fails

## Prompt Engineering Tips

### For Better Extraction:
- Include diverse examples covering edge cases
- Use exact casing in examples (matches real usage)
- Show both positive and negative cases
- Keep system prompt concise and clear

### Common Issues and Solutions:
- **Over-inference**: Explicitly state "Do not make up information"
- **Case sensitivity**: Show examples with proper casing
- **Missing fields**: Use nullable fields in schema
- **Ambiguous input**: Return `intent: "none"` rather than guess

## Testing Prompts

Test these inputs to verify extraction quality:

1. "Schedule a meeting with the team" → Should return `intent: "none"` (not a task)
2. "Task for john: fix the homepage" → Should extract "john" as assignee
3. "Add to Sprint 23: implement auth" → Should extract "Sprint 23" as project
4. "Urgent: Review PR #123 @alice" → Should extract "alice" as assignee
5. "Create task" → Should return minimal valid structure