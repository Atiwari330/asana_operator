import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// TODO: Add your Supabase connection URL
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || ''

if (!connectionString) {
  console.warn('Database connection string not found. Please set DATABASE_URL or SUPABASE_DB_URL in your environment variables.')
}

// For query purposes
export const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 })