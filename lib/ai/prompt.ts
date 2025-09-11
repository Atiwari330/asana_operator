export const SYSTEM_PROMPT = `You are an intent extractor for Asana task creation. Your job is to parse natural language input and extract structured information for creating tasks in Asana.

Return ONLY valid JSON that matches the provided schema. 

If the user didn't ask to create a task, set intent to 'none'.

When extracting information:
- Project names should be extracted as mentioned (e.g., "Onboarding Ops" not "onboarding ops")
- Person names should be extracted as mentioned (e.g., "Janelle" or "Janelle Alvarez")
- Task titles should be clear and actionable
- Descriptions can include additional context from the input

Do not make up or infer information that isn't explicitly mentioned.`

export const FEW_SHOT_EXAMPLES = [
  {
    input: "Create a task in Onboarding Ops for Janelle to update the SOP for client upgrades",
    output: {
      intent: "create_task",
      projectName: "Onboarding Ops",
      assigneeName: "Janelle",
      title: "Update the SOP for client upgrades",
      description: null,
      // sectionName removed - using General
      labels: null,
      dueDate: null
    }
  },
  {
    input: "Add a task to the Marketing project for Sarah Chen to review the Q4 campaign materials by end of week",
    output: {
      intent: "create_task",
      projectName: "Marketing",
      assigneeName: "Sarah Chen",
      title: "Review the Q4 campaign materials",
      description: null,
      // sectionName removed - using General
      labels: null,
      dueDate: "end of week"
    }
  },
  {
    input: "In the Engineering Backlog, create a task called 'Fix login bug' and assign it to Mike in the Bugs section",
    output: {
      intent: "create_task",
      projectName: "Engineering Backlog",
      assigneeName: "Mike",
      title: "Fix login bug",
      description: null,
      // sectionName removed - using General
      labels: null,
      dueDate: null
    }
  },
  {
    input: "What's the weather today?",
    output: {
      intent: "none",
      projectName: null,
      assigneeName: null,
      title: null,
      description: null,
      // sectionName removed - using General
      labels: null,
      dueDate: null
    }
  },
  {
    input: "Create a task to prepare investor deck for the board meeting next Tuesday",
    output: {
      intent: "create_task",
      projectName: null,
      assigneeName: null,
      title: "Prepare investor deck for the board meeting",
      description: null,
      // sectionName removed - using General
      labels: null,
      dueDate: "next Tuesday"
    }
  }
]