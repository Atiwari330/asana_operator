# Asana Operator

A production-ready MVP that converts natural language into Asana tasks using Google Gemini AI, with intelligent name resolution and deterministic task creation.

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Asana account with Personal Access Token
- Google Gemini API key

### 2. Environment Setup

Copy the environment template and fill in your credentials:

```bash
cp env/example.env .env.local
```

Required environment variables:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_supabase_db_url

# Asana
ASANA_PAT=your_asana_personal_access_token

# LLM
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# App
INGEST_BEARER_TOKEN=your_secret_bearer_token
```

### 3. Database Setup

Generate and run database migrations:

```bash
npm run drizzle:generate
npm run drizzle:migrate
```

### 4. Sync Asana Metadata

Populate your database with Asana projects and users:

```bash
npm run sync:asana
```

This should be run:
- On initial setup
- Periodically (via cron) to keep metadata fresh
- When new projects/users are added to Asana

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Data Flow

1. **User Input** → Natural language text (typed or dictated)
2. **LLM Parsing** → Gemini extracts structured intent
3. **Name Resolution** → Match human names to Asana IDs via cached metadata
4. **Task Creation** → Deterministic creation in Asana
5. **Confirmation** → Return task link and details

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter

# Database
npm run drizzle:generate  # Generate migrations
npm run drizzle:migrate   # Run migrations
npm run drizzle:studio    # Open Drizzle Studio

# Sync
npm run sync:asana   # Sync Asana metadata
```

## iOS Shortcut Integration

Create an iOS Shortcut with these steps:

1. **Text** → "Dictate Text"
2. **Get Contents of URL**:
   - URL: `https://your-domain.vercel.app/api/ingest`
   - Method: POST
   - Headers: 
     - `Authorization: Bearer YOUR_INGEST_BEARER_TOKEN`
     - `Content-Type: application/json`
   - Body: `{"text": "[Dictated Text]"}`
3. **Show Result** or **Speak** the response

## Adding Documentation

Place additional markdown documentation in the `/docs` folder:
- `GEMINI.md` - Gemini configuration and usage
- `VERCEL_AI_SDK.md` - AI SDK patterns and best practices
- `SUPABASE.md` - Database setup and queries
- Any other relevant documentation

The codebase is configured to reference documentation from this folder.

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correct
- Check Supabase project is active
- Verify network connectivity

### Asana Sync Failures
- Verify `ASANA_PAT` has correct permissions
- Check workspace access
- Review API rate limits

### LLM Parsing Issues
- Check `GOOGLE_GENERATIVE_AI_API_KEY` is valid
- Review extraction schema in `/lib/ai/schema.ts`
- Examine few-shot examples in `/lib/ai/prompt.ts`

### Name Resolution Failures
- Run `npm run sync:asana` to refresh metadata
- Check normalization logic in `/lib/resolver/normalize.ts`
- Verify fuzzy matching threshold in `/lib/resolver/match.ts`