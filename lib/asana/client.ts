export interface AsanaTask {
  name: string
  notes?: string
  projects: string[]
  assignee?: string
  memberships?: Array<{
    project: string
    section?: string
  }>
}

export interface AsanaProject {
  gid: string
  name: string
  workspace: {
    gid: string
    name: string
  }
}

export interface AsanaUser {
  gid: string
  name: string
  email?: string
}

export interface AsanaSection {
  gid: string
  name: string
  project: {
    gid: string
  }
}

export class AsanaClient {
  private baseUrl = 'https://app.asana.com/api/1.0'
  private headers: HeadersInit

  constructor(personalAccessToken?: string) {
    const pat = personalAccessToken || process.env.ASANA_PAT
    if (!pat) {
      throw new Error('ASANA_PAT is not set')
    }

    this.headers = {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    }
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Asana API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.data as T
  }

  async createTask({
    name,
    notes,
    projectId,
    assigneeId,
    sectionId,
  }: {
    name: string
    notes?: string
    projectId: string
    assigneeId?: string
    sectionId?: string
  }): Promise<{ gid: string; permalink_url: string }> {
    const taskData: AsanaTask = {
      name,
      notes,
      projects: [projectId],
    }

    if (assigneeId) {
      taskData.assignee = assigneeId
    }

    if (sectionId) {
      taskData.memberships = [{
        project: projectId,
        section: sectionId,
      }]
    }

    const task = await this.fetch<{ gid: string; permalink_url: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ data: taskData }),
    })

    return task
  }

  async listProjects(workspaceId?: string): Promise<AsanaProject[]> {
    // If no workspace ID provided, get the first workspace
    if (!workspaceId) {
      const workspaces = await this.fetch<Array<{ gid: string }>>('/workspaces')
      if (workspaces.length === 0) {
        throw new Error('No workspaces found')
      }
      workspaceId = workspaces[0].gid
    }

    const projects = await this.fetch<AsanaProject[]>(
      `/workspaces/${workspaceId}/projects?opt_fields=name,workspace.name`
    )
    return projects
  }

  async listUsers(workspaceId?: string): Promise<AsanaUser[]> {
    // If no workspace ID provided, get the first workspace
    if (!workspaceId) {
      const workspaces = await this.fetch<Array<{ gid: string }>>('/workspaces')
      if (workspaces.length === 0) {
        throw new Error('No workspaces found')
      }
      workspaceId = workspaces[0].gid
    }

    const users = await this.fetch<AsanaUser[]>(
      `/workspaces/${workspaceId}/users?opt_fields=name,email`
    )
    return users
  }

  async listSections(projectId: string): Promise<AsanaSection[]> {
    const sections = await this.fetch<AsanaSection[]>(
      `/projects/${projectId}/sections?opt_fields=name,project`
    )
    return sections
  }

  async getWorkspaces(): Promise<Array<{ gid: string; name: string }>> {
    return await this.fetch<Array<{ gid: string; name: string }>>('/workspaces')
  }
}

// Export singleton instance for convenience
let asanaClientInstance: AsanaClient | null = null

export function getAsanaClient(): AsanaClient {
  if (!asanaClientInstance) {
    asanaClientInstance = new AsanaClient()
  }
  return asanaClientInstance
}