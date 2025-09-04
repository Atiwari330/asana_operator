# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asana Operator is a Next.js application that converts natural language into Asana tasks using Google Gemini AI. It features smart name resolution, disambiguation handling, and idempotency checks to prevent duplicate tasks.

## Essential Commands

### Development
```bash
npm run dev          # Start Next.js development server (port 3000)
npm run build        # Build for production
npm run lint         # Run Next.js linting
```

### Database Operations
```bash
npm run drizzle:generate  # Generate migrations from schema changes
npm run drizzle:migrate   # Apply migrations to database
npm run drizzle:studio    # Open Drizzle Studio GUI for database
```

### Data Synchronization
```bash
npm run sync:asana        # Sync Asana metadata (projects, users, sections)
npm run sync:opus         # Sync Opus project enrichment data
npm run discover:projects # Discover and analyze Asana projects
```

## Architecture

### Core Flow
1. **API Endpoint** (`/api/ingest`): Receives natural language text
2. **AI Processing**: Gemini extracts intent (project, assignee, task details)
3. **Name Resolution**: Matches names to Asana IDs using cached metadata
4. **Task Creation**: Creates task in Asana with idempotency checks

### Key Directories
- `/app/api/` - API route handlers (ingest, ingest-opus)
- `/lib/ai/` - Gemini AI integration and prompting
- `/lib/asana/` - Asana API client wrapper
- `/lib/db/` - Database schema and Drizzle ORM setup
- `/lib/resolver/` - Name-to-ID resolution logic
- `/scripts/` - CLI utilities for syncing and discovery

### Database Schema (Drizzle ORM)
- **projects**: Asana project metadata with AI context
- **users**: Asana user information
- **sections**: Project sections
- **recent_ops**: Idempotency tracking (10-minute window)

## Code Patterns

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Target: ES2015 with modern lib features

### API Response Pattern
All API routes return typed responses:
- Success: `{ ok: true, task_id, task_url, ... }`
- Needs Confirmation: `{ ok: false, needs_confirmation: true, options: {...} }`
- Error: `{ ok: false, error: string }`

### Authentication
- Bearer token authentication for API endpoints
- Token stored in `INGEST_BEARER_TOKEN` environment variable

### Error Handling
- Zod schema validation for requests
- Structured error responses
- Retry logic for AI responses

## Testing

Test the API endpoint:
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Create a task in Marketing for Sarah"}'
```

## Environment Setup

Required environment variables (.env.local):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Database access
- `DATABASE_URL` - Postgres connection string
- `ASANA_PAT` - Asana Personal Access Token
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key
- `INGEST_BEARER_TOKEN` - API authentication token

## Development Workflow

1. **Initial Setup**: Run database migrations and sync Asana metadata
2. **Feature Development**: Use TypeScript strict mode, follow existing patterns
3. **API Changes**: Update Zod schemas and response types
4. **Database Changes**: Modify schema.ts, generate and run migrations
5. **Testing**: Test API endpoints with curl or the frontend UI