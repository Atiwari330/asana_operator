import { pgTable, text, timestamp, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'

// Projects table - stores Asana project metadata with Opus context
export const projects = pgTable('projects', {
  id: text('id').primaryKey(), // Asana project gid
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  workspaceId: text('workspace_id'),
  category: text('category'), // department, prospect, customer, strategic
  richContext: jsonb('rich_context'), // Detailed project context for AI
  matchingKeywords: jsonb('matching_keywords'), // Keywords for project matching
  defaultAssignee: text('default_assignee'), // Default person to assign tasks to
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  normalizedNameIdx: index('projects_normalized_name_idx').on(table.normalizedName),
  categoryIdx: index('projects_category_idx').on(table.category),
}))

// Users table - stores Asana user metadata
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Asana user gid
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  email: text('email'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  normalizedNameIdx: index('users_normalized_name_idx').on(table.normalizedName),
  emailIdx: index('users_email_idx').on(table.email),
}))

// Sections table - stores Asana section metadata
export const sections = pgTable('sections', {
  id: text('id').primaryKey(), // Asana section gid
  projectId: text('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  normalizedNameIdx: index('sections_normalized_name_idx').on(table.normalizedName),
  projectIdIdx: index('sections_project_id_idx').on(table.projectId),
}))

// Recent operations table - for idempotency and diagnostics
export const recentOps = pgTable('recent_ops', {
  opHash: text('op_hash').primaryKey(), // hash of [project_id, assignee_id, title] + time bucket
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})