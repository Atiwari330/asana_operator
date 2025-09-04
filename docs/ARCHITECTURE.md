# Architecture

## System Overview

```
User Input (Text/Voice)
         ↓
    [Frontend UI]
         ↓
  POST /api/ingest
         ↓
    [Auth Check]
         ↓
  [Gemini AI Parser]
         ↓
  [Name Resolver]
         ↓
  [Idempotency Check]
         ↓
   [Asana API]
         ↓
  Success Response
```

## Component Architecture

### Frontend Layer
- **Next.js App Router** - React-based UI
- **Tailwind CSS** - Styling
- **PWA Manifest** - Mobile installation

### API Layer
- **Route Handler** (`/api/ingest`) - Main orchestration endpoint
- **Bearer Token Auth** - Simple shared secret authentication
- **Request/Response Validation** - Zod schemas

### AI Integration
- **Google Gemini** - Intent extraction via Vercel AI SDK
- **Structured Output** - Zod schema validation
- **Few-shot Learning** - Example-based prompting
- **Retry Logic** - Handle non-conforming responses

### Data Layer
- **Supabase Postgres** - Metadata cache storage
- **Drizzle ORM** - Type-safe database queries
- **Tables**:
  - `projects` - Asana project metadata
  - `users` - Asana user metadata
  - `sections` - Project sections
  - `recent_ops` - Idempotency tracking

### Resolution Layer
- **Normalization** - String standardization
- **Exact Matching** - Primary resolution method
- **Fuzzy Matching** - Fuse.js for partial matches
- **Ambiguity Handling** - Return candidates for confirmation

### Integration Layer
- **Asana Client** - REST API wrapper
- **Task Creation** - Projects, assignees, sections
- **Metadata Sync** - Periodic cache updates

## Request Flow

1. **Input Reception**
   - User submits text via UI or API
   - Bearer token validation

2. **Intent Extraction**
   - Send to Gemini with schema
   - Extract: intent, project, assignee, title, etc.

3. **Name Resolution**
   - Query metadata cache
   - Exact match → Use ID
   - Multiple matches → Request confirmation
   - No match → Return error

4. **Task Creation**
   - Check idempotency (10-minute window)
   - Call Asana API
   - Record operation hash

5. **Response**
   - Success: Return task URL
   - Needs confirmation: Return options
   - Error: Return error message

## Security Considerations

- Server-only environment variables
- No client-side API keys
- Bearer token for API authentication
- Service role keys isolated to server

## Performance Optimizations

- Metadata caching reduces Asana API calls
- Database indexes on normalized names
- Fuzzy search with configurable thresholds
- Idempotency prevents duplicate tasks

## Deployment Architecture

```
Vercel (Frontend + API)
         ↓
    Supabase
   (Postgres DB)
         ↓
  External APIs
  (Asana, Gemini)
```

## Scaling Considerations

- Stateless API handlers
- Database connection pooling
- Async metadata refresh
- Rate limiting on external APIs