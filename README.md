# Asana Operator

Convert natural language into Asana tasks using AI. Dictate or type a sentence like "create a task in the Onboarding Ops project for Janelle to update the SOP for client upgrades" and watch it automatically create the task in Asana.

## Features

- **Natural Language Processing**: Uses Google Gemini to understand task intent
- **Smart Name Resolution**: Automatically matches project and person names to Asana IDs
- **Disambiguation**: Presents options when multiple matches are found
- **Idempotency**: Prevents duplicate task creation within 10-minute windows
- **Mobile-Ready**: PWA-capable for iOS home screen installation
- **iOS Shortcuts**: Integrate with Siri for voice-activated task creation

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: Supabase (Postgres) with Drizzle ORM
- **AI**: Google Gemini via Vercel AI SDK
- **API**: Asana REST API
- **Hosting**: Vercel

## Quick Start

1. **Clone and Install**
```bash
git clone https://github.com/Atiwari330/asana_operator.git
cd asana-operator
npm install
```

2. **Configure Environment**
```bash
cp env/example.env .env.local
# Edit .env.local with your API keys
```

3. **Setup Database**
```bash
npm run drizzle:generate
npm run drizzle:migrate
```

4. **Sync Asana Data**
```bash
npm run sync:asana
```

5. **Start Development**
```bash
npm run dev
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=      # TODO: Add your Supabase URL
SUPABASE_SERVICE_ROLE_KEY=     # TODO: Add your service role key
DATABASE_URL=                   # TODO: Add your database URL

# Asana
ASANA_PAT=                      # TODO: Add your Personal Access Token

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=  # TODO: Add your Gemini API key

# App Security
INGEST_BEARER_TOKEN=            # TODO: Create a secret token
```

## API Usage

### Create Task

```bash
curl -X POST https://your-domain/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Create a task in Marketing for Sarah to design the Q4 campaign"
  }'
```

### Response Examples

**Success:**
```json
{
  "ok": true,
  "task_id": "1234567890",
  "task_url": "https://app.asana.com/0/project/task",
  "project_name": "Marketing",
  "assignee_name": "Sarah Chen",
  "title": "Design the Q4 campaign"
}
```

**Needs Confirmation:**
```json
{
  "ok": false,
  "needs_confirmation": true,
  "options": {
    "assignee": [
      {"id": "123", "name": "Sarah Chen", "email": "sarah@company.com"},
      {"id": "456", "name": "Sarah Johnson", "email": "sarahj@company.com"}
    ]
  }
}
```

## iOS Shortcut Setup

1. Open Shortcuts app
2. Create new shortcut
3. Add "Dictate Text" action
4. Add "Get Contents of URL" action with:
   - URL: `https://your-app.vercel.app/api/ingest`
   - Method: POST
   - Headers: Authorization Bearer token
   - Body: `{"text": "[Dictated Text]"}`
5. Add "Show Result" or "Speak" action

## Project Structure

```
/app              # Next.js app router pages
  /api/ingest     # Main API endpoint
/lib              # Core business logic
  /ai             # Gemini integration
  /asana          # Asana API client
  /db             # Database schema and connection
  /resolver       # Name-to-ID resolution
/scripts          # CLI utilities
  syncAsanaMeta   # Sync script for metadata
/docs             # Documentation
```

## Documentation

See the `/docs` folder for detailed documentation:
- [README.md](docs/README.md) - Development guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [PROMPTS.md](docs/PROMPTS.md) - AI configuration

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run sync:asana` - Sync Asana metadata
- `npm run drizzle:studio` - Open database GUI

## License

Private - For internal use only

## Support

For issues or questions, please contact the development team.